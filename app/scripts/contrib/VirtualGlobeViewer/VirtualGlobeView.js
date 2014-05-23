define([
    'core/BaseView',
    'app',
    'communicator',
    'globals',
    './VirtualGlobeViewer/app'
], function(BaseView, App, Communicator, globals, VGV) {

    'use strict';

    var VirtualGlobeView = BaseView.extend({

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

            this.currentToI = this.toi();
        },

        // FIXXME: this method should be put into the BaseView to do a basic setup of
        // the component. Developers can then hook to the 'didInsertElement' function
        // in using VMANIP 'actions' (via an 'afterDOMInsert' action). 'Actions' have
        // to be implemented first ;-)
        didInsertElement: function() {
            if (!this.getViewer()) {
                this.setViewer(this._createVGV());
                this.getViewer().setToI(this.toi());

                // FIXXME: this should be triggered by the BaseView!
                this._setLayersFromAppContext();

                this.zoomTo(this._startPosition);
            }

            // FIXXME: After implementing VMANIP 'actions' most of the 'listenTo' calls
            // can be done implicitly in reading the 'actions' has and wiring up the
            // onXXXHandler() actions there to the corresponding mediator event. This will
            // help to do a cleanup of this repetitive code.
            this.listenTo(Communicator.mediator, 'selection:changed', this._addAreaOfInterest);
            this.listenTo(Communicator.mediator, 'selection:activated', this._onSelectionActivated);
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

        supportsLayer: function(model) {
            var view = _.find(model.get('views'), function(view) {
                return (view.protocol.toLowerCase() === 'w3ds' && view.type.toLowerCase() === 'vertical_curtain') ||
                    view.protocol.toLowerCase() === 'wms' ||
                    view.protocol.toLowerCase() === 'wmts';
            });

            if (view) {
                return view;
            }

            return null;
        },

        onStartup: function(initial_layers) {
            this.getViewer().clearCache();
            _.forEach(initial_layers, function(desc, name) {
                // FIXXME The VGV and the internal viewer have to be ported to display a 'view', not a 'model'!
                // if (this.supportsLayer(desc.model)) {
                this.getViewer().addLayer(desc.model, desc.isBaseLayer);
                // }
            }.bind(this));
            this._sortOverlayLayers();
        },

        //----------------//
        // VMANIP ACTIONS //
        //----------------//

        // FIXXME: create a distinct hash for that, e.g.:
        // actions: {
        //     onResize: function() {},
        //     onLayerAdd: function() {},
        //     onLayerRemove: function() {}
        //     // ...
        // }
        // This way we can provide a defined interface for all
        // default actions VMANIP is providing us, which is encapsulated
        // clearly within the 'actions' hash. This is basically the 
        // concrete interface implementation for the specific view.
        //
        // Note: This approach is inspired by Ember's 'actions' hash.

        onResize: function() {
            if (this.getViewer()) {
                this.getViewer().updateViewport();
            }
        },

        onLayerAdd: function(model, isBaseLayer) {
            this.getViewer().addLayer(model, isBaseLayer);
        },

        onLayerRemove: function(model, isBaseLayer) {
            this.getViewer().removeLayer(model, isBaseLayer);
        },

        //-------------------//
        // PRIVATE INTERFACE //
        //-------------------//

        _addAreaOfInterest: function(openlayers_geometry, coords, color) {
            // FIXXME: The MapvView triggers the 'selection:changed' with the payload of 'null'
            // when the selection items in the toolbar are clicked. This event triggers this method
            // here in the VGV. So if the openlayers_geometry parameter is 'null' we skip the execution of this
            // method.
            if (coords) {
                // var coords = this._convertCoordsFromOpenLayers(openlayers_geometry);
                var c = this._hexToRGB(color);
                this.getViewer().addAreaOfInterest(coords, [c.r / 255, c.g / 255, c.b / 255, 1]);
            }
        },

        _hexToRGB: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        _removeAllOverlays: function() {
            this.getViewer().removeAllOverlays();
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

        // arg.id: bboxSelection, polygonSelection, lineSelection, pointSelection
        // arg.active: true, false
        _onSelectionActivated: function(arg) {
            if (arg.active) {
                this.getViewer().enableAOISelection(arg.id);
            } else {
                this.getViewer().disableAOISelection();
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
        },

        _sortOverlayLayers: function() {
            this.getViewer().sortOverlayLayers();
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
                duration: 100
            }
            this.zoomTo(position);
        },

        zoomTo: function(position) {
            this.getViewer().zoomTo(position);
        },

        _createVGV: function() {
            var vgv = new VGV({
                canvas: this.el,
                w3dsBaseUrl: Communicator.mediator.config.backendConfig.W3DSDataUrl
            });

            vgv.setOnPanEventCallback(function(navigation, dx, dy) {
                var pos = navigation.save(),
                    dist = pos.distance,
                    map_dist = 1;

                console.log('dist:' + dist);

                if (dist > 3) {
                    map_dist = 14;
                } else if (dist > 2.8 && dist <= 3) {
                    map_dist = 13;
                } else if (dist > 2.6 && dist <= 2.8) {
                    map_dist = 12;
                } else if (dist > 2.4 && dist <= 2.6) {
                    map_dist = 11;
                } else if (dist > 2.2 && dist <= 2.4) {
                    map_dist = 10;
                } else if (dist > 2.0 && dist <= 2.2) {
                    map_dist = 9;
                } else if (dist > 1.8 && dist <= 2.0) {
                    map_dist = 8;
                } else if (dist > 1.6 && dist <= 1.8) {
                    map_dist = 7;
                } else if (dist > 1.4 && dist <= 1.6) {
                    map_dist = 6;
                } else if (dist > 1.2 && dist <= 1.4) {
                    map_dist = 5;
                } else if (dist > 1.0 && dist <= 1.2) {
                    map_dist = 4;
                } else if (dist > 0.8 && dist <= 1.0) {
                    map_dist = 3;
                };

                console.log('map_dist: ' + map_dist);

                this.stopListening(Communicator.mediator, 'map:center');
                Communicator.mediator.trigger("map:center", {
                    x: pos.geoCenter[0],
                    y: pos.geoCenter[1],
                    l: 4
                });
                this.listenTo(Communicator.mediator, 'map:center', this._onMapCenter);
            }.bind(this));

            // When a new AOI is selected in the viewer this callback gets executed:
            vgv.setOnNewAOICallback(function(aoi_coords) {
                // FIXXME: I'm using Openlayers here to calculate the bounds, this has to be fixed somewhen...
                var bounds = new OpenLayers.Bounds();
                for (var idx = 0; idx < aoi_coords.length; idx++) {
                    bounds.extend(new OpenLayers.Geometry.Point(aoi_coords[idx].x, aoi_coords[idx].y));
                };

                var b = bounds.toArray();

                this.stopListening(Communicator.mediator, 'selection:changed');
                Communicator.mediator.trigger('selection:changed', b, aoi_coords);
                this.listenTo(Communicator.mediator, 'selection:changed', this._addAreaOfInterest);
            }.bind(this));


            // console.log('W3DS data url: ' + Communicator.mediator.config.backendConfig.W3DSDataUrl);

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

    return VirtualGlobeView;

}); // end module definition