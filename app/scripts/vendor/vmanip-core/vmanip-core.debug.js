(function () {/**
 * @license almond 0.2.9 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);
                name = name.split('/');
                lastIndex = name.length - 1;

                // Node .js allowance:
                if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                }

                name = baseParts.concat(name);

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('layers/layer-base',[],function() {

	/**
	 * @class Layer.Base: An abstract object managing a request to a OGC service provider.
	 *
	 * @note: In the future this can really be a 'base' object, not oriented on an (OGC) request
	 * schema, but for now this is all we need.
	 */
	var BaseLayer = Backbone.Model.extend({

		/**
		 * The Base layer defines common visualization properties, as well as internal data
		 * structures (it is not necessary to define them here, but it is a clear way to
		 * document the internal data structure).
		 */
		defaults: function() {
			return {
				// Visualization options:
				'opacity': 1,
				'ordinal': -1,

				// Internal data structures:
				'mimeTypeHandlers': []
			}
		},

		/**
		 * Registers a handler for a specific format for preprocessing data received
		 * by a data request. An eventual registered handler with the same mimetype
		 * will be overwritten.
		 *
		 * @param mimetype - MIME type name (i.e. 'image/x-aaigrid')
		 * @returns {boolean} - TRUE if a handler for the given format was already registered,
		 * FALSE if not
		 */
		registerMimeTypeHandler: function(mimetype, handler) {
			var wasRegistered = false;
			if (this.get('mimeTypeHandlers')[mimetype]) {
				wasRegistered = true;
			}
			this.get('mimeTypeHandlers')[mimetype] = handler;

			return wasRegistered;
		},

		getMimeTypeHandlers: function() {
			return this.get('mimeTypeHandlers');
		}
	});

	return BaseLayer;
	
});
define('layers/layer-wms',[
	'layers/layer-base'
	], function(BaseLayer) {

	var WMSLayer = BaseLayer.extend({
		defaults: _.extend({}, BaseLayer.prototype.defaults(), {
			'protocol': 'WMS',
			'style': 'default',
			'crs': 'EPSG:4326',
			'format': 'image/png',
			'version': '1.0.0',
			'transparent': true
		})
	});

	return WMSLayer;
	
});
define('layers/layer-wcs',[
	'layers/layer-base'
	], function(BaseLayer) {

	var WCSLayer = BaseLayer.extend({
		defaults: _.extend({}, BaseLayer.prototype.defaults(), {
			'protocol': 'WCS',
			'version': '2.0.0'
		})
	});

	return WCSLayer;

});
define('vmanip',[
	'layers/layer-base',
	'layers/layer-wms',
	'layers/layer-wcs'
], function(BaseLayer, WMSLayer, WCSLayer) {

	var VMANIP = {};
	
	VMANIP.Layers = {};
	VMANIP.Layers.Base = BaseLayer;
	VMANIP.Layers.WMS = WMSLayer;
	VMANIP.Layers.WCS = WCSLayer;

	VMANIP.Modules = {};

	/**
	 * A Context represents the current state of the VMANIP
	 * runtime, containing selected layers, layer settings, ToI, AoI, etc.
	 * Modules or external entities can request or inject data into the
	 * context (i.e. the TimeSlider injects and updates the current
	 * time of interest). Moreover, Modules can register observers to
	 * data bits of the context to get notified when this data is changed
	 * and can react to the change accordingly.
	 * The Context paradigm also allows for easy testing of the application.
	 */
	VMANIP.Context = function(opts) {
		this.id = opts.id;
		console.log('[Context] "' + this.id + '" initialized');
	};

	/** 
	 * A Runtime manages one or more modules. The idea is that one
	 * 'viewer window' (e.g. a  <div> where VMANIP info is displayed)
	 * should have its own runtime, which can contain multiple VMANIP
	 * modules. The runtime allows to switch between the modules
	 * programmatically and to configure them. To implement something
	 * like a splitview you would create a runtime for each window in
	 * the splitview.
	 *
	 * Note: Runtimes are very lightweight and it is possible and easy to
	 * share contexts between runtimes.
	 */
	VMANIP.Runtime = function() {
		this.modules = {};
		console.log('[Runtime] initialized');
	};

	VMANIP.Runtime.prototype.addModule = function(module, context) {
		module.setContext(context);
		this.modules[module.id] = module;
	};

	VMANIP.Runtime.prototype.listModules = function() {
		console.log('[Runtime] registered modules:');
		for (var item in this.modules) {
			if (this.modules.hasOwnProperty(item)) {
				console.log('    * ' + this.modules[item].id);
			}
		}
	};

	VMANIP.Runtime.prototype.showModules = function(id) {
		console.log('[Runtime] showing module "' + id + '"');
	};

	/**
	 * A Module is an entity that visualizes a Context. The object is used as
	 * a base class that is implemented by a derived object (e.g. the VGV module)
	 * to easily hook into the VMANIP system.
	 * A Module is registered with a VMANIP.Runtime, which manages and controls
	 * multiple modules. Contexts can be shared between modules and runtimes
	 * easily.
	 *
	 * @see Runtime, Context
	 */
	VMANIP.Modules.Base = function(opts) {
		this.id = opts.id;
		console.log('[Module] "' + this.id + '" initialized');
	};

	VMANIP.Modules.Base.prototype.setContext = function(context) {
		this.context = context;
		console.log('[Module] set context "' + this.context.id + '" on "' + this.id + '"');
	};

	VMANIP.Modules.VirtualGlobeViewer = function(opts) {
		this.id = opts.id;
		console.log('[Module] "' + this.id + '" initialized');
	};

	VMANIP.Modules.VirtualGlobeViewer.prototype.setContext = function(context) {
		this.context = context;
		console.log('[Module] set context "' + this.context.id + '" on "' + this.id + '"');
	};

	window.VMANIP = VMANIP;

	return VMANIP;
});

require(["vmanip"]);
}());