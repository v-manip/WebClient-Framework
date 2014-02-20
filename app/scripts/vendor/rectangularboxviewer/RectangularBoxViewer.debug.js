var RBV = RBV || {};

/**
 * @class Context: Defines data and state for a model. Changes to the visualization
 * of a model are done solely via the context object.
 */
RBV.Context = function(opts) {
	this.toi = opts.toi || null;
	if (typeof opts.aoi !== 'undefined') {
		this.aoi = opts.aoi[0];
		this.aoi.push(opts.aoi[1]);
		this.aoi.push(opts.aoi[2]);
	} else {
		this.aoi = null;
	}

	this.providers = {};
};

RBV.Context.prototype.setToI = function(timespan) {
	this.toi = timespan;
};

RBV.Context.prototype.setAoI = function(bbox, min_height, max_height) {
	this.aoi = bbox;
	this.aoi.push(min_height, max_height);
};

RBV.Context.prototype.addProvider = function(type, id, provider) {
	var provider_desc = {
		id: id,
		provider: provider
	};

	if (!this.providers[type]) {
		this.providers[type] = [];
	}
	this.providers[type].push(provider_desc);
};

RBV.Context.prototype.getProvider = function(type, id) {
	if (!this.providers[type]) {
		return null;
	}

	for (var idx = 0; idx < this.providers[type].length; idx++) {
		if (this.providers[type][idx].id === id) {
			return this.providers[type][idx].provider;
		}
	};

	return null;
};
RBV.Visualization = RBV.Visualization || {};

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
RBV.Visualization.LODTerrainWithOverlays = function(opts) {
    this.data = opts.demResponse;
    this.textureResponses = opts.textureResponses;
    this.index = opts.index;
    this.noData = opts.noDataValue;
    this.noDemValue = opts.noDemValue;
    this.root = opts.root;

    this.transparencysFN = {};
    this.appearancesN = {};

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
        //chunkInfo = null;

        EarthServerGenericClient.MainScene.reportProgress(this.index);
    };

    /**
     * The Scene Manager calls this function after a few frames since the last insertion of a chunk.
     */
    this.nextFrame = function() {
        //Build all necessary information and values to create a chunk
        var info = this.createChunkInfo(this.index, chunkSize, chunkInfo, currentChunk, this.data.width, this.data.height);
        var hm = this.getHeightMap(info);

        // Generate one texture for each 'imagery' ServerResponse:
        var texture_descriptions = [];
        for (var idx = 0; idx < this.textureResponses.length; idx++) {
            var textureData = this.textureResponses[idx].texture;
            var textureEl = this.createCanvas(textureData, this.index, this.noDataValue, false);

            texture_descriptions.push({
                id: this.textureResponses[idx].layerName,
                textureEl: textureEl
            });
        };

        var appearances = this.configureAppearances({
            name: 'TerrainApp_' + this.index,
            lodCounts: 3,
            modelIndex: this.index,
            texture_descriptions: texture_descriptions,
            transparency: this.data.transparency,
            specularColor: this.data.specularColor,
            diffuseColor: this.data.diffuseColor,
            upright: false
        });

        var transform = document.createElement('Transform');
        transform.setAttribute('translation', info.xpos + ' 0 ' + info.ypos);
        transform.setAttribute('scale', '1.0 1.0 1.0');

        var lodNode = document.createElement('LOD');
        lodNode.setAttribute('Range', lodRange1 + ',' + lodRange2);
        lodNode.setAttribute('id', 'lod' + info.ID);

        if (this.noDataValue !== undefined || this.noDemValue != undefined) {
            new GapGrid(lodNode, info, hm, appearances, this.noDemValue);
        } else {
            new ElevationGrid(lodNode, info, hm, appearances);
        }

        transform.appendChild(lodNode);
        this.root.appendChild(transform);

        currentChunk++;

        // FIXXME: circular references?
        // //Delete vars avoid circular references
        // info = null;
        // hm = null;
        // appearance = null;
        // transform = null;
        // lodNode = null;
    };

    /**
     * This function handles the creation and usage of the appearances. It can be called for every shape or LOD that should use a canvasTexture.
     * It returns the amount of appearances specified. For every name only one appearance exits, every other uses it.
     * @param AppearanceName - Name of the appearance. If this name is not set in the array, it will be registered.
     *      In the case the name is already set, the existing one will be used.
     * @param AppearanceCount - Number of appearance to be created. E.g. the LODs use a bunch of three appearance nodes.
     * @param modelIndex - Index of the model using this appearance.
     * @param canvasTexture - Canvas element to be used in the appearance as texture.
     * @param transparency - Transparency of the appearance.
     * @param specular - Specular color of the appearance.
     * @param diffuse - Diffuse color of the appearance.
     * @param upright - Flag if the terrain is upright (underground data) and the texture stands upright in the cube.
     * @returns {Array} - Array of appearance nodes. If any error occurs, the function will return null.
     */
    this.configureAppearances = function(opts) {
        var appearanceN = document.createElement('Appearance');

        if (opts.transparency === 0) {
            appearanceN.setAttribute('sortType', 'opaque');
        } else {
            appearanceN.setAttribute('sortType', 'transparent');
        }

        if (this.appearancesN[opts.name]) // use the already defined appearance
        {
            appearanceN.setAttribute("use", this.appearancesN[opts.name]);
        } else {
            this.appearancesN[opts.name] = opts.name;
            appearanceN.setAttribute("id", this.appearancesN[opts.name]);
            appearanceN.setAttribute("def", this.appearancesN[opts.name]);

            var materialN = document.createElement('material');
            materialN.setAttribute('specularColor', opts.specularColor);
            materialN.setAttribute('diffuseColor', opts.diffuseColor);
            materialN.setAttribute('transparency', opts.transparency);
            materialN.setAttribute('ID', opts.name + '_mat');
            appearanceN.appendChild(materialN);

            // var myshader = document.getElementById('myshader');
            // // var shader = myshader.cloneNode(false);
            // var shader = $('#myshader').clone().attr('id', AppearanceName + '_mat');
            // appearanceN.appendChild(shader.get()[0]);
            // console.log('shader: ', shader.get()[0]);

            // <MultiTexture>
            // <ImageTexture url='texture/earth.jpg' />
            // <ComposedCubeMapTexture repeatS='false' repeatT='false'>
            //     <ImageTexture containerField='back' url='texture/generic/BK.png' />
            //     <ImageTexture containerField='bottom' url='texture/generic/DN.png' />
            //     <ImageTexture containerField='front' url='texture/generic/FR.png' />
            //     <ImageTexture containerField='left' url='texture/generic/LF.png' />
            //     <ImageTexture containerField='right' url='texture/generic/RT.png' />
            //     <ImageTexture containerField='top' url='texture/generic/UP.png' />
            // </ComposedCubeMapTexture>
            // <ImageTexture url='texture/normalMap.png' />
            // </MultiTexture>
            //
            // <ComposedShader DEF='ComposedShader'>
            //           <field name='tex' type='SFInt32' value='0'/>
            //           <field name='cube' type='SFInt32' value='1'/>
            //           <field name='bump' type='SFInt32' value='2'/> 

            //         <ShaderPart type='FRAGMENT'>
            //                 #ifdef GL_ES
            //                   precision highp float;
            //                 #endif

            //                 uniform sampler2D tex;
            //                 uniform samplerCube cube;
            //                 uniform sampler2D bump;
            //                 ...
            //         </ShaderPart>
            //         ...
            // </ConposedShader>

            var multiTextureN = document.createElement('MultiTexture')
            for (var idx = 0; idx < opts.texture_descriptions.length; idx++) {
                var desc = opts.texture_descriptions[idx];

                var textureN = document.createElement('Texture');
                textureN.setAttribute('hideChildren', 'true');
                textureN.setAttribute('repeatS', 'true');
                textureN.setAttribute('repeatT', 'true');
                textureN.setAttribute('scale', 'false');
                textureN.appendChild(desc.textureEl);

                var textureTransformN = document.createElement('TextureTransform');
                textureTransformN.setAttribute('scale', '1,-1');
                if (opts.upright) {
                    textureTransformN.setAttribute('rotation', '-1.57');
                }
                multiTextureN.appendChild(textureTransformN);

                multiTextureN.appendChild(textureN);
            }

            appearanceN.appendChild(multiTextureN);

            var cShaderN = document.createElement('ComposedShader');
            var diffuseColorFN = document.createElement('field');
            diffuseColorFN.setAttribute('name', 'diffuseColor');
            diffuseColorFN.setAttribute('type', 'SFVec3f');
            diffuseColorFN.setAttribute('value', '1 0 1');
            cShaderN.appendChild(diffuseColorFN);

            var tex_idx = 0;
            for (var idx = 0; idx < opts.texture_descriptions.length; idx++) {
                var desc = opts.texture_descriptions[idx];

                var transparencyFN = document.createElement('field');
                transparencyFN.setAttribute('id', opts.name + '_transparency_for_' + desc.id);
                transparencyFN.setAttribute('name', 'transparency_' + desc.id);
                transparencyFN.setAttribute('type', 'SFFloat');
                transparencyFN.setAttribute('value', '1');
                cShaderN.appendChild(transparencyFN);

                this.transparencysFN[opts.name + '_transparency_for_' + desc.id] = transparencyFN;

                // // Testing only:
                // var fadeOut = function() {
                //     var value = transparencyFN.getAttribute('value');
                //     transparencyFN.setAttribute('value', String(value - 0.1));
                //     setTimeout(fadeOut, 200);
                // };
                // setTimeout(fadeOut, 5000);

                var textureIdFN = document.createElement('field');
                textureIdFN.setAttribute('id', opts.name + '_texture_for_' + desc.id);
                textureIdFN.setAttribute('name', 'tex_' + desc.id);
                textureIdFN.setAttribute('type', 'SFFloat');
                textureIdFN.setAttribute('value', tex_idx++);
                cShaderN.appendChild(textureIdFN);
            };

            var vertexCode = 'attribute vec3 position; \n';
            vertexCode += 'uniform mat4 modelViewProjectionMatrix; \n';
            vertexCode += 'varying vec2 fragTexCoord; \n';
            vertexCode += 'void main() { \n';
            vertexCode += 'fragTexCoord = vec2(texcoord.x, 1.0 - texcoord.y);\n';
            vertexCode += 'gl_Position = modelViewProjectionMatrix * vec4(position, 1.0); }\n';
            var shaderPartVertex = document.createElement('shaderPart');
            shaderPartVertex.setAttribute('type', 'VERTEX');
            shaderPartVertex.innerHTML = vertexCode;
            cShaderN.appendChild(shaderPartVertex);

            var fragmentCode = '#ifdef GL_ES \n';
            fragmentCode += 'precision highp float; \n';
            fragmentCode += '#endif \n';
            fragmentCode += 'varying vec2 fragTexCoord; \n';
            for (var idx = 0; idx < opts.texture_descriptions.length; idx++) {
                var desc = opts.texture_descriptions[idx];
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
            for (var idx = 0; idx < opts.texture_descriptions.length; idx++) {
                var desc = opts.texture_descriptions[idx];
                fragmentCode += '  vec4 color' + idx + ' = texture2D(tex_' + desc.id + ', fragTexCoord); \n';
                fragmentCode += '  color' + idx + ' = color' + idx + ' * transparency_' + desc.id + '; \n';
                if (idx == 0) {
                    fragmentCode += '  vec4 colorOnTop = color0; \n';
                } else {
                    fragmentCode += '  colorOnTop = alphaBlend(colorOnTop, color' + idx + '); \n';
                }
            }
            fragmentCode += '  gl_FragColor = colorOnTop; \n';
            fragmentCode += '} \n';

            // console.log('fragmentCode:\n' + fragmentCode);

            var shaderPartFragment = document.createElement('shaderPart');
            shaderPartFragment.setAttribute('type', 'FRAGMENT');
            shaderPartFragment.innerHTML = fragmentCode;
            cShaderN.appendChild(shaderPartFragment);

            appearanceN.appendChild(cShaderN);
        }

        return [appearanceN];
    };

    /**
     * Overwrites function from base terrain class. Sets the transparency in the shader.
     * @param value - Transparency value between 0 (full visible) and 1 (invisible).
     */
    this.setTransparencyFor = function(texture_id, value) {
        var transparencyFieldId = 'TerrainApp_' + this.index + '_transparency_for_' + texture_id;
        var transparencyFN = document.getElementById(transparencyFieldId);

        if (transparencyFN) {
            transparencyFN.setAttribute('value', String(1.0 - value));
        } else {
            console.log('RBV.Visualization.LODTerrainWithOverlays: Cannot find transparency field: ' + transparencyFieldId);
        }
    };
};
RBV.Visualization.LODTerrainWithOverlays.inheritsFrom(EarthServerGenericClient.AbstractTerrain);
RBV.Models = RBV.Models || {};

"use strict";

/**
 * @class Scene Model: WMS Image with DEM from WCS Query
 * 2 URLs for the service, 2 Coverage names for the image and dem.
 * @augments EarthServerGenericClient.AbstractSceneModel
 */
RBV.Models.DemWithOverlays = function() {
    this.setDefaults();
    this.name = "DEM with overlay(s)";

    this.terrain = null;
    this.demRequest = null;
    this.imageryProviders = [];
};
RBV.Models.DemWithOverlays.inheritsFrom(EarthServerGenericClient.AbstractSceneModel);

/**
 * Sets the DEM request.
 * @param request - Configured Request object
 * @see Request
 */
RBV.Models.DemWithOverlays.prototype.setDemProvider = function(provider) {
    this.demRequest = provider;
};

/**
 * Adds an imagery request.
 * @param request - Configured Request object
 * @see Request
 */
RBV.Models.DemWithOverlays.prototype.addImageryProvider = function(provider) {
    this.imageryProviders.push(provider);

    // Connect to transparency change events:
    provider.on('change:opacity', function(layer, value) {
        this.terrain.setTransparencyFor(layer.get('id'), (1 - value));
    }.bind(this));
};

/**
 * Sets the timespan for the request
 * @param timespan - eg. '2013-06-05T00:00:00Z/2013-06-08T00:00:00Z'
 */
RBV.Models.DemWithOverlays.prototype.setTimespan = function(timespan) {
    this.timespan = timespan;
};

/**
 * Creates the x3d geometry and appends it to the given root node. This is done automatically by the SceneManager.
 * @param root - X3D node to append the model.
 * @param cubeSizeX - Size of the fishtank/cube on the x-axis.
 * @param cubeSizeY - Size of the fishtank/cube on the y-axis.
 * @param cubeSizeZ - Size of the fishtank/cube on the z-axis.
 */
RBV.Models.DemWithOverlays.prototype.createModel = function(root, cubeSizeX, cubeSizeY, cubeSizeZ) {
    if (typeof root === 'undefined') {
        throw Error('[Model_DEMWithOverlays::createModel] root is not defined')
    }

    EarthServerGenericClient.MainScene.timeLogStart("Create Model_DEMWithOverlays " + this.name);

    this.cubeSizeX = cubeSizeX;
    this.cubeSizeY = cubeSizeY;
    this.cubeSizeZ = cubeSizeZ;

    var bbox = {
        minLongitude: this.miny,
        maxLongitude: this.maxy,
        minLatitude: this.minx,
        maxLatitude: this.maxx
    };

    this.root = root;
    this.createPlaceHolder();

    // Convert the original Backbone.Model layers to 'plain-old-data' javascript objects:
    var podImageryProviders = [];
    _.each(this.imageryProviders, function(layer, idx) {
        podImageryProviders.push(layer.toJSON());
    });

    var podDemProvider = this.demRequest.toJSON();

    EarthServerGenericClient.getDEMWithOverlays(this, {
        dem: podDemProvider,
        imagery: podImageryProviders,
        bbox: bbox,
        timespan: this.timespan,
        resX: this.XResolution,
        resZ: this.ZResolution
    });
};

RBV.Models.DemWithOverlays.prototype.receiveData = function(serverResponses) {
    if (this.checkReceivedData(serverResponses)) {
        this.removePlaceHolder();

        // Distinguish between 'imagery' and 'dem' ServerResponses in the serverResponses
        // FIXXME: This is clumsy...
        var demResponse = null;
        var textureResponses = [];
        var lastidx = -1;
        for (var idx = 0; idx < serverResponses.length; ++idx) {
            var response = serverResponses[idx];
            if (response.heightmap) {
                demResponse = response;
            } else {
                textureResponses.push(response);
                // console.log('[RBV.Models.DemWithOverlays::receiveData] received layer: ' + response.layerName + ' / ordinal: ' + response.ordinal);
            }
        }

        var textureResponses = _.sortBy(textureResponses, function(item) {
            return item.ordinal
        });

        // textureResponses.reverse();
        var YResolution = this.YResolution || (parseFloat(demResponse.maxHMvalue) - parseFloat(demResponse.minHMvalue));
        var transform = this.createTransform(demResponse.width, YResolution, demResponse.height, parseFloat(demResponse.minHMvalue), demResponse.minXvalue, demResponse.minZvalue);
        this.root.appendChild(transform);

        //Create Terrain out of the received demResponse
        EarthServerGenericClient.MainScene.timeLogStart("Create Terrain " + this.name);
        // transform, demResponse, this.index, this.noData, this.demNoData);
        this.terrain = new RBV.Visualization.LODTerrainWithOverlays({
            root: transform,
            demResponse: demResponse,
            textureResponses: textureResponses,
            index: this.index,
            noDataValue: this.noData,
            demNoDataValue: this.demNoData
        });

        this.terrain.getAppearances = this.getAppearances;
        this.terrain.setTransparency = this.setTransparency;
        this.terrain.createTerrain();
        EarthServerGenericClient.MainScene.timeLogEnd("Create Terrain " + this.name);
        this.elevationUpdateBinding();
        if (this.sidePanels) {
            this.terrain.createSidePanels(this.transformNode, 1);
        }
        EarthServerGenericClient.MainScene.timeLogEnd("Create Model " + this.name);

        transform = null;
    }
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
        //     alert(this.name + ": Request not successful.");
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
	// There is one context for all Models at the moment (for simplicity):
	this.context = opts.context || null;

	// FIXXME: those values are model specific, how to handle?
	this.resolution = opts.resolution || [500, 500];
	this.noDemValue = opts.noDemValue || 0;

	this._setupEarthServerGenericClient(opts);
};

// FIXXME: Currently the model needs to know if a Provider has a custom
// mimetype handler attached. This is due to the slightly "clumpsy" way
// the EarthServerGenericClient library is handling data requests.
// Adding a provider or request based abstraction to the EarthServerGenericClient
// would solve the problem, as then the abstraction layer takes care of the
// mimetype handling, not the model itself.
RBV.Scene.prototype.addModel = function(model, providers) {
	for (var idx = 0; idx < providers.length; idx++) {
		var mimeTypeHandlers = providers[idx].getMimeTypeHandlers();
		for (var key in mimeTypeHandlers) {
			if (mimeTypeHandlers.hasOwnProperty(key)) {
				model.registerMIMETypeHandler(key, mimeTypeHandlers[key]);
			}
		}
	};
	EarthServerGenericClient.MainScene.addModel(model);

	this.model = model;
};

RBV.Scene.prototype.show = function(opts) {
	this.model.setAreaOfInterest(this.context.aoi[0], this.context.aoi[1], this.context.aoi[2], this.context.aoi[3], this.context.aoi[4], this.context.aoi[5]);
	this.model.setTimespan(this.context.toi);
	// this.model.setOffset(0, 0.2, 0);
	// this.model.setScale(1, 3, 1);

	// create the viewer: Cube has 60% height compared to width and length
	// EarthServerGenericClient.MainScene.createScene('x3dScene', 'theScene', 1, 0.6, 1);
	// EarthServerGenericClient.MainScene.createScene('x3dScene', 'x3dScene', 1, 0.6, 1);
	// FIXXME: this was the only combination that worked, investigate API!
	EarthServerGenericClient.MainScene.createScene(opts.x3dscene_id, opts.x3dscene_id, 1, 0.8, 1);
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

RBV.Scene.prototype._setupEarthServerGenericClient = function(opts) {
	EarthServerGenericClient.MainScene.resetScene();
	EarthServerGenericClient.MainScene.setTimeLog(opts.setTimeLog);
	EarthServerGenericClient.MainScene.addLightToScene(opts.addLightToScene);
	EarthServerGenericClient.MainScene.setBackground(opts.background[0], opts.background[1], opts.background[2], opts.background[3]);
};