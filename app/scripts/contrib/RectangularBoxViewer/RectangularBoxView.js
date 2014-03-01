define([
	'app',
	'./X3DOMView',
	'globals',
	'communicator',
	'underscore',
	'jqueryui'
], function(App, X3DOMView, globals, Communicator, _) {

	'use strict';

	var RectangularBoxView = X3DOMView.extend({
		initialize: function(opts) {
			this.options = opts;

			// Initialize parent upfront to have this.legacyContext() initialized:
			X3DOMView.prototype.initialize.call(this, opts);
			this.enableEmptyView(true); // this is the default

			this.setupContext();
			this.setupScene();
		},

		setupContext: function() {
			// Set a default AoI as the timeline can be changed even if no AoI is selected in the WebClient:
			this.currentAoI = [17.6726953125, 56.8705859375, 19.3865625, 58.12302734375];
			this.currentToI = null;

			// A Context can hold multiple Providers. They are registered with
			// an id. When instantiating a model later on it is connected via
			// this id with the corresponding Providers.
			this.context = new RBV.Context({
				mediator: Communicator.mediator,
				globals: globals,
				toi: this.toi(),
				aoi: [this.currentAoI, 0, 100000]
			});

			// FIXXME: add to config.json and get it from there then!
			var terrainLayer = new VMANIP.Layers.WCS({
				id: 'ACE2',
				urls: ['http://data.eox.at/elevation?'],
				crs: ['SRS', 'EPSG:4326'],
				outputCRS: 'http://www.opengis.net/def/crs/EPSG/0/4326',
				format: 'image/x-aaigrid',
				datatype: 'text'
			});

			terrainLayer.registerMimeTypeHandler('image/x-aaigrid', function(receivedData, responseData) {
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

			this.context.addLayer('terrain', terrainLayer.id, terrainLayer);
		},

		setupScene: function() {
			this.scene = null;
			this.modelTerrainWithOverlay = null;

			this.modelTerrainWithOverlay = new RBV.Models.DemWithOverlays();
		},


		_createScene: function(opts) {
			this.enableEmptyView(false);
			this.onShow();

			if (this.scene) {
				this.modelTerrainWithOverlay.reset();
				this.context.setToI(this.toi());
				this.context.setAoI(this.currentAoI, 0, 100000);
				// FIXXME: this is not the nicest solution to reset the layer
				this.terrainLayer.set('isUpToDate', false);
			} else {
				this.scene = new RBV.Scene({
					context: this.context,
					x3dscene_id: opts.x3dscene_id
				});
			}

			this.scene.addModel(this.modelTerrainWithOverlay);
			this.scene.show(this.options);
		},

		supportsLayer: function(model) {
			if (model.get('view').isBaseLayer) {
				console.log('SKIPPING REQUEST!!!');
				return false;
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

		// onSortProducts: function(productLayers) {
		// 	globals.products.each(function(product) {
		// 		if (this.isModelCompatible(product)) {
		// 			var productLayer = this.map.getLayersByName(product.get("name"))[0];
		// 			var index = globals.products.indexOf(productLayer);
		// 			this.map.setLayerIndex(productLayer, index);
		// 		}
		// 	}, this);
		// 	console.log("Map products sorted");
		// },

		// options: { name: 'xy', isBaseLayer: 'true/false', visible: 'true/false'}
		onLayerChange: function(model, isVisible) {
			if (!model.hasOwnProperty('isBaseLayer')) {
				var layer = this.context.getLayerById(model.get('view').id, 'imagery');
				this.context.trigger('change:layer:visibility', layer, isVisible);
			}
			return;
			// FIXXME: rethink when to apply changes and when not. Taking into account only the aoi may
			// not be sufficient, not sure...
			// FIXXME: for some reason the function is called with only a model set. Find out where the trigger is!
			if (!this.currentAoI || (typeof isVisible === 'undefined') || !this.modelTerrainWithOverlay) {
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
				this.modelTerrainWithOverlay.addImageLayer(layer);
				this.context.addLayer('imagery', layer.id, layer);
				// console.log('[RectangularBoxView::onLayerChange] Added ' + model.get('name'));
			} else {
				this.modelTerrainWithOverlay.removeImageLayerById(model.get('view').id);
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
			this.context.updateLayerOpacity(desc.model.get('view').id, desc.value);

			// TODO: This is also possible, but...
			//var layer = this.context.getLayerById(desc.model.get('view').id, 'imagery');
			//this.context.trigger('change:layer:opacity', layer, desc.value);
		},

		didInsertElement: function() {
			this.listenTo(this.legacyContext(), 'selection:changed', this._setAreaOfInterest);
			this.listenTo(this.legacyContext(), 'time:change', this._onTimeChange);
			this.listenTo(this.legacyContext(), 'map:layer:change', this.onLayerChange);
			// this.listenTo(this.legacyContext(), "productCollection:sortUpdated", this.onSortUpdated);
			this.listenTo(this.legacyContext(), 'productCollection:updateOpacity', this._onUpdateOpacity);
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
					var starttime = new Date(this.legacyContext().timeOfInterest.start);
					var endtime = new Date(this.legacyContext().timeOfInterest.end);

					toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
				}

				var bounds = area.bounds;
				this.currentAoI = [bounds.left, bounds.bottom, bounds.right, bounds.top];

				this._createScene(this.options, {
					aoi: this.currentAoI,
					toi: toi
				});
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

		toi: function() {
			var toi = this.currentToI;
			// In case no ToI was set during the lifecycle of this viewer we can access
			// the time of interest from the global context:
			if (!toi) {
				var starttime = new Date(this.legacyContext().timeOfInterest.start);
				var endtime = new Date(this.legacyContext().timeOfInterest.end);

				toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
			}

			return toi;
		}
	});

	return RectangularBoxView;

}); // end module definition