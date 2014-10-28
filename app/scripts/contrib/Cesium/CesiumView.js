

CESIUM_BASE_URL = "/bower_components/Cesium-1.1/Build/Cesium/"

define(['backbone.marionette',
		'communicator',
		'app',
		'models/MapModel',
		'globals',
		'openlayers',
		'cesium/Cesium',
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

				$(window).resize(function() {
					if (this.map) {
						this.onResize();
					}
				}.bind(this));
			},

			createMap: function() {

				var layer;
				var name = "";

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
						//creditContainer: ".cesium_attribution"
					});
				}
				
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

				// Add layers for different selection methods
				this.vectorLayer = new OpenLayers.Layer.Vector("vectorLayer");
				
				this.map.addLayers([this.vectorLayer]);
				this.map.addControl(new OpenLayers.Control.MousePosition());

				this.drawControls = {
					pointSelection: new OpenLayers.Control.DrawFeature(this.vectorLayer,
						OpenLayers.Handler.Point),
					lineSelection: new OpenLayers.Control.DrawFeature(this.vectorLayer,
						OpenLayers.Handler.Path),
					polygonSelection: new OpenLayers.Control.DrawFeature(this.vectorLayer,
						OpenLayers.Handler.Polygon),
					bboxSelection: new OpenLayers.Control.DrawFeature(this.vectorLayer,
						OpenLayers.Handler.RegularPolygon, {
							handlerOptions: {
								sides: 4,
								irregular: true,
								keyMask: !OpenLayers.Handler.MOD_CTRL
							}
            			}
					)
				};*/

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

				/*for (var key in this.drawControls) {
					this.map.addControl(this.drawControls[key]);
					this.drawControls[key].events.register("featureadded", this, this.onDone);
				}

				//Set attributes of map based on mapmodel attributes
				var mapmodel = globals.objects.get('mapmodel');
				this.map.setCenter(new OpenLayers.LonLat(mapmodel.get("center")), mapmodel.get("zoom"));*/
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
							if(baselayer.get("name")==options.name)
								ces_layer.show = true;
						}
					}, this);

					globals.baseLayers.each(function(baselayer) {
						var ces_layer = baselayer.get("ces_layer");
						if (ces_layer) {
							if(baselayer.get("name")!=options.name)
								ces_layer.show = false;
						}
					}, this);

                } else {
                    globals.overlays.each(function(overlay) {
                    	if(overlay.get("name")==options.name){
                    		var ces_layer = overlay.get("ces_layer");
							ces_layer.show = options.visible;
						}
					}, this);

					globals.products.each(function(product) {
                    	if(product.get("name")==options.name){
                    		var ces_layer = product.get("ces_layer");
							ces_layer.show = options.visible;
						}
					}, this);
                }
            },

			onSelectionActivated: function(arg) {
				this.selectionType = arg.selectionType;
				if (arg.active) {
					for (key in this.drawControls) {
						var control = this.drawControls[key];
						if (arg.id == key) {
							control.activate();
						} else {
							control.layer.removeAllFeatures();
							control.deactivate();
							Communicator.mediator.trigger("selection:changed", null);
						}
					}
				} else {
					for (key in this.drawControls) {
						var control = this.drawControls[key];
						control.layer.removeAllFeatures();
						control.deactivate();
						Communicator.mediator.trigger("selection:changed", null);

					}
				}
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
            	return this.map.getExtent();
            },
           
			onDone: function(evt) {
				
				// TODO: How to handle multiple draws etc has to be thought of
				// as well as what exactly is comunicated out
				//console.log(colors(evt.feature.layer.features.length-1),evt.feature.layer.features.length-1);
				var colorindex = this.vectorLayer.features.length;
				if(this.selectionType == "single"){
					this.vectorLayer.removeAllFeatures();
					colorindex = this.vectorLayer.features.length;
					Communicator.mediator.trigger("selection:changed", null);
				}

				
				//Communicator.mediator.trigger("selection:changed", evt.feature);
				// MH: this is a hack: I send the openlayers AND the coords so that the viewers (RBV, SliceViewer) do
				// not have to be rewritten. This has to be changed somewhen...
				var color = this.colors(colorindex);
				Communicator.mediator.trigger("selection:changed", evt.feature, this._convertCoordsFromOpenLayers(evt.feature.geometry, 0), color);
				
				evt.feature.destroy();
			},

			onSelectionChanged: function(feature, coords, color){

				if(feature){
					var colorindex = this.vectorLayer.features.length+1;
					if(this.selectionType == "single"){
						this.vectorLayer.removeAllFeatures();
						colorindex = this.vectorLayer.features.length;
					}
					/*if (color)
						color = this.colors(this.vectorLayer.features.length-1);
					else
						color = this.colors(this.vectorLayer.features.length);*/

					if(!color)
						color = this.colors(colorindex);
					feature.style = {fillColor: color, pointRadius: 6, strokeColor: color, fillOpacity: 0.5};
					this.vectorLayer.addFeatures([feature.clone()]);
				}
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

			onTimeChange: function (time) {

				var string = getISODateTimeString(time.start) + "/"+ getISODateTimeString(time.end);
                                        
	            globals.products.each(function(product) {
                    if(product.get("timeSlider")){
                    	product.set("time",string);
                    	var ces_layer = product.get("ces_layer");
                    	ces_layer.imageryProvider._parameters["time"] = string;
                    	if (ces_layer.show){
                    		var index = this.map.scene.imageryLayers.indexOf(ces_layer);
                    		this.map.scene.imageryLayers.remove(ces_layer, false);
                    		this.map.scene.imageryLayers.add(ces_layer, index);
                    	}
                    }
	            }, this);
            },

            onSetExtent: function(bbox) {
            	this.map.zoomToExtent(bbox);

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
			}

		});

		return CesiumView;
	});