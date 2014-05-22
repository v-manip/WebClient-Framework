define(['backbone.marionette',
		'communicator',
		'app',
		'models/MapModel',
		'globals',
		'openlayers',
		'filesaver'
	],
	function(Marionette, Communicator, App, MapModel, globals) {

		var MapView = Marionette.View.extend({

			model: new MapModel.MapModel(),

			initialize: function(options) {
				this.map = undefined;
				this.isClosed = true;
				this.tileManager = options.tileManager;

				$(window).resize(function() {
					if (this.map) {
						this.onResize();
					}
				}.bind(this));
			},

			createMap: function() {
				// FIXXME: MH: For some reason the map is only displayed if the div's id is "map". Removing the next line
				// causes the map not to be displayed...
				this.$el.attr('id', 'map');
				this.map = new OpenLayers.Map({
					div: this.el,
					fallThrough: true,
					tileManager: this.tileManager
				});

				/*this.map.events.register("moveend", this.map, function(data) {
					this.model.set({
						'center': [data.object.center.lon, data.object.center.lat],
						'zoom': data.object.zoom
					});
				}.bind(this));*/

				this.colors = d3.scale.category10();

				this.map.events.register("move", this.map, function(data) {
					//console.log(data.object.getCenter());
					var center = data.object.getCenter();
					this.model.set({
						'center': [center.lon, center.lat],
						'zoom': data.object.zoom
					});
				}.bind(this));

				
				this.map.events.register("moveend", this.map, function(data) {
					Communicator.mediator.trigger("map:position:change", this.map.getExtent());
				}.bind(this));

				
				//Go through all defined baselayer and add them to the map
				globals.baseLayers.each(function(baselayer) {
					var layer = this.createLayer(baselayer);
					if (layer) {
						this.map.addLayer(layer);
					}
				}, this);

				// Go through all products and add them to the map
				globals.products.each(function(product) {
					// FIXXME: quick hack to not include W3DS layers:
					//if (this.isModelCompatible(product)) {
						var layer = this.createLayer(product);
						if (layer) {
							this.map.addLayer(layer);
						}
					//}
				}, this);

				// Go through all products and add them to the map
                globals.overlays.each(function(overlay){
					// FIXXME: quick hack to not include W3DS layers:
					//if (this.isModelCompatible(overlay)) {
						// console.log('protocol: ' + overlay.get('view').protocol);
						var layer = this.createLayer(overlay);
						if (layer) {
							this.map.addLayer(layer);
						}
					//}
                }, this);

				// Order (sort) the product layers based on collection order
				this.onSortProducts();

				// Openlayers format readers for loading geojson selections
				var io_options = {
					'internalProjection': this.map.baseLayer.projection,
					'externalProjection': new OpenLayers.Projection('EPSG:4326')
				};

				this.geojson = new OpenLayers.Format.GeoJSON(io_options);

				// Add layers for different selection methods
				this.vectorLayer = new OpenLayers.Layer.Vector("Vector Layer");
				
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
								irregular: true
							}
						}
					)
				};

				for (var key in this.drawControls) {
					this.map.addControl(this.drawControls[key]);
					this.drawControls[key].events.register("featureadded", this, this.onDone);
				}

				//Set attributes of map based on mapmodel attributes
				var mapmodel = globals.objects.get('mapmodel');
				this.map.setCenter(new OpenLayers.LonLat(mapmodel.get("center")), mapmodel.get("zoom"));
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
				this.map.updateSize();
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
                        return_layer = new OpenLayers.Layer.WMTS({
                            name: layerdesc.get("name"),
	                        layer: view.id,
	                        protocol: view.protocol,
	                        url: view.urls,
	                        matrixSet: view.matrixSet,
	                        style: view.style,
	                        format: view.format,
	                        maxExtent: view.maxExtent,
	                        resolutions: view.resolutions,
	                        projection: view.projection,
	                        gutter: view.gutter,
	                        buffer: view.buffer,
	                        units: view.units,
	                        transitionEffect: view.transitionEffect,
	                        isphericalMercator: view.isphericalMercator,
	                        isBaseLayer: view.isBaseLayer,
	                        wrapDateLine: view.wrapDateLine,
	                        zoomOffset: view.zoomOffset,
	                        visibility: layerdesc.get("visible"),
	                        time: layerdesc.get('time')
                        });
                    break;

                    case "WMS":
                        return_layer = new OpenLayers.Layer.WMS(
                            layerdesc.get("name"),
                            view.urls[0],
                            {
                                layers: view.id,
                                transparent: "true",
                                format: "image/png",
                                time: layerdesc.get('time')
                            },
                            {
                                format: 'image/png',
                                matrixSet: view.matrixSet,
                                style: view.style,
                                format: view.format,
                                maxExtent: view.maxExtent,
                                resolutions: view.resolutions,
                                projection: view.projection,
                                gutter: view.gutter,
                                buffer: view.buffer,
                                units: view.units,
                                transitionEffect: view.transitionEffect,
                                isphericalMercator: view.isphericalMercator,
                                isBaseLayer: view.isBaseLayer,
                                wrapDateLine: view.wrapDateLine,
                                zoomOffset: view.zoomOffset,
                                visibility: layerdesc.get("visible")
                            }
                        );
                    break;

                    default:
                    	// No supported view available
                    	return null;
                    break;

                };

                return_layer.events.register("loadstart", this, function() {
                  	Communicator.mediator.trigger("progress:change", true);
                });
                
                return_layer.events.register("loadend", this, function() {
                  	Communicator.mediator.trigger("progress:change", false);
                });
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
				globals.products.each(function(product) {
					//if (this.isModelCompatible(product)) {
					// Another quick hack to exclude 'W3DS' layers. We should use the isModelCompatible() function!
					if (product.get('views')[0].protocol !== 'W3DS' &&
						product.get('views')[0].protocol !== 'DEM' &&
						product.get('views')[0].protocol !== 'WIREFRAME') {
						var productLayer = this.map.getLayersByName(product.get("name"))[0];
						var index = globals.products.indexOf(productLayer);
						this.map.setLayerIndex(productLayer, index);
					//}
					}
				}, this);
				console.log("Map products sorted");
			},

			onUpdateOpacity: function(options) {
                var layer = this.map.getLayersByName(options.model.get("name"))[0];
                if (layer){
                        layer.setOpacity(options.value);
                }
            },

            changeLayer: function(options) {
				if (options.isBaseLayer){
	                this.map.setBaseLayer(this.map.getLayersByName(options.name)[0]);
                } else {
                    var layers = this.map.getLayersByName(options.name);
                    if (layers.length) {
                    	layers[0].setVisibility(options.visible);
                    }
                }
            },

			onSelectionActivated: function(arg) {
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

			onLoadGeoJSON: function(data) {
				this.vectorLayer.removeAllFeatures();
				var features = this.geojson.read(data);
				var bounds;
				if (features) {
					if (features.constructor != Array) {
						features = [features];
					}
					for (var i = 0; i < features.length; ++i) {
						if (!bounds) {
							bounds = features[i].geometry.getBounds();
						} else {
							bounds.extend(features[i].geometry.getBounds());
						}

					}
					this.vectorLayer.addFeatures(features);
					this.map.zoomToExtent(bounds);
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
				color = this.colors(evt.feature.layer.features.length-1);
				evt.feature.style = {fillColor: color, pointRadius: 6, strokeColor: color, fillOpacity: 0.5};
				evt.feature.layer.drawFeature(evt.feature);
				// MH: this is a hack: I send the openlayers AND the coords so that the viewers (RBV, SliceViewer) do
				// not have to be rewritten. This has to be changed somewhen...
				Communicator.mediator.trigger("selection:changed", evt.feature.geometry.bounds, this._convertCoordsFromOpenLayers(evt.feature.geometry, 0), color);
			},

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
                        var productLayer = this.map.getLayersByName(product.get("name"))[0];
                      	productLayer.mergeNewParams({'time':string});
                    }
	            }, this);
            },

			onSelectionChanged: function(coords) {
	            // FIXXME: The MapvView triggers the 'selection:changed' with the payload of 'null'
	            // when the selection items in the toolbar are clicked. This event triggers this method
	            // here in the VGV. So if the openlayers_geometry parameter is 'null' we skip the execution of this
	            // method.
				if (coords) {
					console.dir(coords);
				}
			},

            onSetExtent: function(bbox) {
            	this.map.zoomToExtent(bbox);

            },

			onClose: function(){
				this.isClosed = true;
			},

			isModelCompatible: function(model) {
				var protocol = model.get('view').protocol;
				if (protocol === 'WMS' || protocol === 'WMTS') {
					return true;
				}
				return false;
			}
		});

		return MapView;
	});