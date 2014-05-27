define([
    'core/BaseView',
    'app',
    './XTKViewer/Viewer'
], function(BaseView, App, XTKViewer) {

    'use strict';

    var SliceView = BaseView.extend({

        className: 'sliceview',

        cacheViewerInstance: true, // this is the default

        // template: {
        //  type: 'handlebars',
        //  template: VirtualSliceViewTmpl
        // },

        initialize: function(opts) {
            // Initialize parent upfront to have this.legacyContext() initialized:
            BaseView.prototype.initialize.call(this, opts);
            this.enableEmptyView(true); // this is the default

            this.currentToI = null;
            // Set a default AoI and Layer  as the timeline can be changed even if no AoI and Layer is selected in the WebClient:
            this.currentAoI = [17.6726953125, 56.8705859375, 19.3865625, 58.12302734375];

            // FIXXME: read from config!
            var backend = this.legacyContext().backendConfig['MeshFactory'];
            this.baseURL = backend.url + 'service=W3DS&request=GetScene&crs=EPSG:4326&version=' + backend.version;

            // FIXXME: this should be triggered by the BaseView!
            this._setLayersFromAppContext();
        },

        onStartup: function(selected_layers) {
            // console.log('blalbu');
        },

        // FIXXME: this method should be put into the BaseView to do a basic setup of
        // the component. Developers can then hook to the 'didInsertElement' function
        // in using VMANIP 'actions' (via an 'afterDOMInsert' action). 'Actions' have
        // to be implemented first ;-)
        didInsertElement: function() {
            if (!this.getViewer()) {
                // FIXXME: Necessary to trigger 'onStartup()'. This has to be triggered
                // directly in the BaseView!
                this._setLayersFromAppContext();
            }

            // FIXXME: After implementing VMANIP 'actions' most of the 'listenTo' calls
            // can be done implicitly in reading the 'actions' has and wiring up the
            // onXXXHandler() actions there to the corresponding mediator event. This will
            // help to do a cleanup of this repetitive code.
            this.listenTo(this.legacyContext(), 'map:layer:change', this._onLayerChange);
            this.listenTo(this.legacyContext(), 'selection:changed', this._setCurrentAoI);
            this.listenTo(this.legacyContext(), 'time:change', this._onTimeChange);
        },

        didRemoveElement: function() {
            // NOTE: The 'listenTo' bindings are automatically unbound by marionette
        },

        supportsLayer: function(model) {
            // NOTE: Currently we only take into account 'WMS' layers for the RBV:
            var view = _.find(model.get('views'), function(view) {
                return view.protocol.toLowerCase() === 'w3ds' &&
                    (view.type.toLowerCase() === 'volumetric' || view.type.toLowerCase() === 'vertical_curtain');
            });

            if (view) {
                return view;
            }

            return null;
        },

        //-------------------------//
        // VMANIP ACTIONS //
        //------------------------//

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
                this.getViewer().onResize();
            }
        },

        onLayerAdd: function(model, isBaseLayer, views) {
            if (!this.currentToI) {
                return;
            };

            _.forEach(views, function(view) {
                console.log('[SliceView::onLayerAdd] adding: ' + view.id + ' of type "' + view.type + '"');

                // FIXXME: use _update() here!
                var data_url_base = this.baseURL;
                data_url_base += '&boundingBox=' + this.currentAoI;
                data_url_base += '&time=' + this.currentToI;
                data_url_base += '&layer=' + view.id;

                if (view.type === 'volumetric') {
                    this._addVolume(view.id, data_url_base);
                } else if (view.type === 'vertical_curtain') {
                    this._addMesh(view.id, data_url_base);
                }
            }.bind(this));
        },

        onLayerRemove: function(model, isBaseLayer, views) {
            _.forEach(views, function(view) {
                // var layer = this.context.getLayerById(view.id, 'imagery');
                // this.context.trigger('change:layer:visibility', layer, true);
                console.log('[SliceView::onLayerRemove] removing: ' + view.id);
                this._removeVolume(view.id);
            }.bind(this));
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

        _setCurrentAoI: function(bounds) {
            // If the releases the mouse button to finish the selection of
            // an AoI the 'area' parameter is set, otherwise it is 'null'.
            if (bounds) {
                // 1. store current AoI bounds
                this.currentAoI = bounds.toString();

                // 2. store current ToI interval
                var toi = this.currentToI;
                // In case no ToI was set during the lifecycle of this viewer we can access
                // the time of interest from the global context:
                if (!toi) {
                    var starttime = new Date(this.legacyContext().timeOfInterest.start);
                    var endtime = new Date(this.legacyContext().timeOfInterest.end);

                    toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
                }

                // Remove all currently shown volumes and request the new data to update the view:
                this._update();
            }
        },

        _onTimeChange: function(time) {
            var starttime = new Date(time.start);
            var endtime = new Date(time.end);

            this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();

            // Remove all currently shown volumes and request the new data to update the view:
            this._update();
        },

        _update: function() {
            _.forEach(this.selectedLayers(), function(layer_info, key) {
                var view = this.supportsLayer(layer_info.model);

                if (!view) {
                    return;
                }

                var data_url_base = this.baseURL;
                data_url_base += '&boundingBox=' + this.currentAoI;
                data_url_base += '&time=' + this.currentToI;
                data_url_base += '&layer=' + view.id;

                if (view.type === 'volumetric') {
                    this._addVolume(view.id, data_url_base);
                } else if (view.type === 'vertical_curtain') {
                    this._addMesh(view.id, data_url_base);
                }
            }.bind(this));
        },

        _createViewer: function() {
            return new XTKViewer({
                elem: this.el,
                backgroundColor: [0.005, 0.005, 0.005],
                // cameraPosition: [120, 80, 160]
                cameraPosition: [2, 10, 10]
            });
        },

        _addVolume: function(layer, base_url) {
            this.enableEmptyView(false);
            this.onShow();

            // FIXXME: If the viewer is not instantiated here, but in 'didInsertElemnet' the
            // volumes are not displayed. No idea why...
            if (!this.getViewer()) {
                this.setViewer(this._createViewer());
            }

            //
            // Add a volume to the viewer:
            //

            // TESTDATA:
            // volume_url = './data/mptest.response';
            //volume_url = 'http://demo.v-manip.eox.at/browse/ows?service=W3DS&request=GetScene&crs=EPSG:4326&version=1.0.0&boundingBox=-23.141513671875,62.896319434756,-15.033603515625,67.137042091006&time=2013-05-17T11:00:00.000Z/2013-05-17T11:17:00.000Z&layer=Cris&format=model/nii-gz';
            // volume_url = 'http://localhost:9000/ows?service=W3DS&request=GetScene&crs=EPSG:4326&version=1.0.0&boundingBox=-23.141513671875,62.896319434756,-15.033603515625,67.137042091006&time=2013-05-17T11:00:00.000Z/2013-05-17T11:17:00.000Z&layer=Cris&format=model/nii-gz';
            // volume_url = './data/Temperature.nii.gz';

            var volume_url = base_url + '&format=model/nii-gz';

            K3D.load(volume_url, function(data, isMultiPart) {
                this.getViewer().addVolume({
                    filename: layer,
                    data: data,
                    isMultiPart: isMultiPart,
                    label: layer,
                    volumeRendering: true,
                    upperThreshold: 219,
                    opacity: 0.3,
                    minColor: [0.4, 0.4, 0.4],
                    maxColor: [0, 0, 0],
                    reslicing: false
                });
            }.bind(this));
            // }.bind(this), 'text/plain');
        },

        // _addVolume: function(layer_id, url_base) {
        //      this.enableEmptyView(false);
        //      this.onShow();

        //      // FIXXME: If the viewer is not instantiated here, but in 'didInsertElemet' the
        //      // volumes are not displayed. No idea why...
        //      if (!this.getViewer()) {
        //          this.setViewer(this._createViewer());
        //      }

        //      //
        //      // Add a volume to the viewer:
        //      //

        //      // Testdata sets:
        //      // var volume_url = './data/mptest.response';
        //      // var volume_url = 'http://demo.v-manip.eox.at/browse/ows?service=W3DS&request=GetScene&crs=EPSG:4326&version=1.0.0&boundingBox=-23.141513671875,62.896319434756,-15.033603515625,67.137042091006&time=2013-05-17T11:00:00.000Z/2013-05-17T11:17:00.000Z&layer=Cris&format=model/nii-gz';
        //      // var volume_url = 'http://localhost:9000/ows?service=W3DS&request=GetScene&crs=EPSG:4326&version=1.0.0&boundingBox=-23.141513671875,62.896319434756,-15.033603515625,67.137042091006&time=2013-05-17T11:00:00.000Z/2013-05-17T11:17:00.000Z&layer=Cris&format=model/nii-gz';
        //      // var volume_url = './data/Temperature.nii.gz';
        //      var volume_url = url_base + '&format=model/nii-gz';

        //      K3D.load(volume_url, function(data, isMultiPart) {
        //          this.getViewer().addVolume({
        //              filename: layer_id,
        //              data: data,
        //              isMultiPart: isMultiPart,
        //              label: layer_id,
        //              volumeRendering: true,
        //              upperThreshold: 219,
        //              opacity: 0.3,
        //              minColor: [0.4, 0.4, 0.4],
        //              maxColor: [0, 0, 0],
        //              reslicing: false
        //          });
        //      }.bind(this));
        //      // }.bind(this), 'text/plain');
        //  },

        _addMesh: function(layer_id, url_base) {
            this.enableEmptyView(false);
            this.onShow();

            // FIXXME: If the viewer is not instantiated here, but in 'didInsertElemet' the
            // meshes are not displayed. No idea why...
            if (!this.getViewer()) {
                this.setViewer(this._createViewer());
            }

            // Testdata sets:
            // model_url = './data/mptest.response';
            // model_url = 'http://demo.v-manip.eox.at/browse/ows?service=W3DS&request=GetScene&crs=EPSG:4326&version=1.0.0&boundingBox=-50.180703125,0.61869140625,70.0195703125,90.84525390625&time=2013-05-17T15:51:30.000Z/2013-05-17T15:54:06.000Z&layer=Cloudsat';

            var model_url = url_base + '&format=model/obj';

            K3D.load(model_url, function(data, isMultiPart) {
                if (!isMultiPart) {
                    // For now we only support multipart responses
                    return;
                } else {
                    // FIXXME: no error handling at the moment, the data has
                    // to be in the expected format, otherwise the code will
                    // fail!

                    // FIXXME: test data until the mesh_factory sends a reasonable response for 'model/obj'
                    if (true) {
                        this.getViewer().addMesh({
                            models: data['model/obj'],
                            mtls: data['text/plain'],
                            textures: data['image/png'],
                            label: layer_id
                        });
                    } else {
                        var base_url = 'data/curtain-obj/1143645b-49d5-4da0-b9fb-b519d24f75b3',
                            obj = base_url + '.obj',
                            mtl = base_url + '.mtl',
                            png0 = 'data/curtain-obj/159be6d2-2913-40eb-8a7f-d8807d7d3bd1.png',
                            png1 = 'data/curtain-obj/629bd189-e29e-461f-954f-36702067f987.png',
                            png2 = 'data/curtain-obj/6368222a-9686-42b2-8b5d-ceca917ed263.png',
                            that = this;

                        K3D.load(obj, function(obj_str) {
                            K3D.load(mtl, function(mtl_str) {
                                K3D.load(png0, function(png0_data) {
                                    K3D.load(png1, function(png1_data) {
                                        K3D.load(png2, function(png2_data) {
                                            data = {
                                                'model/obj': [obj_str['application/x-tgif'][0]],
                                                'text/plain': [mtl_str['application/octet-stream'][0]],
                                                'image/png': {
                                                    '159be6d2-2913-40eb-8a7f-d8807d7d3bd1.png': png0_data['image/png'][0]['entry-0'],
                                                    '629bd189-e29e-461f-954f-36702067f987.png': png1_data['image/png'][0]['entry-0'],
                                                    '6368222a-9686-42b2-8b5d-ceca917ed263.png': png2_data['image/png'][0]['entry-0']
                                                }
                                            };

                                            that.getViewer().addMesh({
                                                models: data['model/obj'],
                                                mtls: data['text/plain'],
                                                textures: data['image/png'],
                                                label: layer_id
                                            });
                                        }, 'arraybuffer');
                                    }, 'arraybuffer');
                                }, 'arraybuffer');
                            }, 'text/plain');
                        }, 'text/plain');
                    };
                }
                // }.bind(this));
            }.bind(this), 'text/plain');

            // STATIC TEST VERSION:

            // var model_base = 'data/curtain-obj/1143645b-49d5-4da0-b9fb-b519d24f75b3-scaled';
            // // var model_base = 'data/curtain-obj/1143645b-49d5-4da0-b9fb-b519d24f75b3';
            // // var model_base = 'data/curtain-obj/box-tex';

            // layer = "Cloudsat";
            // var model_url = this.baseURL;
            // model_url += '&boundingBox=' + aoi;
            // model_url += '&time=' + toi;
            // model_url += '&layer=' + layer;
            // model_url += '&format=model/obj';

            // var tex_url = this.baseURL;
            // tex_url += '&boundingBox=' + aoi;
            // tex_url += '&time=' + toi;
            // tex_url += '&layer=' + layer;
            // tex_url += '&format=image/png';

            // var request = new XMLHttpRequest(),
            //     request2 = new XMLHttpRequest(),
            //     that = this;

            // request.onload = function(evt) {
            //     console.log('data: ' + this.response);
            //     var objdata = this.response;


            //     request2.onload = function(evt) {
            //         console.log('data: ' + this.response);
            //         var mtldata = this.response;

            //         that.getViewer().addMesh({
            //             // FIXXME: hack to satisfy xtk, which obviously determines the format of the volume data by the ending of the url it gets.
            //             // I appended a dummy file here, so xtk gets the format, the backend W3DS server will simply discard the extra parameter...
            //             // model_filename: model_url + '&dummy.obj',
            //             model_filename: 'dummy.obj',
            //             filedata: objdata,
            //             mtldata: mtldata
            //         });
            //     }

            //     model_url = model_base + '.mtl';
            //     request2.open('GET', model_url, true);
            //     request2.responseType = 'arraybuffer';
            //     // request.responseType = 'text/plain';
            //     request2.send(null);
            // }

            // model_url = model_base + '.obj';
            // request.open('GET', model_url, true);
            // request.responseType = 'arraybuffer';
            // // request.responseType = 'text/plain';
            // request.send(null);
        },
        _removeVolume: function(layer_name) {
            this.getViewer().removeObject(layer_name);
        }
    });

    return SliceView;

}); // end module definition