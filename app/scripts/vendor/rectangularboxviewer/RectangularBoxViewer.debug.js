var RBV = RBV || {};

// Helper function to correctly set up the prototype chain, for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
//
// Note: Copied verbatim from Backbone (www.backbonejs.org).
RBV.extend = function(protoProps, staticProps) {
	var parent = this;
	var child;

	// The constructor function for the new subclass is either defined by you
	// (the "constructor" property in your `extend` definition), or defaulted
	// by us to simply call the parent's constructor.
	if (protoProps && _.has(protoProps, 'constructor')) {
		child = protoProps.constructor;
	} else {
		child = function() {
			return parent.apply(this, arguments);
		};
	}

	// Add static properties to the constructor function, if supplied.
	_.extend(child, parent, staticProps);

	// Set the prototype chain to inherit from `parent`, without calling
	// `parent`'s constructor function.
	var Surrogate = function() {
		this.constructor = child;
	};
	Surrogate.prototype = parent.prototype;
	child.prototype = new Surrogate;

	// Add prototype properties (instance properties) to the subclass,
	// if supplied.
	if (protoProps) _.extend(child.prototype, protoProps);

	// Set a convenience property in case the parent's prototype is needed
	// later.
	child.__super__ = parent.prototype;

	return child;
};
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Nodes = RBV.Renderer.Nodes || {};

RBV.Renderer.Nodes.Base = function(options) {
	this.el = null;
	this.options = options || {}; // FIXXME: replace with some 'arguments' logic?

	if (!this.options.el) {
		if (this.tagName) {
			this.el = document.createElement(this.tagName);
		} else {
			this.el = document.createElement('Field');
		}
		// console.log('Created element "' + this.tagName + '"');
	} else {
		this.el = this.options.el;
	}

	if (_.isFunction(this.initialize)) {
		this.initialize.apply(this, arguments);
	}
}
RBV.Renderer.Nodes.Base.extend = RBV.extend;

/**
 * Removes all DOM data and recreates a new (empty) element.
 */
RBV.Renderer.Nodes.Base.prototype.removeFromDOM = function() {
	if (this.el.parentNode) {
		this.el.parentNode.removeChild(this.el);
	}
	RBV.Renderer.Nodes.Base.call(this, this.options);
}
var RBV = RBV || {};

/**
 * @class Context: Defines data and state for a model. Changes to the visualization
 * of a model are done solely via the context object.
 */
RBV.Context = function(opts) {
	// FIXXME: These will be removed after the transition to a refactored VMANIP framework.
	this.legacyContext = opts.mediator;
	this.legacyGlobals = opts.globals;

	this.toi = opts.toi || null;
	if (typeof opts.aoi !== 'undefined') {
		this.aoi = opts.aoi[0];
		this.aoi.push(opts.aoi[1]);
		this.aoi.push(opts.aoi[2]);
	} else {
		this.aoi = null;
	}

	this.layers = this.legacyCreateLayersFromGlobalContext();
};
_.extend(RBV.Context.prototype, Backbone.Events);

/**
 * For now the RBV.Context is only used in the RBV. The 'real context' is
 * still wired in the surrounding 'WebClient-Framework' code. This legacy
 * function sets upt the RBV.Context from the real context. After a full
 * transition to the new Context system this function will be obsolete.
 */
RBV.Context.prototype.legacyCreateLayersFromGlobalContext = function() {
	var layers = {};
	// Currently the global context only contains 'imagery' layers:
	layers['imagery'] = [];

	var model_descs = this.legacyGetModelDescsFromGlobalContext();
	_.forEach(model_descs, function(desc) {
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
				transparent: 'false',
				// FIXXME: '0' would be more intuitive, however, that goes against the necessary ordering in the TextureBlend effect
				ordinal: 10000, // A base layer is always the most bottom layer.
				opacity: 1,
				baselayer: true //model.get('opacity')
			});
		} else {
			layer = new VMANIP.Layers.WMS({
				id: model.get('view').id,
				urls: model.get('view').urls,
				crs: 'EPSG:4326',
				format: model.get('view').format.replace('image/', ''),
				transparent: 'true',
				ordinal: model.get('ordinal'),
				opacity: model.get('opacity'),
				baselayer: false
			});
		}
		layers['imagery'].push(layer);
	});

	return layers;
};

/**
 * Returns the model of the currently selected layers. If a 'filter' function is given it will be applied to check
 * if the model is compatible with the given filter.
 */
RBV.Context.prototype.legacyGetModelDescsFromGlobalContext = function(type, filter) {
	var models_desc = {};

	this.legacyGlobals.baseLayers.each(function(model) {
		if (typeof filter !== 'undefined') {
			if (filter(model)) {
				models_desc[model.get('name')] = {
					model: model,
					type: 'baselayer'
				};
				// console.log('[BaseView::setLayersFromAppContext] added baselayer "' + model.get('name') + '"');
			}
		} else {
			models_desc[model.get('name')] = {
				model: model,
				type: 'baselayer'
			};
		}
	});

	this.legacyGlobals.products.each(function(model) {
		if (typeof filter !== 'undefined') {
			if (filter(model)) {
				models_desc[model.get('name')] = {
					model: model,
					type: 'product'
				};
				// console.log('[BaseView::setLayersFromAppContext] added product "' + model.get('name') + '"');
			}
		} else {
			models_desc[model.get('name')] = {
				model: model,
				type: 'product'
			};
		}
	});

	this.legacyGlobals.overlays.each(function(model) {
		if (typeof filter !== 'undefined') {
			if (filter(model)) {
				models_desc[model.get('name')] = {
					model: model,
					type: 'overlay'
				};
				// console.log('[BaseView::setLayersFromAppContext] added overlay "' + model.get('name') + '"');
			}
		} else {
			models_desc[model.get('name')] = {
				model: model,
				type: 'overlay'
			};
		}
	});

	return models_desc;
}

RBV.Context.prototype.getAllLayers = function() {
	var layers = [];

	_.forEach(this.layers, function(group) {
		_.forEach(group, function(layer) {
			layers.push(layer);
		})
	});

	return layers;
}

RBV.Context.prototype.updateLayerOpacity = function(id, value) {
	var layer = this.getLayerById(id, 'imagery');
	layer.set('opacity', value);
}

RBV.Context.prototype.reset = function() {
	this.layers = {};
};

RBV.Context.prototype.setToI = function(timespan) {
	this.toi = timespan;
};

RBV.Context.prototype.setAoI = function(bbox, min_height, max_height) {
	this.aoi = bbox;
	this.aoi.push(min_height, max_height);
};

RBV.Context.prototype.addLayer = function(type, id, layer) {
	if (!this.layers[type]) {
		this.layers[type] = [];
	}
	this.layers[type].push(layer);
};

RBV.Context.prototype.getLayerById = function(id, type) {
	if (!this.layers[type]) {
		return null;
	}

	for (var idx = 0; idx < this.layers[type].length; idx++) {
		if (this.layers[type][idx].id === id) {
			return this.layers[type][idx];
		}
	};

	return null;
};

RBV.Context.prototype.getLayersByType = function(type) {
	if (!this.layers[type]) {
		return [];
	}

	return this.layers[type];
};

/**
 * Returns the model of the currently selected layers. If a 'filter' function is given it will be applied to check
 * if the model is compatible with the given filter.
 */
RBV.Context.prototype.getSelectedLayersByType = function(type, filter) {
	var models_desc = {};

	this.legacyGlobals.baseLayers.each(function(model) {
		if (model.get('visible')) {
			if (typeof filter !== 'undefined') {
				if (filter(model)) {
					models_desc[model.get('name')] = {
						model: model,
						type: 'baselayer'
					};
					// console.log('[BaseView::setLayersFromAppContext] added baselayer "' + model.get('name') + '"');
				}
			} else {
				models_desc[model.get('name')] = {
					model: model,
					type: 'baselayer'
				};
			}
		}
	});

	this.legacyGlobals.products.each(function(model) {
		if (model.get('visible')) {
			if (typeof filter !== 'undefined') {
				if (filter(model)) {
					models_desc[model.get('name')] = {
						model: model,
						type: 'product'
					};
					// console.log('[BaseView::setLayersFromAppContext] added product "' + model.get('name') + '"');
				}
			} else {
				models_desc[model.get('name')] = {
					model: model,
					type: 'product'
				};
			}
		}
	});

	this.legacyGlobals.overlays.each(function(model) {
		if (model.get('visible')) {
			if (typeof filter !== 'undefined') {
				if (filter(model)) {
					models_desc[model.get('name')] = {
						model: model,
						type: 'overlay'
					};
					// console.log('[BaseView::setLayersFromAppContext] added overlay "' + model.get('name') + '"');
				}
			} else {
				models_desc[model.get('name')] = {
					model: model,
					type: 'overlay'
				};
			}
		}
	});

	var selectedLayers = [];

	_.forEach(models_desc, function(desc) {
		var layer = this.getLayerById(desc.model.get('view').id, 'imagery');
		console.log('added: ' + layer.get('id'));
		selectedLayers.push(layer);
	}.bind(this));

	return selectedLayers;
}
/**
 * @class Runtime: Manages multiple EarthServerClient-based models. It's main responsibility
 * is to select a model to be shown.
 */
RBV.Runtime = function(opts) {

};
var RBV = RBV || {};

/**
 * @class Scene: The 'Scene' object is a 'wrapper' around a RBV.Runtime that provides a
 * predefined set of EarthServerClient models, which can be selected via the
 * Scene's API.
 *
 * RBV.Provider objects can be added to the Scene. Depending on the displayed Model one
 * ore more providers are selected to provide the data base for the model.
 *
 * Application which need direct control over runtimes can directly use
 * the RBV.Runtime objects and manage them to their liking.
 */
RBV.Scene = function(opts) {
	this.defaultOptions = {
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

	this.options = {};
	_.extend(this.options, this.defaultOptions, opts);

	// There is one context for all Models at the moment (for simplicity):
	this.context = opts.context || null;

	this._setupEarthServerGenericClient(opts);
};

// FIXXME: Currently the model needs to know if a Provider has a custom
// mimetype handler attached. This is due to the slightly "clumpsy" way
// the EarthServerGenericClient library is handling data requests.
// Adding a provider or request based abstraction to the EarthServerGenericClient
// would solve the problem, as then the abstraction layer takes care of the
// mimetype handling, not the model itself.
RBV.Scene.prototype.addModel = function(model) {
	model.applyContext(this.context);

	_.forEach(this.context.getAllLayers(), function(layer) {
		var mimeTypeHandlers = layer.getMimeTypeHandlers();
		for (var key in mimeTypeHandlers) {
			if (mimeTypeHandlers.hasOwnProperty(key)) {
				model.registerMIMETypeHandler(key, mimeTypeHandlers[key]);
			}
		}
	});
	EarthServerGenericClient.MainScene.addModel(model);

	this.model = model;
};

RBV.Scene.prototype.show = function() {
	this.model.setAreaOfInterest(this.context.aoi[0], this.context.aoi[1], this.context.aoi[2], this.context.aoi[3], this.context.aoi[4], this.context.aoi[5]);
	this.model.setTimespan(this.context.toi);
	// this.model.setOffset(0, 0.2, 0);
	// this.model.setScale(1, 3, 1);

	// create the viewer: Cube has 60% height compared to width and length
	// EarthServerGenericClient.MainScene.createScene('x3dScene', 'theScene', 1, 0.6, 1);
	// EarthServerGenericClient.MainScene.createScene('x3dScene', 'x3dScene', 1, 0.6, 1);
	// FIXXME: this was the only combination that worked, investigate API!
	EarthServerGenericClient.MainScene.createScene(this.options.x3dscene_id, this.options.x3dscene_id, 1, 0.8, 1);
	EarthServerGenericClient.MainScene.createAxisLabels("Latitude", "Height", "Longitude");
	var pb = new EarthServerGenericClient.createProgressBar("progressbar");
	EarthServerGenericClient.MainScene.setProgressCallback(pb.updateValue);
	EarthServerGenericClient.MainScene.createUI('x3domUI');
	EarthServerGenericClient.MainScene.createModels();
};

RBV.Scene.prototype.setContext = function(context) {
	this.context = context;
};

/**
 * Registers a handler for a specific format for preprocessing data received
 * by a data request. An eventual registered handler with the same mimetype
 * will be overwritten.
 *
 * @param mimetype - MIME type name (i.e. 'image/x-aaigrid')
 */
RBV.Scene.prototype.registerMIMETypeHandler = function(mimetype, handler) {
	this.mimeTypeHandlers[mimetype, handler];
	// FIXXME: has to be delegated to a Model!
};

RBV.Scene.prototype._setupEarthServerGenericClient = function() {
	EarthServerGenericClient.MainScene.resetScene();
	EarthServerGenericClient.MainScene.setTimeLog(this.options.setTimeLog);
	EarthServerGenericClient.MainScene.addLightToScene(this.options.addLightToScene);
	EarthServerGenericClient.MainScene.setBackground(this.options.background[0], this.options.background[1], this.options.background[2], this.options.background[3]);
};
RBV.Models = RBV.Models || {};

"use strict";

/**
 * @class Scene Model: WMS Image with DEM from WCS Query
 * 2 URLs for the service, 2 Coverage names for the image and dem.
 * @augments EarthServerGenericClient.AbstractSceneModel
 */
RBV.Models.DemWithOverlays = function() {
    this.setDefaults();
    this.id = "LODTerrainWithOverlays";
    this.isReset = true;

    this.context = null;
    this.terrainLayer = null;
    this.imageryLayers = [];

    this.terrain = null;
};
RBV.Models.DemWithOverlays.inheritsFrom(EarthServerGenericClient.AbstractSceneModel);

RBV.Models.DemWithOverlays.prototype.supportsLayer = function(model) {
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
}

RBV.Models.DemWithOverlays.prototype.applyContext = function(context) {
    this.reset();

    this.context = context;

    var terrainLayers = this.context.getLayersByType('terrain');
    if (!terrainLayers.length) {
        throw "[RBV.Models.DemWithOverlays] Context has no 'terrain' layer. Aborting!";
    }
    // Take the first available terrain layer:
    this.terrainLayer = terrainLayers[0];
    this.imageryLayers = this.context.getSelectedLayersByType('imagery', this.supportsLayer);

    //Register to context relevant changes: 
    _.forEach(this.imageryLayers, function(layer) {
        layer.on('change:opacity', this.onOpacityChange, this);
    }.bind(this));

    // TODO: Listening on all layers is also possible, but not so efficient, I guess:
    // this.context.on('change:layer:opacity', function(layer, opacity) {
    //     console.log('visibility: ' + layer.get('id'));
    //     console.log('visibility: ' + opacity);
    // });

    this.context.on('change:layer:visibility', function(layer, visibility) {
        this.addImageLayer(layer);
    }.bind(this));
}

RBV.Models.DemWithOverlays.prototype.reset = function() {
    // Remove context change handler:
    _.forEach(this.imageryLayers, function(layer) {
        layer.off('change:opacity', this.onOpacityChange);
        layer.set('isUpToDate', false);
    }.bind(this));

    if (this.terrainLayer) {
        this.terrainLayer.set('isUpToDate', false);
    }
    this.terrainLayer = null;
    this.imageryLayers = [];

    if (this.terrain) {
        this.terrain.reset(); // removes pending callbacks in the EarthServerGenericClient runtime
        this.terrain = null;
    }

    // FIXXME: this removes ALL models, which is not what we want...
    // FIXXME: resetScene() internally also does a cleanup for this.terrain. Take this into account!
    EarthServerGenericClient.MainScene.resetScene();
    this.setDefaults();
    this.isReset = true;
}

RBV.Models.DemWithOverlays.prototype.onOpacityChange = function(layer, value) {
    this.terrain.setTransparencyFor(layer.get('id'), (1 - value));
};

/**
 * Sets the terrain layer.
 * @param layer - VMANIP.Layer object
 * @see Layer
 */
RBV.Models.DemWithOverlays.prototype.addTerrainLayer = function(layer) {
    this.terrainLayer = layer;
};

/**
 * Adds an imagery request.
 * @param request - Configured Layer object
 * @see Layer
 */
RBV.Models.DemWithOverlays.prototype.addImageLayer = function(layer) {
    this.imageryLayers.push(layer);

    // Connect to transparency change events:
    layer.on('change:opacity', function(layer, value) {
        this.terrain.setTransparencyFor(layer.get('id'), (1 - value));
    }.bind(this));

    if (this.terrain) {
        this.requestData();
    }
};

RBV.Models.DemWithOverlays.prototype.removeImageLayerById = function(id) {
    var layer = _.find(this.imageryLayers, function(item) {
        return id === item.get('id');
    });

    if (layer) {
        layer.off('change:opacity', this.onOpacityChange);
        var idx = _.indexOf(this.imageryLayers, layer);
        this.imageryLayers.splice(idx, 1);
    } else {
        console.error('[RBV.Models.DemWithOverlays::removeImageLayerById] Layer "' + id + '" not found!');
    }

    if (this.terrain) {
        this.terrain.removeOverlayById(id);

    }
};

/**
 * Sets the timespan for the request
 * @param timespan - eg. '2013-06-05T00:00:00Z/2013-06-08T00:00:00Z'
 */
RBV.Models.DemWithOverlays.prototype.setTimespan = function(timespan) {
    this.timespan = timespan;
};

RBV.Models.DemWithOverlays.prototype.update = function(hasNewData) {
    // No update is needed, as the terrain is not created yet. The pending updates
    // will be implicitly applied when creating the terrain in 'createModel'.
    if (!this.terrain) {
        return;
    }

    if (hasNewData) {
        this.requestData();
    } else { // If a layer was removed simply update the shader:
        this.updateShader();
    }
}

/**
 * Creates the x3d geometry and appends it to the given root node. This is done automatically by the SceneManager.
 * @param root - X3D node to append the model.
 * @param cubeSizeX - Size of the fishtank/cube on the x-axis.
 * @param cubeSizeY - Size of the fishtank/cube on the y-axis.
 * @param cubeSizeZ - Size of the fishtank/cube on the z-axis.
 */
RBV.Models.DemWithOverlays.prototype.createModel = function(root, cubeSizeX, cubeSizeY, cubeSizeZ) {
    this.isReset = false;

    if (typeof root === 'undefined') {
        throw Error('[Model_DEMWithOverlays::createModel] root is not defined')
    }

    EarthServerGenericClient.MainScene.timeLogStart("Create Model_DEMWithOverlays " + this.id);

    this.cubeSizeX = cubeSizeX;
    this.cubeSizeY = cubeSizeY;
    this.cubeSizeZ = cubeSizeZ;

    this.bbox = {
        minLongitude: this.miny,
        maxLongitude: this.maxy,
        minLatitude: this.minx,
        maxLatitude: this.maxx
    };

    this.root = root;

    this.createPlaceHolder();
    this.requestData();
};

/**
 * Layers data based on the available layers and calls 'receiveData' afterwards with the ServerResponses.
 * The internal logic only requests data that has to be updated.
 */
RBV.Models.DemWithOverlays.prototype.requestData = function() {
    // First find out which data has to be requested:

    // Convert the original Backbone.Model layers to 'plain-old-data' javascript objects:
    var layerRequests = [];
    _.each(this.imageryLayers, function(layer, idx) {
        if (!layer.get('isUpToDate')) {
            layer.set('isUpToDate', true);
            layerRequests.push(layer.toJSON());
        }
    });

    if (!this.terrainLayer.get('isUpToDate')) {
        this.terrainLayer.set('isUpToDate', true);
        layerRequests.push(this.terrainLayer.toJSON());
    };

    if (layerRequests.length) {
        EarthServerGenericClient.sendRequests(this, layerRequests, {
            bbox: this.bbox,
            timespan: this.timespan,
            resX: this.XResolution,
            resZ: this.ZResolution
        });
    }
};

RBV.Models.DemWithOverlays.prototype.receiveData = function(serverResponses) {
    // In case the model was resetted after a request was send which did not resolve yet,
    // the incoming request is skipped here:
    if (this.isReset) {
        return;
    }

    if (this.checkReceivedData(serverResponses)) {
        var initialSetup = false;
        if (!this.terrain) {
            initialSetup = true;
        }

        if (initialSetup) {
            this.removePlaceHolder();

            EarthServerGenericClient.MainScene.timeLogStart("Update Terrain " + this.id);

            // FIXXME: I want to get rid of the ServerResponse object and replace it with a VMANIP.Layer.
            // The Layer is the natural place to request data and store it in an appropriate way.
            // Currently there is mixture of VMANIP.Layers and EarthServer.ServerResponses, where also
            // my naming is not consistent everywhere. Keep that in mind if you struggle with the types,
            // but things will improve soon ;-)
            var layers = this.createLayersFromServerResponses(serverResponses);

            var transform = this.createTransformInScene(layers.terrain);
            this.root.appendChild(transform);

            this.terrain = new RBV.Renderer.Components.LODTerrainWithOverlays({
                id: this.id,
                root: transform,
                terrainLayer: layers.terrain,
                imageryLayers: layers.images,
                index: this.index,
                noDataValue: this.noData,
                demNoDataValue: this.demNoData,
            });
            this.terrain.createTerrain();

            EarthServerGenericClient.MainScene.timeLogEnd("Update Terrain " + this.id);

            // this.elevationUpdateBinding();
            // if (this.sidePanels) {
            //     this.terrain.createSidePanels(this.transformNode, 1);
            // }
            // EarthServerGenericClient.MainScene.timeLogEnd("Create Model_DEMWithOverlays " + this.id);
        } else {
            this.terrain.addOverlays(serverResponses);
        }
    }
};

RBV.Models.DemWithOverlays.prototype.createLayersFromServerResponses = function(serverResponses) {
    // Distinguish between 'imagery' and 'dem' ServerResponses in the serverResponses
    // FIXXME: This is clumsy...
    var terrainLayer = null;
    var imageryLayers = [];
    var lastidx = -1;
    for (var idx = 0; idx < serverResponses.length; ++idx) {
        var response = serverResponses[idx];
        if (response.heightmap) {
            terrainLayer = response;
        } else {
            imageryLayers.push(response);
            // console.log('[RBV.Models.DemWithOverlays::receiveData] received layer: ' + response.layerInfo.id+ ' / ordinal: ' + response.layerInfo.ordinal);
        }
    }

    return {
        terrain: terrainLayer,
        images: imageryLayers
    };
}

RBV.Models.DemWithOverlays.prototype.createTransformInScene = function(terrainLayer) {
    var YResolution = this.YResolution || (parseFloat(terrainLayer.maxHMvalue) - parseFloat(terrainLayer.minHMvalue));
    var boxTransform = this.createTransform(terrainLayer.width, YResolution, terrainLayer.height, parseFloat(terrainLayer.minHMvalue), terrainLayer.minXvalue, terrainLayer.minZvalue);

    return boxTransform;
};

/**
 * Validates the received data from the server request.
 */
RBV.Models.DemWithOverlays.prototype.checkReceivedData = function(serverResponses) {
    for (var idx = 0; idx < serverResponses.length; ++idx) {
        var data = serverResponses[idx];
        this.receivedDataCount++;
        this.reportProgress();

        // No texture whished?
        if (this.colorOnly && data !== null && data !== undefined) {
            data.validateTexture = false; // disable check for texture
            data.texture = undefined;
        }

        // if (data === null || !data.validate()) {
        //     alert(this.id + ": Layer not successful.");
        //     console.log(data);
        //     this.reportProgress(); //NO Terrain will be built so report the progress here
        //     this.removePlaceHolder(); //Remove the placeHolder.

        //     //delete UI elements
        //     var header = document.getElementById("EarthServerGenericClient_ModelHeader_" + this.index);
        //     var div = document.getElementById("EarthServerGenericClient_ModelDiv_" + this.index);

        //     if (header && div) {
        //         var parent = div.parentNode;

        //         if (parent) {
        //             parent.removeChild(div);
        //             parent.removeChild(header);
        //         }
        //     }
        //     return false;
        // }

        // add module specific values
        data.transparency = this.transparency;
        data.specularColor = this.specularColor || EarthServerGenericClient.MainScene.getDefaultSpecularColor();
        data.diffuseColor = this.diffuseColor || EarthServerGenericClient.MainScene.getDefaultDiffuseColor();
    }

    return true;
};

/**
 * Every Scene Model creates it's own specific UI elements. This function is called automatically by the SceneManager.
 * @param element - The element where to append the specific UI elements for this model.
 */
RBV.Models.DemWithOverlays.prototype.setSpecificElement = function(element) {
    EarthServerGenericClient.appendElevationSlider(element, this.index);
};
RBV.Renderer.Components = RBV.Renderer.Components || {};

/**
 * @class This terrain builds up a LOD with 3 levels of the received data.
 * @param root - Dom Element to append the terrain to.
 * @param data - Received Data of the Server request.
 * @param index - Index of the model that uses this terrain.
 * @param noDataValue - Array with the RGB values to be considered as no data available and shall be drawn transparent.
 * @param noDemValue - The single value in the DEM that should be considered as NODATA
 * @augments EarthServerGenericClient.AbstractTerrain
 * @constructor
 */
// root, data, index, noDataValue, noDemValue
RBV.Renderer.Components.LODTerrainWithOverlays = function(opts) {
    this.data = opts.terrainLayer;
    this.index = opts.index;
    this.noData = opts.noDataValue;
    this.noDemValue = opts.noDemValue;
    this.root = opts.root;
    this.name = opts.id + this.index;

    this.textureDescs = this.extractTextureDesc(opts.imageryLayers);

    /**
     * Distance to change between full and 1/2 resolution.
     * @type {number}
     */
    var lodRange1 = 5000;
    /**
     * Distance to change between 1/2 and 1/4 resolution.
     * @type {number}
     */
    var lodRange2 = 17000;

    /**
     * Size of one chunk. Chunks at the borders can be smaller.
     * We want to build 3 chunks for the LOD with different resolution but the same size on the screen.
     * With 121 values the length of the most detailed chunk is 120.
     * The second chunk has 61 values and the length of 60. With a scale of 2 it's back to the size of 120.
     * The third chunk has 31 values and the length if 30. With a scale of 4 it's also back to the size 120.
     * @type {number}
     */
    var chunkSize = 121;
    /**
     * General information about the number of chunks needed to build the terrain.
     * @type {number}
     */
    var chunkInfo = this.calcNumberOfChunks(this.data.width, this.data.height, chunkSize);

    /**
     * Counter for the insertion of chunks.
     * @type {number}
     */
    var currentChunk = 0;

    /**
     * Builds the terrain and appends it into the scene.
     */
    this.createTerrain = function() {
        for (currentChunk = 0; currentChunk < chunkInfo.numChunks; currentChunk++) {
            EarthServerGenericClient.MainScene.enterCallbackForNextFrame(this.index);
        }
        currentChunk = 0;

        if (!this.textureBlendEffect) {

            this.textureBlendEffect = new RBV.Renderer.Effects.TextureBlend({
                id: this.name,
                transparency: this.data.transparency,
                material: {
                    specular: this.data.specularColor,
                    diffuse: this.data.diffuseColor,
                    transparency: this.data.transparency
                },
                upright: false
            });

            for (var idx = 0; idx < this.textureDescs.length; idx++) {
                var desc = this.textureDescs[idx];
                this.textureBlendEffect.addTextureFromDesc(desc);
            };
            this.textureBlendEffect.commitChanges();
        }

        EarthServerGenericClient.MainScene.reportProgress(this.index);
    };

    /**
     * The Scene Manager calls this function after a few frames since the last insertion of a chunk.
     */
    this.nextFrame = function() {
        //Build all necessary information and values to create a chunk
        var info = this.createChunkInfo(this.index, chunkSize, chunkInfo, currentChunk, this.data.width, this.data.height);
        var hm = this.getHeightMap(info);

        var transform = document.createElement('Transform');
        transform.setAttribute('translation', info.xpos + ' 0 ' + info.ypos);
        transform.setAttribute('scale', '1.0 1.0 1.0');

        var lodNode = document.createElement('LOD');
        lodNode.setAttribute('Range', lodRange1 + ',' + lodRange2);
        lodNode.setAttribute('id', 'lod' + info.ID);

        var appearances = [this.textureBlendEffect.appearance().el];
        if (this.noDataValue !== undefined || this.noDemValue != undefined) {
            new GapGrid(lodNode, info, hm, appearances, this.noDemValue);
        } else {
            new ElevationGrid(lodNode, info, hm, appearances);
        }

        transform.appendChild(lodNode);
        this.root.appendChild(transform);

        currentChunk++;
    };
};
RBV.Renderer.Components.LODTerrainWithOverlays.inheritsFrom(EarthServerGenericClient.AbstractTerrain);

RBV.Renderer.Components.LODTerrainWithOverlays.prototype.reset = function() {
    EarthServerGenericClient.MainScene.removeModelCallbacks(this.index);
};

RBV.Renderer.Components.LODTerrainWithOverlays.prototype.addOverlays = function(serverResponses) {
    this.textureDescs = this.textureDescs.concat(this.extractTextureDesc(serverResponses));
    this.updateEffect();
};

RBV.Renderer.Components.LODTerrainWithOverlays.prototype.removeOverlayById = function(id) {
    var textureDescription = _.find(this.textureDescs, function(desc) {
        return desc.id === id;
    });

    if (!textureDescription) {
        return;
    }

    this.textureDescs = _.without(this.textureDescs, textureDescription);
    this.updateEffect();
};

RBV.Renderer.Components.LODTerrainWithOverlays.prototype.updateEffect = function() {
    // NOTE: When adding an overlay the best way is to completely reset the blend effect
    // and add _all_ textures again. This has the advantage that opacity changes of existing
    // overlays are incorporated. Otherwise the update in the underlying shader code causes
    // existing layers to be reset to their initial opacity.
    // The opacity tracking mechanism for existing overlays is implemented in the
    // 'setTransparencyFor' function.
    this.textureBlendEffect.reset();
    for (var idx = 0; idx < this.textureDescs.length; idx++) {
        var desc = this.textureDescs[idx];
        this.textureBlendEffect.addTextureFromDesc(desc);
    };
    this.textureBlendEffect.commitChanges();
};

/**
 * Overwrites function from base terrain class. Sets the transparency in the shader.
 * @param value - Transparency value between 0 (full visible) and 1 (invisible).
 */
RBV.Renderer.Components.LODTerrainWithOverlays.prototype.setTransparencyFor = function(texture_id, value) {
    var transparencyFieldId = this.name + '_transparency_for_' + texture_id;
    var transparencyFN = document.getElementById(transparencyFieldId);

    if (transparencyFN) {
        transparencyFN.setAttribute('value', String(1.0 - value));
        var textureDesc = _.find(this.textureDescs, function(desc) {
            return desc.id === texture_id;
        });
        if (textureDesc) {
            textureDesc.opacity = 1.0 - value;
        } else {
            console.error('[LODTerrainWithOverlays::setTransparencyFor] cannot find textureResponse "' + texture_id + '". This should not happen!');
        }
    } else {
        console.log('RBV.Renderer.Components.LODTerrainWithOverlays: Cannot find transparency field: ' + transparencyFieldId);
    }
};

RBV.Renderer.Components.LODTerrainWithOverlays.prototype.extractTextureDesc = function(layers) {
    var texture_descriptions = [];
    for (var idx = 0; idx < layers.length; idx++) {
        var textureData = layers[idx].texture;
        var textureEl = this.createCanvas(textureData, this.index, this.noDataValue, false);

        texture_descriptions.push({
            id: layers[idx].layerInfo.id,
            opacity: layers[idx].layerInfo.opacity,
            ordinal: layers[idx].layerInfo.ordinal,
            textureEl: textureEl
        });
    };

    return texture_descriptions;
};
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Effects = RBV.Renderer.Effects || {};

RBV.Renderer.Effects.TextureBlend = function(opts) {
	this._appearanceN = null;
	this._materialN = null;
	this._shaderN = null;
	this._multiTextureN = null;
	this._textureDescs = [];

	this._id = opts.id || 'Effect::TextureBlend';

	this._options = opts;

	this._setup();
}

RBV.Renderer.Effects.TextureBlend.prototype._setup = function() {
	this._appearanceN = new RBV.Renderer.Nodes.Appearance({
		id: this._id,
		transparency: this._options.transparency
	});
	// FIXXME: currently the appearance is added to all X3D scenes
	// in the page so that it can be 'used'. Make this configurable!
	var x3d_scenes = document.getElementsByTagName('scene');
	for (var idx = 0; idx < x3d_scenes.length; idx++) {
		var scene = x3d_scenes[idx];
		scene.appendChild(this._appearanceN.el);
	};

	// this._materialN = new RBV.Renderer.Nodes.Material({
	// 	specularColor: this._options.material.specular,
	// 	diffuseColor: this._options.material.diffuse,
	// 	transparency: this._options.material.transparency
	// });
	// this._appearanceN.appendChild(this._materialN);

	this._multiTextureN = new RBV.Renderer.Nodes.MultiTexture();
	this._appearanceN.appendMultiTexture(this._multiTextureN);

	this._shaderN = new RBV.Renderer.Nodes.Shader();
};

RBV.Renderer.Effects.TextureBlend.prototype.reset = function(desc) {
	this._textureDescs = [];
	// The appearance internally resets this._shaderN and this._multiTextureN
	// as a 'sideeffect':
	this._appearanceN.reset();
};

RBV.Renderer.Effects.TextureBlend.prototype.addTextureFromDesc = function(desc) {
	// FIXXME: integrate desc.transform, to be able to cleanup when removing a texture!
	this._textureDescs.push({
		id: desc.id,
		textureEl: desc.textureEl,
		opacity: desc.opacity,
		ordinal: desc.ordinal,
		transform: desc.transform
	});
};

RBV.Renderer.Effects.TextureBlend.prototype.commitChanges = function() {
	this._textureDescs = _.sortBy(this._textureDescs, function(desc) {
		return desc.ordinal
	});
	// this._textureDescs.reverse();

	this._updateMultiTextureNode();
	this._updateShaderNode();

	console.log('[RBV.Renderer.Effects.TextureBlend.TextureBlend] Texturestack:');
	_.forEach(this._textureDescs, function(desc, idx) {
		console.log('  * ordinal: ' + desc.ordinal + ' / id: ' + desc.id);
	})
};

RBV.Renderer.Effects.TextureBlend.prototype.appearance = function() {
	return new RBV.Renderer.Nodes.Appearance({
		use: this._id,
		transparency: this._options.transparency
	});
};

RBV.Renderer.Effects.TextureBlend.prototype.id = function() {
	return this._id;
};

RBV.Renderer.Effects.TextureBlend.prototype._updateMultiTextureNode = function() {
	// FIXXME: rethink sideeffects regarding removeFromDOM/appendMultiTexture/replaceMultiTexture!
	// For now it is working and properly encapsulated...
	this._multiTextureN.removeFromDOM();
	for (var idx = 0; idx < this._textureDescs.length; idx++) {
		var desc = this._textureDescs[idx];

		// FIXXME: 'texture' parameter should support type RBV.Renderer.Nodes.Texture for consistency!
		this._multiTextureN.addTexture(new RBV.Renderer.Nodes.Texture({
			hideChildren: false,
			repeatS: true,
			repeatT: true,
			canvasEl: desc.textureEl
		}), desc.transform);
	};

	this._appearanceN.appendMultiTexture(this._multiTextureN);
}

RBV.Renderer.Effects.TextureBlend.prototype._updateShaderNode = function() {
	// FIXXME: rethink sideeffects regarding removeFromDOM/appendShader/replaceShader!
	// For now it is working and properly encapsulated...
	this._shaderN.removeFromDOM();
	this._shaderN.setVertexCode(this._createVertexShaderCode());
	this._shaderN.setFragmentCode(this._createFragmentShaderCode());

	for (var idx = 0; idx < this._textureDescs.length; idx++) {
		var desc = this._textureDescs[idx];

		this._shaderN.addUniform({
			id: this._id + '_transparency_for_' + desc.id,
			name: 'transparency_' + desc.id,
			type: 'SFFloat',
			value: desc.opacity
		});

		this._shaderN.addUniform({
			id: this._id + '_texture_for_' + desc.id,
			name: 'tex_' + desc.id,
			type: 'SFFloat',
			value: idx
		});
	}

	this._appearanceN.appendShader(this._shaderN);
}

RBV.Renderer.Effects.TextureBlend.prototype._createVertexShaderCode = function() {
	var vertexCode = 'attribute vec3 position; \n';
	vertexCode += 'attribute vec3 texcoord; \n';
	vertexCode += 'uniform mat4 modelViewProjectionMatrix; \n';
	vertexCode += 'varying vec2 fragTexCoord; \n';
	vertexCode += 'void main() { \n';
	vertexCode += 'fragTexCoord = vec2(texcoord.x, 1.0 - texcoord.y);\n';
	vertexCode += 'gl_Position = modelViewProjectionMatrix * vec4(position, 1.0); }\n';

	return vertexCode;
};

RBV.Renderer.Effects.TextureBlend.prototype._createFragmentShaderCode = function() {
	var fragmentCode = '#ifdef GL_ES \n';
	fragmentCode += 'precision highp float; \n';
	fragmentCode += '#endif \n';
	fragmentCode += 'varying vec2 fragTexCoord; \n';
	for (var idx = 0; idx < this._textureDescs.length; idx++) {
		var desc = this._textureDescs[idx];
		fragmentCode += 'uniform float transparency_' + desc.id + '; \n';
		fragmentCode += 'uniform sampler2D tex_' + desc.id + '; \n';
	}

	// Blending equation:
	// (see http://en.wikibooks.org/wiki/GLSL_Programming/Unity/Transparency)
	//
	// TODO: Think of integrating http://mouaif.wordpress.com/?p=94
	//
	// vec4 result = SrcFactor * colorOnTop + DstFactor * colorBelow;
	//
	// To implement a special blending mode, SrcFactor and DstFactor have to
	// be chosen correctly:
	//
	// * Alpha blending:
	// -----------------
	//
	//   SrcFactor = SrcAlpha = vec4(gl_FragColor.a)
	//   DstFactor = OneMinusSrcAlpha = vec4(1.0 - gl_FragColor.a)
	//
	// Corresponding GLSL code:
	fragmentCode += 'vec4 alphaBlend(vec4 colorOnTop, vec4 colorBelow) {        \n';
	fragmentCode += '  vec4 srcFac = vec4(colorOnTop.a);                        \n';
	fragmentCode += '  vec4 dstFac = vec4(1.0 - colorOnTop.a);                  \n';
	fragmentCode += '                                                           \n';
	fragmentCode += '  vec4 result = srcFac * colorOnTop + dstFac * colorBelow; \n';
	fragmentCode += '  return result;                                           \n';
	fragmentCode += '}                                                          \n';

	fragmentCode += 'void main() { \n';
	for (var idx = 0; idx < this._textureDescs.length; idx++) {
		var desc = this._textureDescs[idx];
		fragmentCode += '  vec4 color' + idx + ' = texture2D(tex_' + desc.id + ', fragTexCoord); \n';
		fragmentCode += '  color' + idx + ' = color' + idx + ' * transparency_' + desc.id + '; \n';
		if (idx == 0) {
			fragmentCode += '  vec4 colorOnTop = color0; \n';
		} else {
			fragmentCode += '  colorOnTop = alphaBlend(colorOnTop, color' + idx + '); \n';
		}
	}
	fragmentCode += '  gl_FragColor = colorOnTop; \n';
	// fragmentCode += '  gl_FragColor = vec4(0,0,1.0,1); \n';
	fragmentCode += '} \n';

	console.log('fragmentCode:\n' + fragmentCode);

	return fragmentCode;
};
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Nodes = RBV.Renderer.Nodes || {};

RBV.Renderer.Nodes.Appearance = RBV.Renderer.Nodes.Base.extend({
	tagName: 'Appearance',

	initialize: function(opts) {
		if (opts.transparency === 0) {
			this.el.setAttribute('sortType', 'opaque');
		} else {
			this.el.setAttribute('sortType', 'transparent');
		}

		if (opts.use) {
			this.el.setAttribute("use", opts.use);

		} else {
			this.el.setAttribute("id", opts.id);
			this.el.setAttribute("def", opts.id);
		}

		this.shaderN = null;
		this.nodes = {};

		// FIXXME: integrate automatic def/use mechanism
		// this.el.setAttribute("id", this.appearancesN[opts.name]);
		// this.el.setAttribute("def", this.appearancesN[opts.name]);
	},

	appendChild: function(node) {
		this.nodes[node.tagName] = node;
		this.el.appendChild(node.el);
	},

	appendMultiTexture: function(node) {
		this.multiTextureN = node;
		this.el.appendChild(node.el);
	},

	appendShader: function(node) {
		this.shaderN = node;
		this.el.appendChild(node.el);
	},

	replaceMultiTexture: function(node) {
		this.el.removeChild(this.multiTextureN.el);
		this.multiTextureN = node;
		this.el.appendChild(this.multiTextureN.el);
	},

	replaceShader: function(node) {
		if (this.shaderN) {
			this.el.removeChild(this.shaderN.el);
		}
		this.shaderN = node;
		this.el.appendChild(this.shaderN.el);
	},

	reset: function() {
		this.shaderN.removeFromDOM();
		this.multiTextureN.removeFromDOM();
	}
});
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Nodes = RBV.Renderer.Nodes || {};

RBV.Renderer.Nodes.Material = RBV.Renderer.Nodes.Base.extend({
	tagName: 'Material',

	initialize: function(opts) {
		this.el.setAttribute('specularColor', opts.specularColor);
		this.el.setAttribute('diffuseColor', opts.diffuseColor);
		this.el.setAttribute('transparency', opts.transparency);
		this.el.setAttribute('ID', opts.namespace + '_mat');
	}
});
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Nodes = RBV.Renderer.Nodes || {};

RBV.Renderer.Nodes.Shader = RBV.Renderer.Nodes.Base.extend({
	tagName: 'ComposedShader',

	vertexUrl: '',

	fragmentUrl: '',

	initialize: function(opts) {
		// TODO: 
		// if (this.vertexUrl)
		//	fetch url and set as vertex code
		// if (this.fragmentUrl)
		//	fetch url and set as fragment code
	},

	setVertexCode: function(text) {
		var shaderPart = document.createElement('shaderPart');
		shaderPart.setAttribute('type', 'VERTEX');
		shaderPart.innerHTML = text;
		this.el.appendChild(shaderPart);
	},

	setFragmentCode: function(text) {
		var shaderPart = document.createElement('shaderPart');
		shaderPart.setAttribute('type', 'FRAGMENT');
		shaderPart.innerHTML = text;
		this.el.appendChild(shaderPart);
	},

	addUniform: function(opts) {
		var uniformFN = document.createElement('field');
		uniformFN.setAttribute('id', String(opts.id));
		uniformFN.setAttribute('name', opts.name);
		uniformFN.setAttribute('type', opts.type);
		uniformFN.setAttribute('value', String(opts.value));

		this.el.appendChild(uniformFN);
	}
});
RBV.Renderer = RBV.Renderer || {};
RBV.Renderer.Nodes = RBV.Renderer.Nodes || {};

RBV.Renderer.Nodes.Texture = RBV.Renderer.Nodes.Base.extend({
	tagName: 'Texture',

	initialize: function(opts) {
		this.el.setAttribute('hideChildren', String(opts.hideChildren) || 'true');
		this.el.setAttribute('repeatS', String(opts.repeatS) || 'true');
		this.el.setAttribute('repeatT', String(opts.repeatT) || 'true');
		this.el.setAttribute('scale', String(opts.scale) || 'false');
		this.el.appendChild(opts.canvasEl);
	}
});

RBV.Renderer.Nodes.TextureTransform = RBV.Renderer.Nodes.Base.extend({
	tagName: 'TextureTransform',

	initialize: function(opts) {
		this.el.setAttribute('scale', String(opts.scale) || '1,-1');
		this.el.setAttribute('rotation', String(opts.rotation) || '-1.57');
	}
});

RBV.Renderer.Nodes.MultiTexture = RBV.Renderer.Nodes.Base.extend({
	tagName: 'MultiTexture',

	addTexture: function(texture, transform) {
		this.el.appendChild(texture.el);
		if (typeof transform !== 'undefined') {
			this.el.appendChild(transform.el);
		} else {
			var t = new RBV.Renderer.Nodes.TextureTransform({
				scale: '1,-1',
				rotation: 0
			});
			this.el.appendChild(t.el);
		}
	}
});