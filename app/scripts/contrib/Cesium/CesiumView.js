

define(['backbone.marionette',
		'communicator',
		'app',
		'models/MapModel',
		'globals',
		'papaparse',
		'hbs!tmpl/wps_eval_model', // replaces wps_load_shc
		'hbs!tmpl/wps_eval_model_diff', // replaces wps_calc_diff
		'hbs!tmpl/wps_get_field_lines',
		'hbs!tmpl/wps_retrieve_swarm_features',
		'cesium/Cesium',
		'drawhelper',
		'FileSaver',
		'plotty'
	],
	function(Marionette, Communicator, App, MapModel, globals, Papa, Tmpl_eval_model, Tmpl_eval_model_diff, Tmpl_get_field_lines, Tmpl_retrive_swarm_features) {

		var CesiumView = Marionette.View.extend({

			model: new MapModel.MapModel(),

			initialize: function(options) {
				this.map = undefined;
				this.isClosed = true;
				this.tileManager = options.tileManager;
				this.selectionType = null;
				this.overlay_index = 99;
				this.diffimage_index = this.overlay_index-10;
				this.diff_overlay = null;
				this.overlay_layers = [];
				this.overlay_offset = 100;
				this.camera_is_moving = false;
				this.camera_last_position = null;
				this.billboards = null;
				this.activeFL = [];
				this.features_collection = {};
				this.FL_collection = {};
				this.bboxsel = null;
				this.extentPrimitive = null;
				this.activeModels = [];
				this.activeCollections = [];
				this.difference_image = null;
				this.data_filters = {};
                this.colorscales = {};

				this.begin_time = null;
				this.end_time = null;

				this.plot = null;
				$(window).resize(function() {
					if (this.map) {
						this.onResize();
					}
				}.bind(this));


				plotty.addColorScale("redblue", ["#ff0000", "#0000ff"], [0, 1]);
				plotty.addColorScale("coolwarm", ["#ff0000", "#ffffff", "#0000ff"], [0, 0.5, 1]);
				plotty.addColorScale("custom1", ["#400040","#3b004d","#36005b","#320068","#2d0076","#290084","#240091","#20009f","#1b00ad","#1600ba","#1200c8","#0d00d6","#0900e3","#0400f1","#0000ff","#0217ff","#042eff","#0645ff","#095cff","#0b73ff","#0d8bff","#10a2ff","#12b9ff","#14d0ff","#17e7ff","#19ffff","#3fffff","#66ffff","#8cffff","#b2ffff","#d8ffff","#ffffff","#ffffd4","#ffffaa","#ffff7f","#ffff54","#ffff2a","#ffff00","#ffed00","#ffdd00","#ffcc00","#ffba00","#ffaa00","#ff9900","#ff8700","#ff7700","#ff6600","#ff5400","#ff4400","#ff3300","#ff2100","#ff1100","#ff0000","#ff0017","#ff002e","#ff0045","#ff005c","#ff0073","#ff008b","#ff00a2","#ff00b9","#ff00d0","#ff00e7","#ff00ff"], [0.0,0.01587301587,0.03174603174,0.04761904761,0.06349206348,0.07936507935,0.09523809522,0.11111111109,0.12698412696,0.14285714283,0.15873015870,0.17460317457,0.19047619044,0.20634920631,0.22222222218,0.23809523805,0.25396825392,0.26984126979,0.28571428566,0.30158730153,0.31746031740,0.33333333327,0.34920634914,0.36507936501,0.38095238088,0.39682539675,0.41269841262,0.42857142849,0.44444444436,0.46031746023,0.47619047610,0.49206349197,0.50793650784,0.52380952371,0.53968253958,0.55555555545,0.57142857132,0.58730158719,0.60317460306,0.61904761893,0.63492063480,0.65079365067,0.66666666654,0.68253968241,0.69841269828,0.71428571415,0.73015873002,0.74603174589,0.76190476176,0.77777777763,0.79365079350,0.80952380937,0.82539682524,0.84126984111,0.85714285698,0.87301587285,0.88888888872,0.90476190459,0.92063492046,0.93650793633,0.95238095220,0.96825396807,0.98412698394,1]);
				plotty.addColorScale("custom2", ["#000000", "#030aff", "#204aff", "#3c8aff", "#77c4ff", "#f0ffff", "#f0ffff", "#f2ff7f", "#ffff00", "#ff831e", "#ff083d", "#ff00ff"], [0, 0.0000000001, 0.1, 0.2, 0.3333, 0.4666, 0.5333, 0.6666, 0.8, 0.9, 0.999999999999, 1]);
				plotty.addColorScale("blackwhite", ["#000000", "#ffffff"], [0, 1]);

				this.connectDataEvents();

			},

			createMap: function() {

				// Problem arose in some browsers where aspect ratio was kept not adapting 
				// to height; Added height style attribute to 100% to solve problem
				this.$el.attr("style","height:100%;");

				// TODO: We dont use bing maps layer, but it still reports use of default key in console.
				// For now we just set it to something else just in case.
				Cesium.BingMapsApi.defaultKey = "NOTHING";

				Cesium.Camera.DEFAULT_VIEW_RECTANGLE = Cesium.Rectangle.fromDegrees(0.0, -10.0, 30.0, 55.0);

				Cesium.WebMapServiceImageryProvider.prototype.updateProperties = function(property, value) {

			        property = "&"+property+"=";
			        value = ""+value;
			        var i = _.indexOf(this._tileProvider._urlParts, property);
			        if (i>=0){
			        	this._tileProvider._urlParts[i+1] = value;
			        }else{
			        	this._tileProvider._urlParts.push(property);
			        	this._tileProvider._urlParts.push(encodeURIComponent(value));
			        }
			    };

				this.$el.append("<div id='cesium_attribution'></div>");
				this.$el.append("<div id='cesium_custom_attribution'></div>");
				$("#cesium_custom_attribution").append("<div style='float:left'><a href='http://cesiumjs.org' target='_blank'>Cesium</a>"+
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>");

				this.$el.append('<div type="button" class="btn btn-success darkbutton" id="cesium_save">Save as Image</div>');
				this.$el.append('<div type="button" class="btn btn-success darkbutton"  id="bb_selection">Select Area</div>');
				
				var layer;
				var name = "";

				this.colors = globals.objects.get("color");

				if (this.begin_time == null || this.end_time == null){
					var sel_time = Communicator.reqres.request('get:time');
					this.begin_time = sel_time.start;
					this.end_time = sel_time.end;
				}

				globals.baseLayers.each(function(baselayer) {
					if (baselayer.get("visible")){
						name = baselayer.get("name");
						layer = this.createLayer(baselayer);
					}
				}, this);

				var clock = new Cesium.Clock({
				   startTime : Cesium.JulianDate.fromIso8601("2014-01-01"),
				   currentTime : Cesium.JulianDate.fromIso8601("2014-01-02"),
				   stopTime : Cesium.JulianDate.fromIso8601("2014-01-03"),
				   clockRange : Cesium.ClockRange.LOOP_STOP,
				   clockStep : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER,
				   canAnimate: false,
				   shouldAnimate: false
				});

				if (layer){
					this.map = new Cesium.Viewer(this.el,
					{
						timeline: false,
						fullscreenButton: false,
						baseLayerPicker: false,
						homeButton: false,
						infoBox: false,
						navigationHelpButton: false,
						navigationInstructionsInitiallyVisible: false,
						animation: false,
						imageryProvider: layer,
						terrainProvider : new Cesium.CesiumTerrainProvider({
					        url : '//tiles.maps.eox.at/dem'
					    }),
						creditContainer: "cesium_attribution",
						contextOptions: {webgl: {preserveDrawingBuffer: true}},
						clock: clock
					});
				}

				var mm = globals.objects.get('mapmodel');

				this.navigationhelp = new Cesium.NavigationHelpButton({
					container: $(".cesium-viewer-toolbar")[0]
				});

			    var canvas = this.map.canvas;

			    this.map.scene.skyBox.show = mm.get('skyBox');
			    this.map.scene.sun.show = mm.get('sun');
			    this.map.scene.moon.show = mm.get('moon');
			    this.map.scene.skyAtmosphere.show = mm.get('skyAtmosphere');
			    this.map.scene.backgroundColor = new Cesium.Color.fromCssColorString(mm.get('backgroundColor'));

			    // TODO: Removes fog for now as it is not very good at this point
			    if(this.map.scene.hasOwnProperty('fog')){
			      this.map.scene.fog.enabled = false;  
			    }

			    // Remove gazetteer field
			    $('.cesium-viewer-geocoderContainer').remove();

			    // Show Wireframe
			    //this.map.scene.globe._surface._tileProvider._debug.wireframe = true;
			    

				//this.map.scene.fxaaOrderIndependentTranslucency = false;


				this.billboards = this.map.scene.primitives.add(new Cesium.BillboardCollection());

				this.drawhelper = new DrawHelper(this.map.cesiumWidget);
				// It seems that if handlers are active directly there are some
				// object deleted issues when the draw helper tries to pick elements
				// in the scene; Setting handlers muted in the beginning seems to
				// solve the issue.
				this.drawhelper._handlersMuted = true;

				this.camera_last_position = {};
				this.camera_last_position.x = this.map.scene.camera.position.x;
				this.camera_last_position.y = this.map.scene.camera.position.y;
				this.camera_last_position.z = this.map.scene.camera.position.z;

				// Extend far clipping for fieldlines

				this.map.scene.camera.frustum.far = this.map.scene.camera.frustum.far * 15

				this.map.clock.onTick.addEventListener(this.handleTick.bind(this));
				
				globals.baseLayers.each(function(baselayer) {
					if (baselayer.get("name") == name){
						var ces_layer = this.map.scene.imageryLayers.get(0);
						ces_layer.show = true;
				 		baselayer.set("ces_layer", ces_layer);
					}
				}, this);

				
				//Go through all defined baselayer and add them to the map
				globals.baseLayers.each(function(baselayer) {
					if (baselayer.get("name")!=name){
						var layer = this.createLayer(baselayer);
						if (layer) {
							var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
							imagerylayer.show = baselayer.get("visible");
							baselayer.set("ces_layer", imagerylayer);
						}
					}
				}, this);

				
				// Go through all products and add them to the map
				_.each(globals.products.last(globals.products.length).reverse(), function(product){
					var layer = this.createLayer(product);
					if (layer) {
						var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
						product.set("ces_layer", imagerylayer);
						imagerylayer.show = product.get("visible");
						imagerylayer.alpha = product.get("opacity");


						// If product protocol is not WMS or WMTS they are shown differently so dont activate "dummy" layers
						if(product.get("views")[0].protocol != "WMS" && product.get("views")[0].protocol != "WMTS")
							imagerylayer.show = false;

						// If the product is set to visible trigger its activation event which handles all protocols
						if(product.get("visible")){
							var options = { name: product.get('name'), isBaseLayer: false, visible: true };
							// TODO: products made active from config are not working correctly
							// The timeslider view is initialized afterwards and the product is not displayed

							//Communicator.mediator.trigger('timeslider:add:layer', options);
						}
					}
				}, this);

				// Go through all overlays and add them to the map
                globals.overlays.each(function(overlay){
                	var layer = this.createLayer(overlay);
					if (layer) {
						var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
						//var index = this.map.scene.imageryLayers.indexOf(imagerylayer);
						//index += this.overlay_offset;
						this.map.scene.imageryLayers.remove(imagerylayer, false);
						imagerylayer.show = overlay.get("visible");
						this.map.scene.imageryLayers.add(imagerylayer);
						overlay.set("ces_layer", imagerylayer);
					}
                }, this);

                

			},

			onShow: function() {
				if (!this.map) {
					this.createMap();
				}

				if(this.navigationhelp){
					this.navigationhelp.destroy();
					this.navigationhelp = new Cesium.NavigationHelpButton({
						container: $(".cesium-viewer-toolbar")[0]
					});
				} 

				this.plot = new plotty.plot({});

				this.plot.setClamp(true, true);

				this.isClosed = false;
				$("#cesium_save").on("click", this.onSaveImage.bind(this));

				
				this.connectDataEvents();

				// Redraw to make sure we are at current selection
				this.createDataFeatures(globals.swarm.get('data'), 'pointcollection', 'band');

				$('#bb_selection').unbind('click');
				$('#bb_selection').click(function(){
					if($('#bb_selection').text() == "Select Area"){
						$('#bb_selection').html('Deactivate');
						Communicator.mediator.trigger('selection:activated',{
							id:'bboxSelection',
							active:true,
							selectionType:'single'
						});
						
					}else if($('#bb_selection').text() == "Deactivate"){
						$('#bb_selection').html('Select Area');
						Communicator.mediator.trigger('selection:activated', {
							id:'bboxSelection',
							active:false,
							selectionType:'single'
						});
					}else if($('#bb_selection').text() == "Clear Selection"){
						$('#bb_selection').html('Select Area');
						Communicator.mediator.trigger("selection:changed", null);
					}
				});


				//this.onResize();
				return this;
			},

			connectDataEvents: function(){
				//globals.swarm.off('change:data');
				globals.swarm.on('change:data', function(model, data) {
					var that = this;
					if (data.length && data.length>0){
						that.createDataFeatures(data, 'pointcollection', 'band');
					}else{
						for (var i = 0; i < this.activeCollections.length; i++) {
		            		if(this.features_collection.hasOwnProperty(this.activeCollections[i])){
			            		this.map.scene.primitives.remove(this.features_collection[this.activeCollections[i]]);
			            		delete this.features_collection[this.activeCollections[i]];
			            	}
		            	}
		            	this.activeCollections = [];
					}
				}, this);

				//globals.swarm.off('change:filters');
				globals.swarm.on('change:filters', function(model, filters) {
					this.createDataFeatures(globals.swarm.get('data'), 'pointcollection', 'band');
				}, this);
			},

			onResize: function() {
				if(this.map._sceneModePicker){
					var container = this.map._sceneModePicker.container;
					var scene = this.map._sceneModePicker.viewModel._scene;
					this.map._sceneModePicker.destroy();
					var modepicker = new Cesium.SceneModePicker(container, scene);
					this.map._sceneModePicker = modepicker;
				}
			},

			//method to create layer depending on protocol
            //setting possible description attributes
            createLayer: function (layerdesc) {

                var return_layer = null;
                var views = layerdesc.get('views');
                var view = undefined;

                if( typeof(views) == 'undefined'){
	                view = layerdesc.get('view');
	            } else {
	            	
	            	if (views.length == 1){
	                	view = views[0];
	                } else {
                		// FIXXME: this whole logic has to be replaced by a more robust method, i.e. a viewer
                		// defines, which protocols to support and get's the corresponding views from the
                		// config then.

                		// For now: prefer WMTS over WMS, if available:
                		var wmts = _.find(views, function(view){ return view.protocol == "WMTS"; });
                		if(wmts){
                			view = wmts;
                		} else {
                			var wms = _.find(views, function(view){ return view.protocol == "WMS"; });
                			if (wms) {
	                			view = wms;
	                		} else {
                				// No supported protocol defined in config.json!
                				return null;
	                		}
                		}
	                }
	            }

	            // Manage custom attribution element (add attribution for active layers)
	            if(layerdesc.get("visible")){
	            	if(view.attribution){
	            		$("#cesium_custom_attribution").append(
		            		"<div id='" + layerdesc.get("name") + "' style='float: left;'>"+
		            		view.attribution +
		            		"</div>");
	            	}
	            }
	            
                switch(view.protocol){
                    case "WMTS":
                    	return_layer = new Cesium.WebMapTileServiceImageryProvider({
						    url : view.urls[0],
						    layer : view.id,
						    style : view.style,
						    format : view.format,
						    tileMatrixSetID : view.matrixSet,
						    maximumLevel: 12,
						    tilingScheme: new Cesium.GeographicTilingScheme({numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1}),
						    credit : new Cesium.Credit(view.attribution),
						    show: layerdesc.get("visible")
						});
                    break;

                    case "WMS":
                    	params = $.extend({
                    		/*transparent: 'true'*/
                    	},  Cesium.WebMapServiceImageryProvider.DefaultParameters);

                    	// Check if layer has additional parameters configured
                    	var additional_parameters = {};
                    	var styles;
                    	if(layerdesc.get("parameters")){
                    		var options = layerdesc.get("parameters");
                    		var keys = _.keys(options);
                    		_.each(keys, function(key){
								if(options[key].selected){
									//additional_parameters.dim_bands = key;
									additional_parameters.dim_range = options[key].range[0]+","+options[key].range[1];
									styles = options[key].colorscale;
								}
							});
                    	}

                    	additional_parameters['styles'] = styles; 

                    	if(layerdesc.get("timeSlider")){
                    		var string = getISODateTimeString(this.begin_time) + "/"+ getISODateTimeString(this.end_time);
                    		additional_parameters['time'] = string;
                    	}

                    	if(layerdesc.get("height")){
	                    	additional_parameters['elevation'] = layerdesc.get("height");
	                    }

                    	params.format = layerdesc.get("views")[0].format;
                    	return_layer = new Cesium.WebMapServiceImageryProvider({
						    url: view.urls[0],
						    layers : view.id,
						    tileWidth: layerdesc.get('tileSize'),
						    tileHeight: layerdesc.get('tileSize'),
						    enablePickFeatures: false,
						    parameters: params
						});

						for (par in additional_parameters){
							return_layer.updateProperties(par, additional_parameters[par]);
						}

                    break;

					case "WPS":
						return_layer = new Cesium.SingleTileImageryProvider({
						    url: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
						});
					break;

                    default:
                    	// No supported view available
                    	// Return dummy Image provider to help with with sorting of layers 
                    	//return  new Cesium.WebMapServiceImageryProvider();
                    	return false;
                    break;

                };

                /*return_layer.events.register("loadstart", this, function() {
                  	Communicator.mediator.trigger("progress:change", true);
                });
                
                return_layer.events.register("loadend", this, function() {
                  	Communicator.mediator.trigger("progress:change", false);
                });*/
                return return_layer;
            },

			centerMap: function(data) {
				//this.map.setCenter(new OpenLayers.LonLat(data.x, data.y), data.l);

				this.model.set({
					'center': [data.x, data.y],
					'zoom': data.l
				});
			},

			onSortProducts: function(productLayers) {


				// Search for moved layer
				var layer_moved = null;
				var to_move = 0;
				globals.products.each(function(product) {
					var ces_layer = product.get("ces_layer");
                	if (ces_layer){
                		var product_index = (globals.products.length-1 - globals.products.indexOf(product)) + globals.baseLayers.length;
                		var ces_index = this.map.scene.imageryLayers.indexOf(ces_layer);
                		var cur_move = product_index - ces_index;
                		if (Math.abs(to_move)<Math.abs(cur_move)){
                			to_move = cur_move;
                			layer_moved = ces_layer;
                		}
                	}
				}, this);

				// Raise or Lower the layer depending on movement
				for(var i=0; i<Math.abs(to_move); ++i){
					if(to_move < 0)
						this.map.scene.imageryLayers.lower(layer_moved);
					else if(to_move>0)
						this.map.scene.imageryLayers.raise(layer_moved);
				}

				
				console.log("Map products sorted");
			},

			onUpdateOpacity: function(options) {
				globals.products.each(function(product) {
                	if(product.get("name")==options.model.get("name")){
                		var ces_layer = product.get("ces_layer");

                		if( _.has(this.features_collection, options.model.get("views")[0].id) ){
                			var fc = this.features_collection[options.model.get("views")[0].id];
                			if(fc.hasOwnProperty("geometryInstances")){
                				for (var i = fc._instanceIds.length - 1; i >= 0; i--) {
	  								var attributes = fc.getGeometryInstanceAttributes(fc._instanceIds[i]);
	  								var nc = attributes.color;
	  								nc[3] = Math.floor(options.value*255);
	        						attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(
	        							Cesium.Color.fromBytes(nc[0], nc[1], nc[2], nc[3])
	        						);
	                			};
                			}else{
                				for (var i = fc.length - 1; i >= 0; i--) {
	                				var b = fc.get(i);
	                				if(b.color){
		                				var c = b.color.clone();
		                				c.alpha = options.value;
		  								b.color = c;
		  							}else if(b.appearance){
		  								var c = b.appearance.material.uniforms.color.clone();
		                				c.alpha = options.value;
		  								b.appearance.material.uniforms.color = c;
		  							}
	                			};
                			}
                		}else if(ces_layer){
							ces_layer.alpha = options.value;
						}
					}
				}, this);
            },

            changeLayer: function(options) {
            	// Seems for some reason that a layer needs to be as shown at all times
            	// or cesium will throw an error, so first activate the new layer, then 
            	// deactivate the others
				if (options.isBaseLayer){
					
					globals.baseLayers.each(function(baselayer) {
						var ces_layer = baselayer.get("ces_layer");
						if (ces_layer) {
							if(baselayer.get("name")==options.name){
								ces_layer.show = true;
								// Manage custom attribution element (add attribution for active baselayer)
				            	if(baselayer.get("views")[0].attribution){
				            		$("#cesium_custom_attribution").append(
					            		"<div id='" + baselayer.get("name") + "' style='float: left;'>"+
					            		baselayer.get("views")[0].attribution +
					            		"</div>");
					            }
							}
						}
					}, this);

					globals.baseLayers.each(function(baselayer) {
						var ces_layer = baselayer.get("ces_layer");
						if (ces_layer) {
							if(baselayer.get("name")!=options.name){
								ces_layer.show = false;
								//Manage custom attribution (remove deactivated layers)
								$("#"+baselayer.get("name")).remove();
							}
						}
					}, this);

                } else {
                    globals.overlays.each(function(overlay) {
                    	if(overlay.get("name")==options.name){
                    		var ces_layer = overlay.get("ces_layer");
							ces_layer.show = options.visible;
							if(options.visible){
								// Manage custom attribution element (add attribution for active baselayer)
				            	if(overlay.get("view").attribution){
				            		$("#cesium_custom_attribution").append(
					            		"<div id='" + overlay.get("name") + "' style='float: left;'>"+
					            		overlay.get("view").attribution +
					            		"</div>");
					            }
							}else{
								//Manage custom attribution (remove deactivated layers)
								$("#"+overlay.get("name")).remove();
							}
						}
					}, this);

					globals.products.each(function(product) {
                    	if(product.get("name")==options.name){
                    		// TODO: This if method is only for testing and has to be reviewed
                    		if(product.get("views")[0].protocol == "CZML"){
                    			//this.checkLayerFeatures(product, options.visible);
                    			this.onShowColorscale(product.get("download").id, options.visible);
                    			product.set('visible', options.visible);
                    			this.createDataFeatures(globals.swarm.get('data'), 'pointcollection', 'band');

			        		}else if (product.get("views")[0].protocol == "WPS"){
                    			this.checkShc(product, options.visible);
								
                    		}else if (product.get("views")[0].protocol == "WMS" || product.get("views")[0].protocol == "WMTS" ){
                    			this.onShowColorscale(product.get("download").id, options.visible);
                    			var parameters = product.get("parameters");
                    			var coeff_range = product.get("coefficients_range");

                    			if (parameters){
                    				var band;
			            			var keys = _.keys(parameters);
									_.each(keys, function(key){
										if(parameters[key].selected)
											band = key;
									});
			            			var style = parameters[band].colorscale;
			            			var range = parameters[band].range;

									if (band == "Fieldlines"){
										if(options.visible){
			                    			this.activeFL.push(product.get("download").id);
			                    		}else{
			                    			if (this.activeFL.indexOf(product.get("download").id)!=-1){
		                						this.activeFL.splice(this.activeFL.indexOf(product.get("download").id), 1);
		                					}
			                    		}
			                    		this.checkFieldLines();
									}else{
										var ces_layer = product.get("ces_layer");
										if(band)
					                		ces_layer.imageryProvider.updateProperties("dim_bands", band);
					                	if(range)
					                		ces_layer.imageryProvider.updateProperties("dim_range", (range[0]+","+range[1]));
					                	if(style)
					                		ces_layer.imageryProvider.updateProperties("styles", style);
					                	if(coeff_range)
					                		ces_layer.imageryProvider.updateProperties("dim_coeff", (coeff_range[0]+","+coeff_range[1]));

										ces_layer.show = options.visible;
									}
                    			}else{
                    				var ces_layer = product.get("ces_layer");
									ces_layer.show = options.visible;
                    			}
                    			

	                    		
							}

							if(options.visible){
								// Manage custom attribution element (add attribution for active baselayer)
				            	if(product.get("views")[0].attribution){
				            		$("#cesium_custom_attribution").append(
					            		"<div id='" + product.get("name") + "' style='float: left;'>"+
					            		product.get("views")[0].attribution +
					            		"</div>");
					            }
							}else{
								//Manage custom attribution (remove deactivated layers)
								$("#"+product.get("name")).remove();
							}
						}
						if(product.get("model") && product.get("name") == options.name){
							if(options.visible){
								this.activeModels.push(product.get("name"));
								// Iterate over active Swarm products
								globals.products.each(function(product) {
									//if(product.get("satellite") == "Swarm")
										//this.checkLayerFeatures(product, product.get("visible"));
								},this);
							}else{
								if (this.activeModels.indexOf(product.get('name'))!=-1)
                					this.activeModels.splice(this.activeModels.indexOf(product.get('name')), 1);

                				if (this.activeModels.length != 2){
                					if(this.difference_image)	
										this.map.scene.imageryLayers.remove(this.difference_image);
									this.difference_image = null;

									if($("#colorlegend").is(":visible"))
										$("#colorlegend").hide();
                				}

							}

							// Compare models if two are selected
							if (this.activeModels.length == 2){

								/*var that = this;

								var model1 = _.find(globals.products.models, function(p){return p.get("name") == that.activeModels[0];});
								var model2 = _.find(globals.products.models, function(p){return p.get("name") == that.activeModels[1];});

								var url = model2.get("views")[0].urls[0];

								var models = [model1.get("views")[0].id, model2.get("views")[0].id];

								var shc = null;

								// Remove custom model with id shc if selected
								if (models.indexOf("shc")!=-1){
									shc = _.find(globals.products.models, function(p){return p.get("shc") != null;}).get("shc");
			    					models.splice(models.indexOf("shc"), 1);
			    				}

								var parameters = product.get("parameters");
	                			var band;

	                			var keys = _.keys(parameters);
								_.each(keys, function(key){
									if(parameters[key].selected)
										band = key;
								});
	                			var style = parameters[band].colorscale;
	                			var height = product.get("height");
	                			var uom = parameters[band].uom;

            					var imageURI;

								$.post(url, Tmpl_eval_model_diff({
									"model": models[0],
									"reference_model": models[1],
									//"variable": band,
									"begin_time": getISODateTimeString(this.begin_time),
									"end_time": getISODateTimeString(this.end_time),
									"elevation": height,
									"shc": shc,
									"height": 512,
									"width": 1024,
									"style": style,
								}), "xml")

									.done(function( data ) {

										// Remove previous and add colorlegend to cesium view
										$("#colorlegend").remove();
										$(".cesium-viewer").append('<div id="colorlegend"></div>');

										data = $.parseXML(data);
										if(that.difference_image)	
											that.map.scene.imageryLayers.remove(that.difference_image);

										var img64 = $(data.getElementsByTagName("ComplexData")).text();
									    imageURI = "data:image/gif;base64,"+img64;
									    var prov = new Cesium.SingleTileImageryProvider({url: imageURI});
										that.difference_image = that.map.scene.imageryLayers.addImageryProvider(prov);
										that.map.scene.imageryLayers.lower(that.difference_image);

										var style = $(data.getElementsByTagName("LiteralData")).text().split(",");


										
										var margin = 20;
										var width = $("#colorlegend").width();
										var scalewidth =  width - margin *2;
										console.log(width);

										
										$("#colorlegend").append(
											'<div class="'+style[0]+'" style="width:'+scalewidth+'px; height:20px; margin-left:'+margin+'px"></div>'
										);

										var svgContainer = d3.select("#colorlegend").append("svg")
											.attr("width", width)
											.attr("height", 60);


										var axisScale = d3.scale.linear();

										axisScale.domain([parseFloat(style[1]), parseFloat(style[2])]);
										axisScale.range([0, scalewidth]);

										var xAxis = d3.svg.axis()
											.scale(axisScale);


										xAxis.tickValues( axisScale.ticks( 5 ).concat( axisScale.domain() ) );
										xAxis.tickFormat(d3.format('.02f'));


									    svgContainer.append("g")
									        .attr("class", "x axis")
									        .attr("transform", "translate(" + [margin, 3]+")")
									        .call(xAxis)
									        .append("text")
												.style("text-anchor", "middle")
												.style("font-size", "1.1em")
												.attr("transform", "translate(" + [scalewidth/2, 40]+")")
												.text(uom);

										$("#colorlegend").show();

									});*/
							}

						}
					}, this);
                }



            },


            checkShc: function(product, visible){
            	if(visible){

    				if(product.get('shc') != null){

    					var parameters = product.get("parameters");
            			var band;
            			var keys = _.keys(parameters);
						_.each(keys, function(key){
							if(parameters[key].selected)
								band = key;
						});
            			var style = parameters[band].colorscale;
            			var range = parameters[band].range;
    					var imageURI;
						var that = this;
						var imagelayer;

						var ces_layer = product.get("ces_layer");
						var index = this.map.scene.imageryLayers.indexOf(ces_layer);
						
						var url = product.get("views")[0].urls[0];

						var coefficients_range = product.get("coefficients_range");

						$.post(url, Tmpl_eval_model({
							"model": "Custom_Model",
							"variable": band,
							"begin_time": getISODateTimeString(this.begin_time),
							"end_time": getISODateTimeString(this.end_time),
							"elevation": product.get("height"),
							"coeff_min": coefficients_range[0],
							"coeff_max": coefficients_range[1],
							"shc": product.get('shc'),
							"height": 512,
							"width": 1024,
							"style": style,
							"range_min": range[0],
							"range_max": range[1],
						}))

							.done(function( data ) {	
								that.map.scene.imageryLayers.remove(ces_layer);									
							    imageURI = "data:image/gif;base64,"+data;
							    var imagelayer = new Cesium.SingleTileImageryProvider({url: imageURI});
								ces_layer = that.map.scene.imageryLayers.addImageryProvider(imagelayer, index);
								product.set("ces_layer", ces_layer);
								// TODO: Hack to position layer at correct index, adding imagery provider  
								// with index does not seem to be working
								var ces_index = that.map.scene.imageryLayers.indexOf(ces_layer);
								var to_move = index - ces_index;
								for(var i=0; i<Math.abs(to_move); ++i){
									if(to_move < 0)
										that.map.scene.imageryLayers.lower(ces_layer);
									else if(to_move>0)
										that.map.scene.imageryLayers.raise(ces_layer);
								}
							});
    				}
    			}else{
    				var ces_layer = product.get("ces_layer");
					ces_layer.show = visible;
    			}
            },


            createDataFeatures: function (results, identifier, band, alpha){

            	// The feature collections are removed directly when a change happens
            	// because of the asynchronous behavior it can happen that a collection
            	// is added between removing it and adding another one so here we make sure
            	// it is empty before overwriting it, which would lead to a not referenced
            	// collection which is no longer deleted.
            	// I remove it before the response because a direct feedback to the user is important
            	// There is probably a cleaner way to do this
            	for (var i = 0; i < this.activeCollections.length; i++) {
            		
            		if(this.features_collection.hasOwnProperty(this.activeCollections[i])){
	            		this.map.scene.primitives.remove(this.features_collection[this.activeCollections[i]]);
	            		delete this.features_collection[this.activeCollections[i]];
	            	}
            	}
            	this.activeCollections = [];
            	

            	var settings = {};
            	var cur_product = null;

            	globals.products.each(function(product) {
            		if(product.get('visible')){
            			cur_product = product;
            			var params = product.get('parameters')
            			for (k in params){
            				if(params[k].selected){
            					settings[product.get('views')[0].id] = params[k];
            					settings[product.get('views')[0].id]['band'] = k;
            					settings[product.get('views')[0].id]['alpha'] = Math.floor(product.get('opacity')*255);
            					settings[product.get('views')[0].id]['outlines'] = product.get('outlines');
            					settings[product.get('views')[0].id]['outline_color'] = product.get('color');
            				}
            			}
            		}
            	});

            	

            	if (cur_product){

            		var that = this;

	            	var collections = _.uniq(results, function(row) { return row.id; }).map(function(obj){
	            		that.activeCollections.push(obj.id);
	            		if (_.find(SCALAR_PARAM, function(par){return settings[obj.id].band == par;})) {
	            			that.features_collection[obj.id] = new Cesium.PointPrimitiveCollection();

	            			if(!that.map.scene.context._gl.getExtension('EXT_frag_depth')){
	            				that.features_collection[obj.id]._rs = Cesium.RenderState.fromCache({
		  						    depthTest : {
		  						        enabled : true,
		  						        func : Cesium.DepthFunction.LESS
		  						    },
		  						    depthMask : false,
		  						    blending : Cesium.BlendingState.ALPHA_BLEND
		  						});
	            			}
	            		}else if (_.find(VECTOR_PARAM, function(par){return settings[obj.id].band == par;})) {
	            			that.features_collection[obj.id] = new Cesium.Primitive({
							  	geometryInstances : [],
							  	appearance : new Cesium.PerInstanceColorAppearance({
							    	flat : true,
							    	translucent : true
							  	}),
							  	releaseGeometryInstances: false
							});
	            		}
	            	});

					var max_rad = this.map.scene.globe.ellipsoid.maximumRadius;
					var scaltype = new Cesium.NearFarScalar(1.0e2, 4, 14.0e6, 0.8);
					var previous_collection = '';
					//var line_primitives = [];

					var linecnt = 0;
				    _.each(results, function(row){
				    	var show = true;
				    	var filters = globals.swarm.get('filters');
				    	
				    	if(filters){
				    		for (k in filters){
				    			if(row[k]<filters[k][0] || row[k]>filters[k][1]){
				    				show = false;
				    			}
				    		}
				    	}

				    	if (show){
				    		var alpha = settings[row.id].alpha;

				    		if (previous_collection != row.id){
				    			previous_collection = row.id
				    			this.plot.setColorScale(settings[row.id].colorscale);
				    			this.plot.setDomain(settings[row.id].range);
				    		}

				    		if (_.find(SCALAR_PARAM, function(par){return settings[row.id].band == par;})) {
				    			var height_offset = 0;
				    			if (settings[row.id].band == "Bubble_Probability"){
				    				height_offset = 100;
				    			}
					    		var color = this.plot.getColor(row[settings[row.id].band]);
					    		var options = {
							        position : new Cesium.Cartesian3.fromDegrees(row.Longitude, row.Latitude, row.Radius-max_rad+height_offset),
							        color : new Cesium.Color.fromBytes(color[0], color[1], color[2], alpha),
							        pixelSize : 8,
							        scaleByDistance : scaltype
							    };
							    if(settings[row.id].outlines){
							    	options['outlineWidth'] = 0.5;
							    	options['outlineColor'] = Cesium.Color.fromCssColorString(settings[row.id].outline_color);
							    }
					    		this.features_collection[row.id].add(options);

							}else if (_.find(VECTOR_PARAM, function(par){return settings[row.id].band == par;})) {
								var sb;
								switch (settings[row.id].band){
									case 'B_NEC': sb = ['B_E','B_N','B_C']; break;
									case 'v_SC': sb = ['v_SC_E','v_SC_N','v_SC_C']; break;
									case 'SIFM': sb = ['B_E_res_SIFM','B_N_res_SIFM','B_C_res_SIFM']; break;
									case 'IGRF12': sb = ['B_E_res_IGRF12','B_N_res_IGRF12','B_C_res_IGRF12']; break;
									case 'CHAOS-5-Combined': sb = [
										'B_E_res_CHAOS-5-Combined',
										'B_N_res_CHAOS-5-Combined',
										'B_C_res_CHAOS-5-Combined'];
									break;
									case 'Custom_Model': sb = ['B_E_res_Custom_Model','B_N_res_Custom_Model','B_C_res_Custom_Model']; break;
								}

								// Check if residuals are active!
								var v_len = Math.sqrt(Math.pow(row[sb[0]],2)+Math.pow(row[sb[1]],2)+Math.pow(row[sb[2]],2));
								var color = this.plot.getColor(v_len);
								var add_len = 10;
								var v_e = (row[sb[0]]/v_len)*add_len;
								var v_n = (row[sb[1]]/v_len)*add_len;
								var v_c = (row[sb[2]]/v_len)*add_len;
								this.features_collection[row.id].geometryInstances.push( 
								  	new Cesium.GeometryInstance({
								    	geometry : new Cesium.SimplePolylineGeometry({
								      		positions : Cesium.Cartesian3.fromDegreesArrayHeights([
								        		row.Longitude, row.Latitude, (row.Radius-max_rad),
								        		(row.Longitude+v_e), (row.Latitude+v_n), ((row.Radius-max_rad)+v_c*30000)
								      		]),
								      		followSurface: false
								    	}),
								    	id: "vec_line_"+linecnt,
								    	attributes : {
								      		color : Cesium.ColorGeometryInstanceAttribute.fromColor(
								      			new Cesium.Color.fromBytes(color[0], color[1], color[2], alpha)
								      		)
								    	}
								  	})
									
								);
								linecnt++;

							}
				    	}

					}, this);

					for (var i = 0; i < this.activeCollections.length; i++) {
						this.map.scene.primitives.add(this.features_collection[this.activeCollections[i]]);
					}
				}
			},

            onLayerOutlinesChanged: function(collection){
				this.createDataFeatures(globals.swarm.get('data'), 'pointcollection', 'band');
            },

            OnLayerParametersChanged: function(layer){
            	globals.products.each(function(product) {

            		if(product.get("name")==layer){

            			this.onShowColorscale(product.get("download").id);

            			var hexcolor = product.get("color");
	                		hexcolor = hexcolor.substring(1, hexcolor.length);
            			var parameters = product.get("parameters");
            			var band;
            			var keys = _.keys(parameters);
						_.each(keys, function(key){
							if(parameters[key].selected)
								band = key;
						});
            			var style = parameters[band].colorscale;
            			var range = parameters[band].range;
            			var outlines = product.get("outlines");
            			var height = product.get("height");

            			var coeff_range = product.get("coefficients_range");

						if(product.get("views")[0].protocol == "CZML"){
							this.createDataFeatures(globals.swarm.get('data'), 'pointcollection', 'band');

	                	}else if(product.get("views")[0].protocol == "WMS"){

	                		if (band == "Fieldlines" ){
								if(product.get("visible")){
									var ces_layer = product.get("ces_layer");
									ces_layer.show = false;
									this.map.scene.imageryLayers.remove(ces_layer, false);

									// When changing height or coefficient range and fieldlienes is selected
									// model would be added multiple times, need to check if model already 
									// marked as active and avoid adding it to list
									if (this.activeFL.indexOf(product.get("download").id)==-1)
	                    				this.activeFL.push(product.get("download").id);

	                    		}else{
	                    			if (this.activeFL.indexOf(product.get("download").id)!=-1){
                						this.activeFL.splice(this.activeFL.indexOf(product.get("download").id), 1);
                					}
	                    		}
	                    		this.checkFieldLines();
							}else{
								if (this.activeFL.indexOf(product.get("download").id)!=-1){
            						this.activeFL.splice(this.activeFL.indexOf(product.get("download").id), 1);
            					}
            					this.checkFieldLines();
								if(product.get("name")==layer){
				                	var ces_layer = product.get("ces_layer");

				                	if(product.get("visible")){
				                		ces_layer.show = true;
				                	}

				                	ces_layer.imageryProvider.updateProperties("dim_bands", band);

				                	ces_layer.imageryProvider.updateProperties("dim_range", (range[0]+","+range[1]));

				                	ces_layer.imageryProvider.updateProperties("elevation", height);

				                	if(style)
				                		ces_layer.imageryProvider.updateProperties("styles", style);
				                	if(coeff_range)
					        			ces_layer.imageryProvider.updateProperties("dim_coeff", (coeff_range[0]+","+coeff_range[1]));

				                	if (ces_layer.show){
					            		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
					            		this.map.scene.imageryLayers.remove(ces_layer, false);
					            		this.map.scene.imageryLayers.add(ces_layer, index);
					            	}
					            }
							}
				        }else if (product.get("views")[0].protocol == "WPS"){
							this.checkShc(product, product.get("visible"));
						}
				    }
                    
	            }, this);
            },


            onAnalyticsFilterChanged: function(filter){
            	console.log(filter);
            },


			onExportGeoJSON: function() {
				var geojsonstring = this.geojson.write(this.vectorLayer.features, true);

				var blob = new Blob([geojsonstring], {
					type: "text/plain;charset=utf-8"
				});
				saveAs(blob, "selection.geojson");
			},

			onGetGeoJSON: function () {
                return this.geojson.write(this.vectorLayer.features, true);
            },

            onGetMapExtent: function(){
            	return this.getMapExtent();
            },

            getMapExtent: function(){
            	var ellipsoid = this.map.scene.globe.ellipsoid;
            	var c2 = new Cesium.Cartesian2(0, 0);
			    var leftTop = this.map.scene.camera.pickEllipsoid(c2, ellipsoid);
			    c2 = new Cesium.Cartesian2(this.map.scene.canvas.width, this.map.scene.canvas.height);
			    var rightDown = this.map.scene.camera.pickEllipsoid(c2, ellipsoid);

			    if (leftTop != null && rightDown != null) { //ignore jslint
			        leftTop = ellipsoid.cartesianToCartographic(leftTop);
			        rightDown = ellipsoid.cartesianToCartographic(rightDown);
			        return {
			        	left: Cesium.Math.toDegrees(leftTop.longitude),
			        	bottom: Cesium.Math.toDegrees(rightDown.latitude),
			        	right: Cesium.Math.toDegrees(rightDown.longitude),
			        	top: Cesium.Math.toDegrees(leftTop.latitude)
			        };
			    } else {
			        //The sky is visible in 3D
			        // TODO: Not sure what the best way to calculate the extent is when sky/space is visible.
			        //       This method is just an approximation, not actually correct
			        // Try to get center point
			        var center = new Cesium.Cartesian2(this.map.scene.canvas.width/2, this.map.scene.canvas.height/2);
			        center = this.map.scene.camera.pickEllipsoid(center, ellipsoid);
			        if (center != null){
			        	center = ellipsoid.cartesianToCartographic(center);
			        	return {
				        	left: Cesium.Math.toDegrees(center.longitude) - 90,
				        	bottom: Cesium.Math.toDegrees(center.latitude) - 45,
				        	right: Cesium.Math.toDegrees(center.longitude) + 90,
				        	top: Cesium.Math.toDegrees(center.latitude) + 45
				        };
			        }else{
			        	// If everything fails assume whole world is visible which is wrong
			        	return {left: -180, bottom: -90, right: 180, top: 90};
			        }
			    }
            },

            onShowColorscale: function(product_id, visible){

            	visible = defaultFor(visible, true);
            	var that = this;

                var product = false;
                globals.products.each(function(p) {
                    if(p.get("download").id == product_id){
                        product = p;
                    }
                });

                if (_.has(this.colorscales, product_id)){
                	// remove object from cesium scene
                	this.map.scene.primitives.remove(this.colorscales[product_id].prim);
                	var index_to_delete = this.colorscales[product_id].index;
                	delete this.colorscales[product_id];

                	// Modify all indices and related height of all colorscales 
                	// which are over deleted position

                	_.each(this.colorscales, function(value, key, obj) {
                		if (obj[key].index >= index_to_delete){
                			obj[key].index = obj[key].index-1;

                			var tmp_mat = obj[key].prim.material;
                			var rect = new Cesium.BoundingRectangle(0, obj[key].index*55 +5, 300, 55);
                			that.map.scene.primitives.remove(obj[key].prim);

		                    var viewportQuad = new Cesium.ViewportQuad(rect, tmp_mat);

		                    var prim = that.map.scene.primitives.add(viewportQuad);

		                    obj[key].prim = prim;
                			
                		}
                	});
                }

                if (product && product.get("showColorscale") && product.get("visible") && visible){

                    var options = product.get("parameters");
                    var keys = _.keys(options);
                    var sel = false;
                    var that = this;
                    var index = Object.keys(this.colorscales).length;


                    _.each(keys, function(key){
                        if(options[key].selected){
                            sel = key;
                        }
                    });

                    var range_min = product.get("parameters")[sel].range[0];
                    var range_max = product.get("parameters")[sel].range[1];
                    var uom = product.get("parameters")[sel].uom;
                    var style = product.get("parameters")[sel].colorscale;
                    var logscale = defaultFor(product.get("parameters")[sel].logarithmic, false);

                    var margin = 20;
                    //var width = $(".cesium-viewer").width()/2;
                    var width = 300;
                    var scalewidth =  width - margin *2;

                    this.plot.setColorScale(style);
                    var colorscaleimage = this.plot.getColorScaleImage().toDataURL("image/jpg");

                    var svgContainer = d3.select("body").append("svg")
                        .attr("width", width)
                        .attr("height", 60)
                        .attr("id", "svgcolorscalecontainer");

                    var axisScale;


					if(logscale){
						axisScale = d3.scale.log();
					}else{
						axisScale = d3.scale.linear();
					}

                    axisScale.domain([range_min, range_max]);
                    axisScale.range([0, scalewidth]);

                    var xAxis = d3.svg.axis()
                        .scale(axisScale);

                    if(logscale){
                    	var numberFormat = d3.format(",f");
						function logFormat(d) {
							var x = Math.log(d) / Math.log(10) + 1e-6;
							return Math.abs(x - Math.floor(x)) < .3 ? numberFormat(d) : "";
						}
						xAxis.tickFormat(logFormat);

                    }else{
						var step = (range_max - range_min)/5
						xAxis.tickValues(
							d3.range(range_min,range_max+step, step)
						);
						xAxis.tickFormat(d3.format("g"));
                    }

                    var g = svgContainer.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(" + [margin, 20]+")")
                        .call(xAxis);

                    g.append("image")
	                    .attr("class", "colorscaleimage")
	                    .attr("width",  scalewidth)
	                    .attr("height", 10)
	                    .attr("transform", "translate(0,-12)")
	                    .attr("preserveAspectRatio", "none")
	                    .attr("xlink:href", colorscaleimage);


                    // Add layer info
                    var info = product.get("name");
                    info += " - " + sel;
                    if(uom){
                    	info += " ("+uom+")";
                    }

                    g.append("text")
                        .style("text-anchor", "middle")
                        //.style("font-size", "1.0em")
                        .attr("transform", "translate(" + [scalewidth/2, 30]+")")
                        .attr("font-weight", "bold")
                        .text(info);

                    svgContainer.selectAll('text')
				      	.attr("stroke", "none")
				      	.attr("fill", "black")
				      	.attr("font-weight", "bold");

                    svgContainer.selectAll(".tick").select("line")
                        .attr("stroke", "black");

                    svgContainer.selectAll('.axis .domain')
				      	.attr("stroke-width", "2")
				      	.attr("stroke", "#000")
				      	.attr("shape-rendering", "crispEdges")
				      	.attr("fill", "none");

				    svgContainer.selectAll('.axis path')
				      	.attr("stroke-width", "2")
				      	.attr("shape-rendering", "crispEdges")
				      	.attr("stroke", "#000");

                    var svg_html = d3.select("#svgcolorscalecontainer")
                        .attr("version", 1.1)
                        .attr("xmlns", "http://www.w3.org/2000/svg")
                        .node().innerHTML;

                    var renderHeight = 55;
                    var renderWidth = width;

                    $("#imagerenderercanvas").attr('width', renderWidth);
                    $("#imagerenderercanvas").attr('height', renderHeight);

                    var c = document.querySelector("#imagerenderercanvas");
                    var ctx = c.getContext('2d');
                    
                    
                    ctx.drawSvg(svg_html, 0, 0, renderHeight, renderWidth);

                    //var image = this.plot.getColorScaleImage().toDataURL("image/jpg");
                    var image = c.toDataURL("image/jpg");
                    var newmat = new Cesium.Material.fromType('Image', {
                        image : image,
                        color: new Cesium.Color(1, 1, 1, 1),
                    });

                    var viewportQuad = new Cesium.ViewportQuad(
                        new Cesium.BoundingRectangle(0, index*55 +5, renderWidth, renderHeight),
                        newmat
                    );

                    var prim = this.map.scene.primitives.add(viewportQuad);

                    this.colorscales[product_id] = {
                    	index: index,
                    	prim: prim
                    };

                    svgContainer.remove();

                }

            },

            onSelectionActivated: function(arg) {
				this.selectionType = arg.selectionType;

				if (arg.active) {

					var that = this;
					this.drawhelper.startDrawingRectangle({
	                    callback: function(extent) {
							var bbox = {
								n: Cesium.Math.toDegrees(extent.north),
								e: Cesium.Math.toDegrees(extent.east),
								s: Cesium.Math.toDegrees(extent.south),
								w: Cesium.Math.toDegrees(extent.west)
							}
							Communicator.mediator.trigger("selection:changed", bbox);
							$('#bb_selection').html('Clear Selection');
	                    }
	                });
				} else {
					//Communicator.mediator.trigger("selection:changed", null);
					this.drawhelper.stopDrawing();
					// It seems the drawhelper muted handlers reset to false and 
					// it creates issues in cesium picking for some reason so
					// we deactivate them again
					this.drawhelper._handlersMuted = true;
				}
			},
           

			onSelectionChanged: function(bbox){

				// It seems the drawhelper muted handlers reset to false and 
				// it creates issues in cesium picking for some reason so
				// we deactivate them again
				this.drawhelper._handlersMuted = true;
				
				if(bbox){
					//this.map.scene.primitives.removeAll();
					var color = "#6699FF";

					var material = new Cesium.Material.fromType('Color');
					material.uniforms.color = new Cesium.Color.fromCssColorString(color);
					material.uniforms.color.alpha = 0.2;

					var e = new Cesium.Rectangle(
						Cesium.Math.toRadians(bbox.w),
						Cesium.Math.toRadians(bbox.s),
						Cesium.Math.toRadians(bbox.e),
						Cesium.Math.toRadians(bbox.n)
					);

			        this.bboxsel = [bbox.s, bbox.w, bbox.n, bbox.e ];

		            this.extentPrimitive = new DrawHelper.RectanglePrimitive({
		                rectangle: e,
		                material: material
		            });

		            this.map.scene.primitives.add(this.extentPrimitive);

		            this.checkFieldLines();
		            


				}else{
					this.bboxsel = null;
					if(this.extentPrimitive)
						this.map.scene.primitives.remove(this.extentPrimitive);
					_.each(_.keys(this.FL_collection), function(key){
	            		this.map.scene.primitives.remove(this.FL_collection[key]);
                		delete this.FL_collection[key];
	            	}, this);
				}


			},

			checkFieldLines: function(){
				console.log(this.activeFL);

				if(this.activeFL.length>0 && this.bboxsel){

	            	var url, model_id, color, band, style, range, logarithmic;

	            	globals.products.each(function(product) {
                		if(this.activeFL.indexOf(product.get('download').id)!=-1){
                			var name = product.get('name');
                			url = product.get("views")[0].urls[0];
                			model_id = product.get("download").id;
                			color = product.get("color");
	                		color = color.substring(1, color.length);
	            			parameters = product.get("parameters");
	            			band;
							_.each(_.keys(parameters), function(key){
								if(parameters[key].selected)
									band = key;
							});
	            			style = parameters[band].colorscale;
	            			range = parameters[band].range;
	            			logarithmic = parameters[band].logarithmic;

	            			if(this.FL_collection.hasOwnProperty( name )) {
		                		this.map.scene.primitives.remove(this.FL_collection[name]);
		                		delete this.FL_collection[name];
		                	}

		                	var that = this;

		                	$.post( url, Tmpl_get_field_lines({
								//"shc": product.get('shc'),
								"model_ids": model_id,
								"begin_time": getISODateTimeString(this.begin_time),
								"end_time": getISODateTimeString(this.end_time),
								"bbox": this.bboxsel[0] +","+ this.bboxsel[1] +","+ this.bboxsel[2] +","+ this.bboxsel[3],
								"style": style,
								"range_min": range[0],
								"range_max": range[1],
								"log_scale": logarithmic
							}))

							.done(function( data ) {
								Papa.parse(data, {
									header: true,
									dynamicTyping: true,
									//name: name,
									complete: function(results) {
										that.createPrimitives(results, name)
									}
								});
							});



                		}
                	}, this);

                	

	            }else{
	            	_.each(_.keys(this.FL_collection), function(key){
	            		this.map.scene.primitives.remove(this.FL_collection[key]);
                		delete this.FL_collection[key];
	            	}, this);
	            }

				
			},

			onFieldlinesChanged: function(){
				this.checkFieldLines();
			},


			createPrimitives: function(results, name){

				var parseddata = {};

				if(this.FL_collection.hasOwnProperty(name)){
					this.map.scene.primitives.remove(this.FL_collection[name]);
				}

				var instances = [];

				_.each(results.data, function(row){
					if(parseddata.hasOwnProperty(row.id)){
						parseddata[row.id].colors.push(Cesium.Color.fromBytes(row.color_r, row.color_g, row.color_b, 255));
						parseddata[row.id].positions.push(new Cesium.Cartesian3(row.pos_x, row.pos_y, row.pos_z));
					}else{
						parseddata[row.id] = {
							colors:[Cesium.Color.fromBytes(row.color_r, row.color_g, row.color_b, 255)],
							positions:[new Cesium.Cartesian3(row.pos_x, row.pos_y, row.pos_z)]
						};
					}
				});

        		_.each(_.keys(parseddata), function(key){

        			instances.push(
        				new Cesium.GeometryInstance({
					        geometry : new Cesium.PolylineGeometry({
					            positions : parseddata[key].positions,
					            width : 2.0,
					            vertexFormat : Cesium.PolylineColorAppearance.VERTEX_FORMAT,
					            colors : parseddata[key].colors,
					            colorsPerVertex : true
					        })
					    })
        			);

				}, this);

				this.FL_collection[name] = new Cesium.Primitive({
					geometryInstances: instances,
					appearance: new Cesium.PolylineColorAppearance()
				});
				

        		this.map.scene.primitives.add(this.FL_collection[name]);
				
			},

			onHighlightPoint: function(coords){
				this.billboards.removeAll();
			    var canvas = document.createElement('canvas');
			    canvas.width = 32;
			    canvas.height = 32;
			    var context2D = canvas.getContext('2d');
			    context2D.beginPath();
			    context2D.arc(16, 16, 12, 0, Cesium.Math.TWO_PI, true);
			    context2D.closePath();
			    context2D.strokeStyle = 'rgb(255, 255, 255)';
			    context2D.lineWidth = 3;
			    context2D.stroke();

			    context2D.beginPath();
			    context2D.arc(16, 16, 9, 0, Cesium.Math.TWO_PI, true);
			    context2D.closePath();
			    context2D.strokeStyle = 'rgb(0, 0, 0)';
			    context2D.lineWidth = 3;
			    context2D.stroke();

			    //var billboards = this.map.scene.primitives.add(new Cesium.BillboardCollection());
			    this.billboards.add({
			        imageId : 'custom canvas point',
			        image : canvas,
			        position : Cesium.Cartesian3.fromDegrees(coords[1], coords[0], parseInt(coords[2]-6384100)),
			        radius: coords[2],
			        //color : Cesium.Color.RED,
			        scale : 1
			    });
			    
			},

			onRemoveHighlights: function(){
				this.billboards.removeAll();
			},

			onTimeChange: function (time) {

				var string = getISODateTimeString(time.start) + "/"+ getISODateTimeString(time.end);

				this.begin_time = time.start;
				this.end_time = time.end;
                                        
	            globals.products.each(function(product) {
                    if(product.get("timeSlider")){
                    	product.set("time",string);
                    	var ces_layer = product.get("ces_layer");

                    	if(ces_layer){
	                    	ces_layer.imageryProvider.updateProperties("time", string);
	                    	if (ces_layer.show){
	                    		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
	                    		this.map.scene.imageryLayers.remove(ces_layer, false);
	                    		this.map.scene.imageryLayers.add(ces_layer, index);
	                    	}
	                    }

	                    if(product.get("views")[0].protocol == "CZML"){
	                    	//this.checkLayerFeatures(product, product.get("visible"));
                			
		        		}else if (product.get("views")[0].protocol == "WPS"){

                			if(product.get("visible")){

                				if(product.get('shc') != null){

                					var parameters = product.get("parameters");
		                			var band;
		                			var keys = _.keys(parameters);
									_.each(keys, function(key){
										if(parameters[key].selected)
											band = key;
									});
		                			var style = parameters[band].colorscale;
		                			var range = parameters[band].range;


                					var imageURI;
									var that = this;
									var imagelayer;
									//product.set("visible", true);

									var ces_layer = product.get("ces_layer");
									var index = this.map.scene.imageryLayers.indexOf(ces_layer);
									
									var url = product.get("views")[0].urls[0];

									$.post( url, Tmpl_eval_model({
										"model": "Custom_Model",
										"variable": band,
										"begin_time": getISODateTimeString(this.begin_time),
										"end_time": getISODateTimeString(this.end_time),
										"elevation": product.get("height"),
										"shc": product.get('shc'),
										"height": 512,
										"width": 1024,
										"style": style,
										"range_min": range[0],
										"range_max": range[1],
									}))

										.done(function( data ) {	
											that.map.scene.imageryLayers.remove(ces_layer);									
										    imageURI = "data:image/gif;base64,"+data;
										    var imagelayer = new Cesium.SingleTileImageryProvider({url: imageURI});
											ces_layer = that.map.scene.imageryLayers.addImageryProvider(imagelayer, index);
											product.set("ces_layer", ces_layer);
										});
                				}
							}
						}
                    }
	            }, this);


				this.checkFieldLines();
            },

            onSetExtent: function(bbox) {
            	//this.map.zoomToExtent(bbox);
            	/*this.map.scene.camera.flyToRectangle({
            		destination: Cesium.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3])
            	});*/

            },

            onChangeZoom: function (zoom) {
            	if(zoom<0){
					this.map.scene.camera.zoomOut(Math.abs(zoom));
            	}else{
            		this.map.scene.camera.zoomIn(Math.abs(zoom));
            	}
            },


			onClose: function(){
				/*this.stopListening();
				this.remove();
				this.unbind();*/
				this.isClosed = true;
			},

			isModelCompatible: function(model) {
				var protocol = model.get('view').protocol;
				if (protocol === 'WMS' || protocol === 'WMTS') {
					return true;
				}
				return false;
			},
			isEventListenedTo: function(eventName) {
			  return !!this._events[eventName];
			},

			onLoadImage: function(url, selection_bounds){

				/*proj4326 = new OpenLayers.Projection("EPSG:4326");
				bounds = selection_bounds;

				bounds.transform(proj4326, this.map.getProjectionObject());
				this.diff_overlay = new OpenLayers.Layer.Image('diff_overlay', url, bounds, new OpenLayers.Size(3400, 1600), {
				 'isBaseLayer': false,
				 'alwaysInRange': true
				});
				this.map.addLayer(this.diff_overlay);
				this.diffimage_index = this.map.getLayerIndex(this.diff_overlay);
				console.log("image "+this.diffimage_index);

				var minzindex = 9999;

				_.each(this.overlay_layers, function(layer){
					 var zindex = layer.getZIndex();
					 if (zindex < minzindex)
					 	minzindex = zindex;
				}.bind(this));

				this.diff_overlay.setZIndex(minzindex-1);*/
	
			},

			onSaveImage: function(){
				this.map.canvas.toBlob(function(blob) {
					saveAs(blob, "VirES_Services_Screenshot.jpg");
				}, "image/jpeg", 1);
			},

			onClearImage: function(){
				if(this.diff_overlay){
					this.map.removeLayer(this.diff_overlay);
					this.diff_overlay = null;
				}
			},

			handleTick: function(clock) {
				// TODO: Cesium does not provide a method to know when the camera has stopped, 
				//       this approach is not ideal, when the movement mantains inertia difference 
				//       values are very low and there are comparison errors.
			    var camera = this.map.scene.camera;

			    if (!this.camera_is_moving){
			    	if (Math.abs(this.camera_last_position.x - camera.position.x) > 10000 &&
			    		Math.abs(this.camera_last_position.y - camera.position.y) > 10000 &&
			    		Math.abs(this.camera_last_position.z - camera.position.z) > 10000 ){

			    		this.camera_is_moving = true;
			    	}
			    }else{
			    	if (Math.abs(this.camera_last_position.x - camera.position.x) < 10000 &&
			    		Math.abs(this.camera_last_position.y - camera.position.y) < 10000 &&
			    		Math.abs(this.camera_last_position.z - camera.position.z) < 10000 ){

			    		this.camera_is_moving = false;
			    		Communicator.mediator.trigger("map:position:change", this.getMapExtent() );
			    	}else{
			    		this.camera_last_position.x = camera.position.x;
			    		this.camera_last_position.y = camera.position.y;
			    		this.camera_last_position.z = camera.position.z;
			    	}
			    }
			},

			toggleDebug: function(){
				this.map.scene.debugShowFramesPerSecond = !this.map.scene.debugShowFramesPerSecond;
			}

		});

		return CesiumView;
	});
