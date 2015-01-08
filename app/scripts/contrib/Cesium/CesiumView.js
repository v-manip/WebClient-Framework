

CESIUM_BASE_URL = "bower_components/Cesium-1.1/Build/Cesium/"

define(['backbone.marionette',
		'communicator',
		'app',
		'models/MapModel',
		'globals',
		'openlayers',
		'cesium/Cesium',
		'drawhelper',
		'filesaver'
	],
	function(Marionette, Communicator, App, MapModel, globals) {

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

				this.begin_time = null;
				this.end_time = null;

				$(window).resize(function() {
					if (this.map) {
						this.onResize();
					}
				}.bind(this));

			},

			createMap: function() {

				// Problem arose in some browsers where aspect ratio was kept not adapting 
				// to height; Added height style attribute to 100% to solve problem
				this.$el.attr("style","height:100%;");

				this.$el.append("<div id='cesium_attribution'></div>");
				this.$el.append("<div id='cesium_custom_attribution'></div>");
				$("#cesium_custom_attribution").append("<div style='float:left'><a href='http://cesiumjs.org' target='_blank'>Cesium</a>"+
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>");

				var layer;
				var name = "";

				this.colors = globals.objects.get("color");

				globals.baseLayers.each(function(baselayer) {
					if (baselayer.get("visible")){
						name = baselayer.get("name");
						layer = this.createLayer(baselayer);
					}
				}, this);

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
					        url : 'http://cesiumjs.org/stk-terrain/tilesets/world/tiles'
					    }),
						creditContainer: "cesium_attribution"
					});
				}

				this.billboards = this.map.scene.primitives.add(new Cesium.BillboardCollection());

				this.drawhelper = new DrawHelper(this.map.cesiumWidget);

				this.camera_last_position = {};
				this.camera_last_position.x = this.map.scene.camera.position.x;
				this.camera_last_position.y = this.map.scene.camera.position.y;
				this.camera_last_position.z = this.map.scene.camera.position.z;

				this.map.clock.onTick.addEventListener(this.handleTick.bind(this));
				
				globals.baseLayers.each(function(baselayer) {
					if (baselayer.get("name") == name){
						var ces_layer = this.map.scene.imageryLayers.get(0);
						ces_layer.show = true;
				 		baselayer.set("ces_layer", ces_layer);
					}
				}, this);

				//this.map.scene.imageryLayers.removeAll(true);

				// FIXXME: MH: For some reason the map is only displayed if the div's id is "map". Removing the next line
				// causes the map not to be displayed...
				/*this.$el.attr('id', 'map');
				this.map = new OpenLayers.Map({
					div: this.el,
					fallThrough: true,
					tileManager: this.tileManager,
					 controls: [
					 	new OpenLayers.Control.Navigation(),
                        new OpenLayers.Control.Zoom( { zoomInId: "zoomIn", zoomOutId: "zoomOut" } ),
                        new OpenLayers.Control.Attribution( { displayClass: 'olControlAttribution' } )
                    ]
				});

				this.colors = globals.objects.get("color");

				this.map.events.register("move", this.map, function(data) {
					//console.log(data.object.getCenter());
					var center = data.object.getCenter();
					this.model.set({
						'center': [center.lon, center.lat],
						'zoom': data.object.zoom
					});

					// We set a flag here so that other views have the possibility to check if there is a
					// map panning going on at the moment. This is important e.g. for the VGV to prevent
					// sending a 'pan' event in some cases which would lead to a infinite recursion.
					App.isMapPanning = true;
				}.bind(this));

				
				this.map.events.register("moveend", this.map, function(data) {
					// See lines above for an explanation of that flag:
					App.isMapPanning = false;
					Communicator.mediator.trigger("map:position:change", this.map.getExtent());				
				}.bind(this));
				*/
				
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
				//_.each(globals.products.reverse(),function(product){
					var layer = this.createLayer(product);
					if (layer) {
						var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
						imagerylayer.show = product.get("visible");
						product.set("ces_layer", imagerylayer);
					}
				}, this);
/*
				

				// Order (sort) the product layers based on collection order
				this.onSortProducts();

				// Openlayers format readers for loading geojson selections
				var io_options = {
					'internalProjection': this.map.baseLayer.projection,
					'externalProjection': new OpenLayers.Projection('EPSG:4326')
				};

				this.geojson = new OpenLayers.Format.GeoJSON(io_options);
				
				this.map.addLayers([this.vectorLayer]);
				this.map.addControl(new OpenLayers.Control.MousePosition());

				*/

				// Go through all overlays and add them to the map
                globals.overlays.each(function(overlay){
                	var layer = this.createLayer(overlay);
					if (layer) {
						var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
						var index = this.map.scene.imageryLayers.indexOf(imagerylayer);
						index += this.overlay_offset;
						this.map.scene.imageryLayers.remove(imagerylayer, false);
						imagerylayer.show = overlay.get("visible");
						this.map.scene.imageryLayers.add(imagerylayer, index);
						overlay.set("ces_layer", imagerylayer);
					}
                }, this);

                /*
				//Set attributes of map based on mapmodel attributes
				var mapmodel = globals.objects.get('mapmodel');
				this.map.setCenter(new OpenLayers.LonLat(mapmodel.get("center")), mapmodel.get("zoom"));*/

				/////////////////////////////////////////////////////////////////////

				var layers = this.map.scene.imageryLayers;

				


				var url1 = "http://localhost:9000/vires00/ows?service=WMS&version=1.1.1&request=GetMap&styles=rainbow&format=image/png&dim_bands=F&dim_range=30000,60000&transparent=true&time=2010-01-01T15:53:44Z/2010-01-01T17:27:36Z&layers=WMM&srs=EPSG:4326&bbox=-180,-90,180,90&width=1024&height=512&"
				var url2 = "http://localhost:9000/vires00/ows?service=WMS&version=1.1.1&request=GetMap&styles=rainbow&format=image/png&dim_bands=F&dim_range=30000,60000&transparent=true&time=2011-01-01T15:53:44Z/2011-01-01T17:27:36Z&layers=WMM&srs=EPSG:4326&bbox=-180,-90,180,90&width=1024&height=512&"
				var url3 = "http://localhost:9000/vires00/ows?service=WMS&version=1.1.1&request=GetMap&styles=rainbow&format=image/png&dim_bands=F&dim_range=30000,60000&transparent=true&time=2012-01-01T15:53:44Z/2012-01-01T17:27:36Z&layers=WMM&srs=EPSG:4326&bbox=-180,-90,180,90&width=1024&height=512&"
				var url4 = "http://localhost:9000/vires00/ows?service=WMS&version=1.1.1&request=GetMap&styles=rainbow&format=image/png&dim_bands=F&dim_range=30000,60000&transparent=true&time=2013-01-01T15:53:44Z/2013-01-01T17:27:36Z&layers=WMM&srs=EPSG:4326&bbox=-180,-90,180,90&width=1024&height=512&"
				var url5 = "http://localhost:9000/vires00/ows?service=WMS&version=1.1.1&request=GetMap&styles=rainbow&format=image/png&dim_bands=F&dim_range=30000,60000&transparent=true&time=2014-01-01T15:53:44Z/2014-01-01T17:27:36Z&layers=WMM&srs=EPSG:4326&bbox=-180,-90,180,90&width=1024&height=512&"
				
				var that = this;

				// load several images in parallel
				Cesium.when.all([Cesium.loadImage(url1),
								 Cesium.loadImage(url2),
								 Cesium.loadImage(url3),
								 Cesium.loadImage(url4),
								 Cesium.loadImageViaBlob(url5)]).then(function(images) {
				    // images is an array containing all the loaded images

				 //    layers.addImageryProvider(new Cesium.SingleTileImageryProvider({
					//     url : image[0],
					//     rectangle : Cesium.Rectangle.fromDegrees(-180, -90, 180, 90)
					// }));

					// new ImageMaterialProperty()

					// new RectangleGraphics()


					// var material = Cesium.Material.fromType('Image', {
					// 	image: url1
					// });
					// // material.uniforms.image = image[0];
					// // material.uniforms.color = new Cesium.Color.fromCssColorString(color);
					// // material.uniforms.color.alpha = 0.6;

					// var e = new Cesium.Rectangle(-180,-90,180,90);

			  //       var extentPrimitive = new DrawHelper.ExtentPrimitive({
		   //              extent: e,
		   //              material: material
		   //          });

		   //          that.map.scene.primitives.add(extentPrimitive);

				 //    _.each(images, function(image){

				 //    });
				});




				////////////////////////////////////////////////////////
			},

			onShow: function() {
				if (!this.map) {
					this.createMap();
				}
				this.isClosed = false;
				this.onResize();
				return this;
			},

			onResize: function() {
				//this.map.updateSize();
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
                    		time: layerdesc.get("time"),
                    		transparent: 'true'
                    	},  Cesium.WebMapServiceImageryProvider.DefaultParameters)

                    	// Check if layer has additional parameters configured
                    	var additional_parameters = {};
                    	var styles;
                    	if(layerdesc.get("parameters")){
                    		var options = layerdesc.get("parameters");
                    		var keys = _.keys(options);
                    		_.each(keys, function(key){
								if(options[key].selected){
									additional_parameters.dim_bands = key;
									// additional_parameters.range_min = options[key].range[0];
									// additional_parameters.range_max = options[key].range[1];
									additional_parameters.dim_range = options[key].range[0]+","+options[key].range[1];
									//additional_parameters.styles = options[key].colorscale;
									styles = options[key].colorscale;
								}
							});
                    	}
                    	params = $.extend(additional_parameters, params);
                    	params.styles = styles; 

                    	params.format = 'image/png';
                    	return_layer = new Cesium.WebMapServiceImageryProvider({
						    url: view.urls[0],
						    layers : view.id,
						    parameters: params
						});
                    break;

                    default:
                    	// No supported view available
                    	return null;
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
				this.map.setCenter(new OpenLayers.LonLat(data.x, data.y), data.l);

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
                		var product_index = globals.products.length-1 - globals.products.indexOf(product);
                		var ces_index = this.map.scene.imageryLayers.indexOf(ces_layer);
                		var cur_move = product_index - ces_index + globals.baseLayers.length-1;
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
				//var ces_layer = options.model.get("ces_layer");
				globals.products.each(function(product) {
                	if(product.get("name")==options.model.get("name")){
                		var ces_layer = product.get("ces_layer");
                		if(ces_layer){
							ces_layer.alpha = options.value;
						}
					}
				}, this);
                /*var layer = this.map.getLayersByName(options.model.get("name"))[0];
                if (layer){
                        layer.setOpacity(options.value);
                }*/
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
                    			if(options.visible){
                    				product.set("visible", true);
                    				var czmlSource = new Cesium.CzmlDataSource();
                    				var url = product.get("views")[0].urls[0] + "?service=WPS&version=1.0.0&request=Execute&" +
											  "identifier=retrieve_czml&" +
											  "DataInputs="+
											  "collection_ids="+ product.get("views")[0].id +"%3B"+
											  "begin_time="+ getISODateTimeString(this.begin_time) +"%3B"+
											  "end_time="+ getISODateTimeString(this.end_time)+"&"+
											  "rawdataoutput=output";
									//TODO: This is just for testing fieldlines czml file, will be removed
									if(product.get("name")=="Fieldlines WMM 2010")
                    					url = product.get("views")[0].id;
	                    			czmlSource.loadUrl(url);
	                    			product.set("czmlSource", czmlSource);
			        				this.map.dataSources.add(czmlSource);
			        			}else{
			        				//this.map.dataSources.removeAll();
			        				if(product.get("czmlSource")){
			        					this.map.dataSources.remove(product.get("czmlSource"), true);
			        				}
			        			}
                    		}else{
	                    		var ces_layer = product.get("ces_layer");
								ces_layer.show = options.visible;
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
					}, this);
                }



            },


            onLayerRangeChanged: function(layer, range){

            	globals.products.each(function(product) {
                    
                	if(product.get("name")==layer){
                		// TODO: Do we need to update the model object here?
	                	var ces_layer = product.get("ces_layer");
	                	ces_layer.imageryProvider._parameters["dim_range"] = range[0]+","+range[1];
	                	//ces_layer.imageryProvider._parameters["range_max"] = range[1];

	                	if (ces_layer.show){
		            		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
		            		this.map.scene.imageryLayers.remove(ces_layer, false);
		            		this.map.scene.imageryLayers.add(ces_layer, index);
		            	}
		            }
                    
	            }, this);
            },

			onLayerBandChanged: function(layer, band, range){
				
            	globals.products.each(function(product) {
                    
                	if(product.get("name")==layer){
                		// TODO: Do we need to update the model object here?
	                	var ces_layer = product.get("ces_layer");
	                	ces_layer.imageryProvider._parameters["dim_bands"] = band;
	                	// ces_layer.imageryProvider._parameters["range_min"] = range[0];
	                	// ces_layer.imageryProvider._parameters["range_max"] = range[1];
	                	ces_layer.imageryProvider._parameters["dim_range"] = range[0]+","+range[1];

	                	if (ces_layer.show){
		            		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
		            		this.map.scene.imageryLayers.remove(ces_layer, false);
		            		this.map.scene.imageryLayers.add(ces_layer, index);
		            	}
		            }
                    
	            }, this);
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

            onSelectionActivated: function(arg) {
				this.selectionType = arg.selectionType;

				if (arg.active) {

					var that = this;
					this.drawhelper.startDrawingExtent({
	                    callback: function(extent) {

				            /*console.log('Extent created (N: ' + extent.north.toFixed(3) +
				            			 ', E: ' + extent.east.toFixed(3) + 
				            			 ', S: ' + extent.south.toFixed(3) +
				            			 ', W: ' + extent.west.toFixed(3) + ')');*/

							var colorindex = that.map.scene.primitives.length+1;
							if(that.selectionType == "single"){
								//that.map.scene.primitives.removeAll();
								colorindex = that.map.scene.primitives.length;
								Communicator.mediator.trigger("selection:changed", null);
							}

							var color = that.colors(colorindex);

							//Communicator.mediator.trigger("selection:changed", evt.feature);
							// MH: this is a hack: I send the openlayers AND the coords so that the viewers (RBV, SliceViewer) do
							// not have to be rewritten. This has to be changed somewhen...
							var coordinates = that._convertCoordsFromCesium(extent, 0);
							var feature = that._convertCoordsToOpenLayers(coordinates);
							Communicator.mediator.trigger("selection:changed", feature, coordinates, color);
	                    }
	                });

					/*for (key in this.drawControls) {
						var control = this.drawControls[key];
						if (arg.id == key) {
							control.activate();
						} else {
							control.layer.removeAllFeatures();
							control.deactivate();
							Communicator.mediator.trigger("selection:changed", null);
						}
					}*/
				} else {
					//this.map.scene.primitives.removeAll();
					Communicator.mediator.trigger("selection:changed", null);
					//this.drawhelper.muteHandlers(true);
					//this.map.screenSpaceEventHandler.destroy();
					this.drawhelper.stopDrawing();
					/*for (key in this.drawControls) {
						var control = this.drawControls[key];
						control.layer.removeAllFeatures();
						control.deactivate();
						Communicator.mediator.trigger("selection:changed", null);

					}*/
				}
			},
           

			onSelectionChanged: function(feature, coords, color){

				if(feature){
					var colorindex = this.map.scene.primitives.length+1;
					if(this.selectionType == "single"){
						this.map.scene.primitives.removeAll();
						colorindex = this.map.scene.primitives.length;
					}

					if(!color)
						color = this.colors(colorindex);

					var material = Cesium.Material.fromType('Color');
					material.uniforms.color = new Cesium.Color.fromCssColorString(color);
					material.uniforms.color.alpha = 0.6;

					var e = new Cesium.Rectangle();

			        e.west = Cesium.Math.toRadians(coords[0].x);
			        e.east = Cesium.Math.toRadians(coords[2].x);
			        e.south = Cesium.Math.toRadians(coords[0].y);
			        e.north = Cesium.Math.toRadians(coords[2].y);

		            var extentPrimitive = new DrawHelper.ExtentPrimitive({
		                extent: e,
		                material: material
		            });

		            this.map.scene.primitives.add(extentPrimitive);
				}else{
					this.map.scene.primitives.removeAll();
				}


			},

			onHighlightPoint: function(coords){

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

			/*onSelectionChanged: function(coords) {
	            // FIXXME: The MapvView triggers the 'selection:changed' with the payload of 'null'
	            // when the selection items in the toolbar are clicked. This event triggers this method
	            // here in the VGV. So if the openlayers_geometry parameter is 'null' we skip the execution of this
	            // method.
				if (coords) {
					console.dir(coords);
				}
			},*/

	        _convertCoordsFromOpenLayers: function(openlayer_geometry, altitude) {
	            var verts = openlayer_geometry.getVertices();

	            var coordinates = [];
	            for (var idx = 0; idx < verts.length - 1; ++idx) {
	                var p = {
	                    x: verts[idx].x,
	                    y: verts[idx].y,
	                    z: altitude // not mandatory, can be undefined
	                };

	                coordinates.push(p);
	            }
	            var p = {
	                x: verts[idx].x,
	                y: verts[idx].y,
	                z: altitude // not mandatory, can be undefined
	            };

	            coordinates.push(p);

	            return coordinates;
	        },

	        _convertCoordsFromCesium: function(prim, altitude) {

	            var coordinates = [];

	            coordinates.push({
	            	x: Cesium.Math.toDegrees(prim.west),
	            	y: Cesium.Math.toDegrees(prim.south),
	            	z: altitude
	            });
	            coordinates.push({
	            	x: Cesium.Math.toDegrees(prim.west),
	            	y: Cesium.Math.toDegrees(prim.north),
	            	z: altitude
	            });
	            coordinates.push({
	            	x: Cesium.Math.toDegrees(prim.east),
	            	y: Cesium.Math.toDegrees(prim.north),
	            	z: altitude
	            });
	            coordinates.push({
	            	x: Cesium.Math.toDegrees(prim.east),
	            	y: Cesium.Math.toDegrees(prim.south),
	            	z: altitude
	            });
	            
	            return coordinates;
	        },

	        _convertCoordsToOpenLayers: function(coords){
	        	var points = [];
                for (var idx = 0; idx < coords.length; idx++) {
                    points.push(new OpenLayers.Geometry.Point(coords[idx].x, coords[idx].y));
                };

                var ring = new OpenLayers.Geometry.LinearRing(points);
                var polygon = new OpenLayers.Geometry.Polygon([ring]);
                var feature = new OpenLayers.Feature.Vector(polygon);

                return feature;
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
	                    	ces_layer.imageryProvider._parameters["time"] = string;
	                    	if (ces_layer.show){
	                    		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
	                    		this.map.scene.imageryLayers.remove(ces_layer, false);
	                    		this.map.scene.imageryLayers.add(ces_layer, index);
	                    	}
	                    }

	                    if(product.get("views")[0].protocol == "CZML"){
                			if(product.get("visible")){
                				this.map.dataSources.removeAll();
                				var czmlSource = new Cesium.CzmlDataSource();
                				var url = product.get("views")[0].urls[0] + "?service=WPS&version=1.0.0&request=Execute&" +
										  "identifier=retrieve_czml&" +
										  "DataInputs="+
										  "collection_ids="+ product.get("views")[0].id +"%3B"+
										  "begin_time="+ getISODateTimeString(this.begin_time) +"%3B"+
										  "end_time="+ getISODateTimeString(this.end_time)+"&"+
										  "rawdataoutput=output";
                				//var url = product.get("views")[0].id;
                    			czmlSource.loadUrl(url);
		        				this.map.dataSources.add(czmlSource);
		        			}/*}else{
		        				this.map.dataSources.removeAll();
		        			}*/
		        		}
                    }
	            }, this);
            },

            onSetExtent: function(bbox) {
            	//this.map.zoomToExtent(bbox);
            	this.map.scene.camera.flyToRectangle({
            		destination: Cesium.Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3])
            	});

            },

			onClose: function(){
				this.stopListening();
				this.remove();
				this.unbind();
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

				proj4326 = new OpenLayers.Projection("EPSG:4326");
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

				this.diff_overlay.setZIndex(minzindex-1);
	
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