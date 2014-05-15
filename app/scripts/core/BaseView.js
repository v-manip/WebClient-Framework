define([
	'backbone.marionette',
	'globals',
	'jquery',
	'underscore'
], function(Marionette, globals, $, _) {

	'use strict';

	/* This object encapsulates functionality common to all the V-MANIP viewers:
	 *  - Management of the context bindings based on visibility
	 *  - Display of an 'empty view' if no content is selected yet
	 *  - Executing a custom resize callback when the view is visible
	 */
	var BaseView = Marionette.View.extend({

		/* PREREQUISITE: For this property to work a viewer has to be set with 'setViewer'. 
		 * If no viewer is set this property has no effect.
		 *
		 * If set to 'true' the viewer will not be destroyed when the 'onClose' function is called
		 * on the view. If 'false' the viewer will be destroyed.
		 * CAUTION: The viewer object must implement a 'destroy' function for that functionality to
		 * work. If not the code will not break, an error message will be displayed instead. However,
		 * this results in possible memory leaks!
		 */
		cacheViewerInstance: true,
		_initialLayers: {},

		//--------------------------//
		// IMPLEMENTATION INTERFACE //
		//--------------------------//

        initLayersOnStartup: function() {
        	console.error('[BaseView::initLayersOnStartup] IMPLEMENT IN DERIVED OBJECT!');
        },

		/* Stores the 'context' (accessible in the child object via 'this.legacyContext()') and sets up
		 * the base configuration.
		 */
		initialize: function(opts) {
			// Necessary for SplitView object:
			this.isClosed = true;
			this.isEmpty = true;
			this.emtpyViewIsActive = false;

			if (_.isFunction(this.onResize)) {
				this.onResizeF = this.onResize.bind(this);
			}

			if (typeof opts.context === 'undefined') {
				throw '[BaseView::initialize] "context" property has to be set in the options! If no context is needed for the view set it to "null"';
			}

			// Encapsulate the context object to ensure it is not unintendently
			// changed from outside:
			this.legacyContext = function() {
				return opts.context;
			}
		},

		//------------------//
		// PUBLIC INTERFACE //
		//------------------//

		initialLayers: function() {
			return this._initialLayers;
		},

		//-------------------//
		// PRIVATE INTERFACE //
		//-------------------//

		/*
		 * Connects the default VMANIP context events if a corresponding method property exists in the
		 * extended object.
		 */
		_setupVMANIPContext: function() {
			if (_.isFunction(this.onLayerChange)) {
				this.listenTo(this.legacyContext(), 'map:layer:change', this._onLayerChangeBase);
			}
		},

		/*
		 * Internal function to check if the changed layer is supported by the view via the extended objects
		 * 'supportsLayer' function. If no such function is defined _all_ layers are accepted by default and the
		 * extended objects 'onLayerChange' method is called. If 'supportsLayer' is defined its returning boolean
		 * value determines the execution of 'onLayerChange'.
		 */
		_onLayerChangeBase: function(options) {
			if (!_.isFunction(this.supportsLayer)) {
				return true;
			}

			var model = this.getModelForLayer(options.name, options.isBaseLayer);

			if (!model) {
				console.log('[BaseView::_onLayerChangeBase] no model found for ' + options.name);
				return;
			}

			if (!this.supportsLayer(model)) {
				//console.log('[BaseView::_onLayerChangeBase] not a supported layer: ' + model.get('name'));
				return;
			} else {
				this.onLayerChange(model, options.visible);
			}
		},

		/*
		 * Shows the content or the empty view, depending on the current setting and binds the view to the context
		 * if necessary. Also manages the resize functionality. The child's 'didInsertElement' method is also
		 * called, if defined.
		 */
		onShow: function() {
			if (this.isClosed) {
				if (_.isFunction(this.didInsertElement)) {
					this._setupVMANIPContext();
					this.didInsertElement();
				}

				if (this.onResizeF) {
					$(window).resize(this.onResizeF);
				}

				this.isClosed = false;
			}

			if (this.isEmpty) {
				if (_.isFunction(this.showEmptyView)) {
					this.showEmptyView();
				}
				this.emtpyViewIsActive = true;
				return;
			}

			if (this.emtpyViewIsActive) {
				if (_.isFunction(this.hideEmptyView)) {
					this.hideEmptyView();
				}
				this.emtpyViewIsActive = false;
			}
		},

		/* Unbinds the context bindings and the resize functionality. Also destroys the viewer if the
		 * 'cheViewerInstance' property is set to 'true'. The child's 'didRemoveElement' method is also
		 * called, if defined.
		 */
		onClose: function() {
			if (!_.isFunction(this.didRemoveElement)) {
				this.didRemoveElement();
			}

			if (this.onResizeF) {
				$(window).off('resize', this.onResizeF);
			}

			if (!this.cacheViewerInstance) {
				if (this.viewer) {
					if (_.isFunction(this.viewer.destroy)) {
						this.viewer.destroy();
					} else {
						console.error('[BaseView::onClose] The "viewer" object does not provide a "destroy" function, but "cacheViewerInstance" is set to false. The "viewer" property will only be set to "undefined"');
					}
					this.viewer = undefined;
				}
				this.isEmpty = true;
			}

			// NOTE: The 'listenTo' bindings are automatically unbound by marionette
			this.isClosed = true;
		},

		/* Determines if the empty view is shown, or not.
		 */
		enableEmptyView: function(flag) {
			this.isEmpty = flag;
		},

		/**
		 * Sets the viewer. If a viewer is set the 'cacheViewerInstance' property can be used to
		 * manage the lifecycle of the viewer.
		 */
		setViewer: function(viewer) {
			this.viewer = viewer;
		},

		/**
		 * Returs the viewer, if any is set.
		 */
		getViewer: function() {
			return this.viewer;
		},

		/**
		 * Returns the models of the currently selected layers. If a 'filter' function is given it will be applied to check
		 * if the model is compatible with the given filter.
		 */
		getModelsForSelectedLayers: function(filter) {
			var models = {};

			globals.baseLayers.each(function(model) {
				if (model.get('visible')) {
					if (typeof filter !== 'undefined') {
						if (filter(model)) {
							models[model.get('name')] = {
								model: model,
								type: 'baselayer'
							};
							// console.log('[BaseView::setLayersFromAppContext] added baselayer "' + model.get('name') + '"');
						}
					} else {
						models[model.get('name')] = {
							model: model,
							type: 'baselayer'
						};
					}
				}
			});

			globals.products.each(function(model) {
				if (model.get('visible')) {
					if (typeof filter !== 'undefined') {
						if (filter(model)) {
							models[model.get('name')] = {
								model: model,
								type: 'product'
							};
							// console.log('[BaseView::setLayersFromAppContext] added product "' + model.get('name') + '"');
						}
					} else {
						models[model.get('name')] = {
							model: model,
							type: 'product'
						};
					}
				}
			});

			globals.overlays.each(function(model) {
				if (model.get('visible')) {
					if (typeof filter !== 'undefined') {
						if (filter(model)) {
							models[model.get('name')] = {
								model: model,
								type: 'overlay'
							};
							// console.log('[BaseView::setLayersFromAppContext] added overlay "' + model.get('name') + '"');
						}
					} else {
						models[model.get('name')] = {
							model: model,
							type: 'overlay'
						};
					}
				}
			});

			return models;
		},

		getModelForLayer: function(name, isBaseLayer) {
			var layerModel = undefined;
			if (isBaseLayer) {
				layerModel = globals.baseLayers.find(function(model) {
					return model.get('name') === name;
				});
			} else {
				layerModel = globals.products.find(function(model) {
					return model.get('name') === name;
				});

				if (!layerModel) {
					layerModel = globals.overlays.find(function(model) {
						return model.get('name') === name;
					});
				}
			}

			if (typeof layerModel === 'undefined') {
				throw Error('[BaseView::getModelForLayer] Product ' + name + ' is unknown!');
			}

			return layerModel;
		},

        _addInitialLayer: function(model, isBaseLayer) {
            this._initialLayers[model.get('name')] = {
                model: model,
                isBaseLayer: isBaseLayer
            };
        },

        /** Adds the layers selected in the GUI and performs their setup (opacity, sorting oder, etc.).
         *  Layers are either baselayers, products or overlays.
         */
        _setLayersFromAppContext: function() {
            this._initialLayers = {};

            globals.baseLayers.each(function(model) {
                if (model.get('visible')) {
                    this._addInitialLayer(model, true);
                    console.log('[VirtualVGVViewController::setLayersFromAppContext] added baselayer "' + model.get('name') + '"');
                };
            }.bind(this));

            globals.products.each(function(model) {
                if (model.get('visible')) {
                    console.log('model: ' + model.get('name') + ' / state: ' + model.get('visible'));
                    this._addInitialLayer(model, false);
                    console.log('[VirtualVGVViewController::setLayersFromAppContext] added products "' + model.get('name') + '"');
                }
            }.bind(this));

            globals.overlays.each(function(model) {
                if (model.get('visible')) {
                    this._addInitialLayer(model, false);
                    console.log('[VirtualVGVViewController::setLayersFromAppContext] added overlays "' + model.get('name') + '"');
                }
            }.bind(this));

            this.initLayersOnStartup();
        }		
	});

	return BaseView;
});