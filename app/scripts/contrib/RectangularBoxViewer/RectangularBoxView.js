define([
	'app',
	'./X3DOMView',
	'underscore',
	'jqueryui'
], function(App, X3DOMView, _) {

	'use strict';

	var RectangularBoxView = X3DOMView.extend({
		initialize: function(opts) {
			// Initialize parent upfront to have this.context() initialized:
			X3DOMView.prototype.initialize.call(this, opts);
			this.enableEmptyView(true); // this is the default

			this.scene = null;
			this.model_DemWithOverlays = null;

			this.sceneDefaults = {
				setTimeLog: false,
				addLightToScene: true,
				background: ["0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2",
					"0.9 1.5 1.57",
					"0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2",
					"0.9 1.5 1.57"
				],
				onClickFunction: function(modelIndex, hitPoint) {
					var height = EarthServerGenericClient.MainScene.getDemValueAt3DPosition(modelIndex, hitPoint[0], hitPoint[2]);
					console.log("Height at clicked position: ", height)
				},

				resolution: [500, 500],

				noDemValue: 0
			};

			// Set a default AoI as the timeline can be changed even if no AoI is selected in the WebClient:
			this.currentAoI = [17.6726953125, 56.8705859375, 19.3865625, 58.12302734375];
			this.currentToI = null;

			// FIXXME: add to config.json and get it from there then!
			this.demProvider = new VMANIP.Layers.WCS({
				id: 'ACE2',
				urls: ['http://data.eox.at/elevation?'],
				crs: ['SRS', 'EPSG:4326'],
				outputCRS: 'http://www.opengis.net/def/crs/EPSG/0/4326',
				format: 'image/x-aaigrid',
				datatype: 'text'
			});

			this.demProvider.registerMimeTypeHandler('image/x-aaigrid', function(receivedData, responseData) {
				var lines = receivedData.split('\n');
				var ncols = parseInt(lines[8].replace('ncols', ''));
				var nrows = parseInt(lines[9].replace('nrows', ''));

				var heightmap = [];
				var maxValue = 0;
				var minValue = 0;

				for (var i = 0; i < nrows; ++i) {
					var value_array = lines[i + 14].split(' ');

					for (var idx = 1; idx < 500; /*value_array.length;*/ ++idx) {
						var val = parseFloat(value_array[idx]);
						if (maxValue < val) {
							maxValue = value_array[idx];
						}
						if (minValue > val) {
							minValue = value_array[idx];
						}
						if (typeof heightmap[idx - 1] === 'undefined') {
							heightmap[idx - 1] = [];
						}
						heightmap[idx - 1].push(value_array[idx])
					}
				}

				responseData.height = ncols - 1;
				responseData.width = nrows - 1;

				responseData.maxHMvalue = maxValue;
				responseData.minHMvalue = minValue;
				responseData.minXvalue = 0;
				responseData.minZvalue = 0;
				responseData.maxXvalue = ncols - 1;
				responseData.maxZvalue = nrows - 1;

				responseData.heightmap = heightmap;

				return true;
			});

			this.options = opts;
		},

		supportsLayer: function(model) {
			if (model.get('view').isBaseLayer) {
				var views = model.get('views');
				var isSupported = false;
				for (var idx = 0; idx < views.length; idx++) {
					var view = views[idx];
					if (view.protocol.toUpperCase() === 'WMS') {
						isSupported = true;
						break;
					}
				};
				return isSupported;
			} else {
				return (model.get('view').protocol.toUpperCase() === 'WMS') ? true : false;
			}
		},
			onSortProducts: function(productLayers) {
				globals.products.each(function(product) {
					if (this.isModelCompatible(product)) {
						var productLayer = this.map.getLayersByName(product.get("name"))[0];
						var index = globals.products.indexOf(productLayer);
						this.map.setLayerIndex(productLayer, index);
					}
				}, this);
				console.log("Map products sorted");
			},
		// options: { name: 'xy', isBaseLayer: 'true/false', visible: 'true/false'}
		onLayerChange: function(model, isVisible) {
			// FIXXME: rethink when to apply changes and when not. Taking into account only the aoi may
			// not be sufficient, not sure...
			// FIXXME: for some reason the function is called with only a model set. Find out where the trigger is!
			if (!this.currentAoI || (typeof isVisible === 'undefined') || !this.model_DemWithOverlays) {
				return;
			}

			if (isVisible) {
				var layer = null;
				if (model.get('view').isBaseLayer) {
					// Find compatible baselayer protocol:
					var view = _.find(model.get('views'), function(view) {
						return view.protocol.toUpperCase() === 'WMS';
					});
					if (view) {
						layer = new VMANIP.Layers.WMS({
							id: view.id,
							urls: view.urls,
							crs: view.crs,
							format: view.format.replace('image/', ''),
							transparent: 'true',
							// FIXXME: '0' would be more intuitive, however, that goes against the necessary ordering in the TextureBlend effect
							ordinal: 10000, // A base layer is always the most bottom layer. 
							opacity: 1 //model.get('opacity')
						});
					}
				} else {
					layer = new VMANIP.Layers.WMS({
						id: model.get('view').id,
						urls: model.get('view').urls,
						crs: model.get('view').crs,
						format: model.get('view').format.replace('image/', ''),
						transparent: 'true',
						ordinal: model.get('ordinal'),
						opacity: model.get('opacity')
					})
				}
				this.model_DemWithOverlays.addImageryProvider(layer);
				// console.log('[RectangularBoxView::onLayerChange] Added ' + model.get('name'));
			} else {
				this.model_DemWithOverlays.removeImageryProviderById(model.get('view').id);
				// console.log('[RectangularBoxView::onLayerChange] Removed ' + model.get('name'));
			}
		},

		// onSortUpdated: function(productLayers) {
		// 	globals.products.each(function(product) {
		// 		if (this.supportsLayer(product)) {
		// 			var productLayer = this.map.getLayersByName(product.get("name"))[0];
		// 			var index = globals.products.indexOf(productLayer);
		// 			this.map.setLayerIndex(productLayer, index);
		// 		}
		// 	}, this);
		// 	console.log("Map products sorted");
		// },

		_onUpdateOpacity: function(desc) {
			var layer_id = desc.model.get('view').id;
			this.model_DemWithOverlays.setTransparencyFor(layer_id, desc.value);
		},

		didInsertElement: function() {
			this.listenTo(this.context(), 'selection:changed', this._setAreaOfInterest);
			this.listenTo(this.context(), 'time:change', this._onTimeChange);
			this.listenTo(this.context(), 'map:layer:change', this.onLayerChange);
			// this.listenTo(this.context(), "productCollection:sortUpdated", this.onSortUpdated);
			this.listenTo(this.context(), 'productCollection:updateOpacity', this._onUpdateOpacity);
		},

		showEmptyView: function() {
			// FIXXME: use marionette's templating mechanism for that!
			this.$el.html('<div class="empty-view">Please select an Area of Interest (AoI) in one of the map viewer!</div>');
		},

		hideEmptyView: function() {
			// CAUTION: simply removing the content of the view's div can have sideeffects. Be cautious not
			// to accidently remove previously created elements!
			this.$el.html('');
		},

		_setAreaOfInterest: function(area) {
			if (area) {
				var toi = this.currentToI;
				// In case no ToI was set during the lifecycle of this viewer we can access
				// the time of interest from the global context:
				if (!toi) {
					var starttime = new Date(this.context().timeOfInterest.start);
					var endtime = new Date(this.context().timeOfInterest.end);

					toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
				}

				var bounds = area.bounds;
				this.currentAoI = [bounds.left, bounds.bottom, bounds.right, bounds.top];

				this._createScene(_.extend(this.sceneDefaults, this.options, {
					aoi: this.currentAoI,
					toi: toi
				}));
			}
		},

		_onTimeChange: function(time) {
			var starttime = new Date(time.start);
			var endtime = new Date(time.end);

			this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();

			if (this.currentAoI) {
				this._createScene(_.extend(this.sceneDefaults, this.options, {
					aoi: this.currentAoI,
					toi: this.currentToI
				}));
			}
		},

		_createScene: function(opts) {
			this.enableEmptyView(false);
			this.onShow();

			if (this.scene) {
				this.model_DemWithOverlays.reset();
				this.context.setToI(this.toi());
				this.context.setAoI(this.currentAoI, 0, 100000);
				// FIXXME: this is not the nicest solution to reset the provider
				this.demProvider.set('isUpToDate', false);
			} else {
				// A Context can hold multiple Providers. They are registered with
				// an id. When instantiating a model later on it is connected via
				// this id with the corresponding Providers.
				this.context = new RBV.Context({
					toi: this.toi(),
					aoi: [this.currentAoI, 0, 100000]
				});
				this.scene = new RBV.Scene(_.extend(this.sceneDefaults, {
					context: this.context
				}));

				if (!this.model_DemWithOverlays) {
					this.model_DemWithOverlays = new RBV.Models.DemWithOverlays();
				}
			}

			this.context.reset();
			// FIXXME: this is too clumsy!
			this.context.addProvider('dem', this.demProvider.id, this.demProvider);
			_.each(this.imageryProviders, function(item, idx) {
				this.context.addProvider('imagery', item.id, item);
				console.log('registering: ' + item.id);
			});
			// Note: for the moment the DEM provider is static:
			this.model_DemWithOverlays.setDemProvider(this.context.getProvider('dem', this.demProvider.id));

			// Get the currently selected layers and setup the model accordingly:
			var selectedLayers = [];

			// Initially create the imagery provider based on the currently selected layers:
			var model_descs = this.getModelsForSelectedLayers(this.supportsLayer);
			_.forEach(model_descs, function(desc, key) {
				var layer = null;
				var model = desc.model;
				if (desc.type === 'baselayer') {
					// Find compatible baselayer protocol:
					var view = _.find(model.get('views'), function(view) {
						return view.protocol.toUpperCase() === 'WMS';
					});

					layer = new VMANIP.Layers.WMS({
						id: view.id,
						urls: view.urls,
						crs: 'EPSG:4326',
						format: view.format.replace('image/', ''),
						transparent: 'true',
						// FIXXME: '0' would be more intuitive, however, that goes against the necessary ordering in the TextureBlend effect
						ordinal: 10000, // A base layer is always the most bottom layer.
						opacity: 1 //model.get('opacity')
					});
				} else {
					layer = new VMANIP.Layers.WMS({
						id: model.get('view').id,
						urls: model.get('view').urls,
						crs: 'EPSG:4326',
						format: model.get('view').format.replace('image/', ''),
						transparent: 'true',
						ordinal: model.get('ordinal'),
						opacity: model.get('opacity')
					});
				}
				selectedLayers.push(layer);
			});

			_.each(selectedLayers, function(layer, idx) {
				this.model_DemWithOverlays.addImageryProvider(layer);
			}.bind(this));

			this.scene.addModel(this.model_DemWithOverlays, [this.demProvider]);
			this.scene.show(this.options);
		},

		toi: function() {
			var toi = this.currentToI;
			// In case no ToI was set during the lifecycle of this viewer we can access
			// the time of interest from the global context:
			if (!toi) {
				var starttime = new Date(this.context().timeOfInterest.start);
				var endtime = new Date(this.context().timeOfInterest.end);

				toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
			}

			return toi;
		}
	});

	return RectangularBoxView;

}); // end module definition