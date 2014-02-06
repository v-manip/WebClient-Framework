define([
	'app',
	'./X3DOMView',
	'underscore',
	'jqueryui'
], function(App, X3DOMView, _) {

	'use strict';

	var BoxView = X3DOMView.extend({
		initialize: function(opts) {
			// Initialize parent upfront to have this.context() initialized:
			X3DOMView.prototype.initialize.call(this, opts);
			this.enableEmptyView(true); // this is the default

			this.isInitialized = false;

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

				resolution: [500, 500]
			};

			// Set a default AoI as the timeline can be changed even if no AoI is selected in the WebClient:
			this.currentAoI = [17.6726953125, 56.8705859375, 19.3865625, 58.12302734375];
			this.currentToI = null;

			// FIXXME: add to config.json and get it from there then!
			this.demProvider = new EarthServerGenericClient.WCSProvider({
				id: 'ACE2',
				urls: ['http://data.eox.at/elevation?'],
				crs: ['SRS', 'EPSG:4326'],
				outputCRS: 'http://www.opengis.net/def/crs/EPSG/0/4326',
				format: 'image/x-aaigrid',
				datatype: 'text'
			});

			this.imageryProvider = [];

			// Initially create the imagery provider based on the currently selected layers:
			var items = this.getModelsForSelectedLayers(this.supportsLayer);
			_.forEach(items, function(value, key) {
				this.imageryProvider.push(new EarthServerGenericClient.WMSProvider({
					id: value.model.get('view').id,
					urls: value.model.get('view').urls,
					crs: 'EPSG:4326',
					format: value.model.get('view').format.replace('image/', ''),
					transparent: 'true'
				}));
			}.bind(this));

			this.options = opts;
		},

		supportsLayer: function(model) {
			return (model.get('view').protocol === 'WMS') ? true : false;
		},

		// options: { name: 'xy', isBaseLayer: 'true/false', visible: 'true/false'}
		onLayerChange: function(model, isVisible) {
			if (isVisible) {
				this.imageryProvider.push(new EarthServerGenericClient.WMSProvider({
					id: model.get('view').id,
					urls: model.get('view').urls,
					crs: 'EPSG:4326',
					format: model.get('view').format.replace('image/', ''),
					transparent: 'true'
				}));

				if (this.currentAoI) {
					this._updateScene(_.extend(this.sceneDefaults, this.options, {
						wmsUrl: model.get('view').urls[0],
						wmsLayer: model.get('view').id
					}));
				}
				console.log('[RectangularBoxView::onLayerChange] selected ' + model.get('name'));
			} else {
				var item = _.find(this.imageryProvider, function(value, key) {
					return (value.id === model.get('view').id);
				})

				if (item) {
					var idx = _.indexOf(this.imageryProvider, item);
					this.imageryProvider.splice(idx, 1);
				}
				console.log('[RectangularBoxView::onLayerChange] deselected ' + model.get('name'));
			}
		},

		didInsertElement: function() {
			this.listenTo(this.context(), 'selection:changed', this._setAreaOfInterest);
			this.listenTo(this.context(), 'time:change', this._onTimeChange);
		},

		showEmptyView: function() {
			// FIXXME: use marionette's templating mechanism for that!
			this.$el.html('<div class="empty-view">Please select an Area of Interest (AoI) in one of the map viewer!</div>');
		},

		hideEmptyView: function() {
			// CAUTION: simply removing the content of the view's div can have sideeffects. Be cautious not
			// to accidently remove previousle created elements!
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

				this._updateScene(_.extend(this.sceneDefaults, this.options, {
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
				this._updateScene(_.extend(this.sceneDefaults, this.options, {
					aoi: this.currentAoI,
					toi: this.currentToI
				}));
			}
		},

		_updateScenelkjlkjlkj: function(opts) {
			this.enableEmptyView(false);
			this.onShow();

			EarthServerGenericClient.MainScene.resetScene();
			EarthServerGenericClient.MainScene.setTimeLog(opts.setTimeLog);
			EarthServerGenericClient.MainScene.addLightToScene(opts.addLightToScene);
			EarthServerGenericClient.MainScene.setBackground(opts.background[0], opts.background[1], opts.background[2], opts.background[3]);

			var scene = new EarthServerGenericClient.Model_DEMWithOverlays();
			scene.setDEMProvider(this.demProvider);
			for (var idx = 0; idx < this.imageryProvider.length; ++idx) {
				scene.addImageryProvider(this.imageryProvider[idx]);
			}
			var toi = this.currentToI;
			// In case no ToI was set during the lifecycle of this viewer we can access
			// the time of interest from the global context:
			if (!toi) {
				var starttime = new Date(this.context().timeOfInterest.start);
				var endtime = new Date(this.context().timeOfInterest.end);

				toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
			}
			scene.setTimespan(this.currentToI);
			scene.setBoundingBox(this.currentAoI[0], this.currentAoI[1], this.currentAoI[2], this.currentAoI[3]);

			scene.setResolution(500, 500);
			scene.setOffset(0, 0.2, 0);
			scene.setScale(1, 3, 1);

			scene.registerMIMETypeHandler('image/x-aaigrid', function(receivedData, responseData) {
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
			EarthServerGenericClient.MainScene.addModel(scene);

			// create the scene: Cube has 60% height compared to width and length
			// EarthServerGenericClient.MainScene.createScene('x3dScene', 'theScene', 1, 0.6, 1);
			// EarthServerGenericClient.MainScene.createScene('x3dScene', 'x3dScene', 1, 0.6, 1);
			// FIXXME: this was the only combination that worked, investigate API!
			EarthServerGenericClient.MainScene.createScene(opts.x3dscene_id, opts.x3dscene_id, 1, 0.8, 1);
			EarthServerGenericClient.MainScene.createAxisLabels("Latitude", "Height", "Longitude");
			// register a progressbar (you can register your own or just delete this lines)
			var pb = new EarthServerGenericClient.createProgressBar("progressbar");
			EarthServerGenericClient.MainScene.setProgressCallback(pb.updateValue);
			// create the UI
			EarthServerGenericClient.MainScene.createUI('x3domUI');
			// starts loading and creating the models
			// here the function starts as soon as the html page is fully loaded
			// you can map this function to e.g. a button
			EarthServerGenericClient.MainScene.createModels();
		},

		_updateScene: function(opts) {
			this.enableEmptyView(false);
			this.onShow();

			this.opts = opts;

			// basic setup:
			EarthServerGenericClient.MainScene.resetScene();
			EarthServerGenericClient.MainScene.setTimeLog(opts.setTimeLog);
			EarthServerGenericClient.MainScene.addLightToScene(opts.addLightToScene);
			// background of the render window
			//EarthServerGenericClient.MainScene.setBackground("0.8 0.8 0.95 0.4 0.5 0.85 0.3 0.5 0.85 0.31 0.52 0.85", "0.9 1.5 1.57", "0.8 0.8 0.95 0.4 0.5 0.85 0.3 0.5 0.85 0.31 0.52 0.85", "0.9 1.5 1.57");
			// EarthServerGenericClient.MainScene.setBackground("0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2", "0.9 1.5 1.57", "0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2 0.2", "0.9 1.5 1.57");
			EarthServerGenericClient.MainScene.setBackground(opts.background[0], opts.background[1], opts.background[2], opts.background[3]);

			// Onclick function example
			EarthServerGenericClient.MainScene.OnClickFunction = opts.onClickFunction;

			var scene = new EarthServerGenericClient.Model_WMSDemWMS();
			// scene.setURLs('http://neso.cryoland.enveo.at/cryoland/ows', 'http://data.eox.at/elevation?');
			scene.setURLs(opts.wmsUrl, opts.wcsUrl);
			// scene.setCoverages('daily_FSC_PanEuropean_Optical', 'ACE2');
			scene.setCoverages(opts.wmsLayer, opts.wcsLayer);
			// scene.setAreaOfInterest(-11.25, 22.5, 0, 33.75);
			scene.setTimespan(this.currentToI);
			scene.setBoundingBox(this.currentAoI[0], this.currentAoI[1], this.currentAoI[2], this.currentAoI[3]);
			scene.setResolution(500, 500);
			scene.setOutputCRS(opts.outputCRS);
			scene.setResolution(opts.resolution[0], opts.resolution[1]);
			// scene.setOffset(0, 0.2, 0);
			// scene.setScale(1, 3, 1);
			scene.setWMSVersion(opts.wmsVersion);
			scene.setWCSVersion(opts.wcsVersion);
			scene.setWCSMimeType(opts.wcsMimeType);
			scene.setWCSDataType(opts.wcsDataType);
			scene.setCoordinateReferenceSystem(opts.CRS[0], opts.CRS[1]);
			// This value will be considered as NODATA in the DEM. Vertices with that value will not be used and gaps are left.
			scene.setDemNoDataValue(0);
			// The user can set the height of the model manually to make sure multiple models have the same scaling.
			// Per default this value will be determined by the difference between the dems's min and max values.
			// scene.setHeightResolution(100);
			//scene.setSidePanels(true);

			scene.registerMIMETypeHandler('image/x-aaigrid', function(receivedData, responseData) {
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

			EarthServerGenericClient.MainScene.addModel(scene);

			// create the scene: Cube has 60% height compared to width and length
			// EarthServerGenericClient.MainScene.createScene('x3dScene', 'theScene', 1, 0.6, 1);
			// EarthServerGenericClient.MainScene.createScene('x3dScene', 'x3dScene', 1, 0.6, 1);
			// FIXXME: this was the only combination that worked, investigate API!
			EarthServerGenericClient.MainScene.createScene(opts.x3dscene_id, opts.x3dscene_id, 1, 0.8, 1);

			EarthServerGenericClient.MainScene.createAxisLabels("Latitude", "Height", "Longitude");

			// register a progressbar (you can register your own or just delete this lines)
			var pb = new EarthServerGenericClient.createProgressBar("progressbar");
			EarthServerGenericClient.MainScene.setProgressCallback(pb.updateValue);

			// create the UI
			EarthServerGenericClient.MainScene.createUI('x3domUI');
			// starts loading and creating the models
			// here the function starts as soon as the html page is fully loaded
			// you can map this function to e.g. a button
			EarthServerGenericClient.MainScene.createModels();
		}
	});

	return BoxView;

}); // end module definition