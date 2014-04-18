define([
    'core/BaseView',
    'app',
    'communicator',
    'globals',
    './VirtualGlobeViewer/app'
], function(BaseView, App, Communicator, globals, VGV) {

    'use strict';

    var VGVView = BaseView.extend({

        tagName: 'canvas',

        className: 'globe',

        initialize: function(opts) {
            BaseView.prototype.initialize.call(this, opts);
            this.enableEmptyView(false);

            this._startPosition = opts.startPosition;
            if (typeof this._startPosition === 'undefined') {
                this._startPosition = {
                    geoCenter: [15, 47],
                    distance: 0,
                    duration: 3000,
                    tilt: 40
                }
            };

            this._initialLayers = {};
            this.currentToI = this.toi();
        },

        didInsertElement: function() {
            if (!this.getViewer()) {
                this.setViewer(this._createVGV());
                this.getViewer().setToI(this.toi());
                this._setLayersFromAppContext();
                this.zoomTo(this._startPosition);
            }

            this.listenTo(Communicator.mediator, 'selection:changed', this._addAreaOfInterest);
            this.listenTo(Communicator.mediator, 'map:setUrl', this.zoomTo);
            this.listenTo(Communicator.mediator, 'map:center', this._onMapCenter);
            this.listenTo(Communicator.mediator, 'map:layer:change', this._onLayerChange);
            this.listenTo(Communicator.mediator, 'time:change', this._onTimeChange);
            this.listenTo(Communicator.mediator, 'productCollection:updateOpacity', this._onOpacityChange);
            this.listenTo(Communicator.mediator, 'productCollection:sortUpdated', this._sortOverlayLayers);
            this.listenTo(Communicator.mediator, 'options:colorramp:change', this._colorRampChange);
        },

        didRemoveElement: function() {
            // NOTE: The 'listenTo' bindings are automatically unbound by marionette
        },

        onResize: function() {
            this.getViewer().updateViewport();
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

            this._initLayers();
        },

        _addAreaOfInterest: function(geojson) {
            this.getViewer().addAreaOfInterest(geojson);
        },

        _addLayer: function(model, isBaseLayer) {
            this.getViewer().addLayer(model, isBaseLayer);
        },

        _removeLayer: function(model, isBaseLayer) {
            this.getViewer().removeLayer(model, isBaseLayer);
        },

        _removeAllOverlays: function() {
            this.getViewer().removeAllOverlays();
        },
        
        // options: { name: 'xy', isBaseLayer: 'true/false', visible: 'true/false'}
        _onLayerChange: function(options) {
            var model = this.getModelForLayer(options.name, options.isBaseLayer); 

            if (options.visible) {
                this._addLayer(model, options.isBaseLayer);
                console.log('[VGVView::onLayerChange] selected ' + model.get('name'));
            } else {
                this._removeLayer(model, options.isBaseLayer);
                console.log('[VGVView::onLayerChange] deselected ' + model.get('name'));
            }
        },

        _onOpacityChange: function(options) {
            this.getViewer().onOpacityChange(options.model.get('name'), options.value);
        },

        _onTimeChange: function(time) {
            this.currentToI = time;

            var starttime = new Date(time.start);
            var endtime = new Date(time.end);

            this.getViewer().setToI(starttime.toISOString() + '/' + endtime.toISOString());
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
        },

        _sortOverlayLayers: function() {
            this.getViewer().sortOverlayLayers();
        },

        _initLayers: function() {
            this.getViewer().clearCache();
            _.each(this._initialLayers, function(desc, name) {
                this.getViewer().addLayer(desc.model, desc.isBaseLayer);
            }.bind(this));
            this._sortOverlayLayers();
        },

        _onMapCenter: function(pos) {
            var dis = 0;
            switch (pos.l) {
                case 0:
                    dis = 50000000;
                    break;
                case 1:
                    dis = 30000000;
                    break;
                case 2:
                    dis = 18000000;
                    break;
                case 3:
                    dis = 9000000;
                    break;
                case 4:
                    dis = 4800000;
                    break;
                case 5:
                    dis = 2400000;
                    break;
                case 6:
                    dis = 1200000;
                    break;
                case 7:
                    dis = 700000;
                    break;
                case 8:
                    dis = 300000;
                    break;
                case 9:
                    dis = 80000;
                    break;
                case 10:
                    dis = 30000;
                    break;
                case 11:
                    dis = 9000;
                    break;
                case 12:
                    dis = 7000;
                    break;
                case 13:
                    dis = 5000;
                    break;
                case 14:
                    dis = 4000;
                    break;
            }

            var position = {
                center: [pos.x, pos.y],
                distance: dis,
                duration: 100,
                tilt: 45
            }
            this.zoomTo(position);
        },

        zoomTo: function(position) {
            this.getViewer().zoomTo(position);
        },

        _createVGV: function() {
            var vgv = new VGV({
                canvas: this.el
            });

            // Sets the initial colorramp defined in 'config.json':
            vgv.setColorRamp(Communicator.mediator.colorRamp);

            return vgv;
        },

        _colorRampChange: function(config) {
            this.getViewer().setColorRamp(config);
        },

        _dumpLayerConfig: function() {
            this.getViewer().dumpLayerConfig();
        }
    });

    return VGVView;

}); // end module definition