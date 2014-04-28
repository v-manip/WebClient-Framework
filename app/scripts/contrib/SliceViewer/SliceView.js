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
            this.currentLayer = 'h2o_vol_demo'; // FIXXME!

            // FIXXME: read from config!
            var backend = this.legacyContext().backendConfig['MeshFactory'];
            this.baseURL = backend.url + 'service=W3DS&request=GetScene&crs=EPSG:4326&version=' + backend.version;
        },

        didInsertElement: function() {
            this.listenTo(this.legacyContext(), 'selection:changed', this._setCurrentAoI);
            this.listenTo(this.legacyContext(), 'time:change', this._onTimeChange);
        },

        didRemoveElement: function() {
            // NOTE: The 'listenTo' bindings are automatically unbound by marionette
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

        onResize: function() {
            if (this.getViewer()) {
                this.getViewer().onResize();
            }
        },

        _setCurrentAoI: function(area) {
            // If the releases the mouse button to finish the selection of
            // an AoI the 'area' parameter is set, otherwise it is 'null'.
            if (area) {
                // 1. store current AoI bounds
                this.currentAoI = area.bounds.toString();

                // 2. store current ToI interval
                var toi = this.currentToI;
                // In case no ToI was set during the lifecycle of this viewer we can access
                // the time of interest from the global context:
                if (!toi) {
                    var starttime = new Date(this.legacyContext().timeOfInterest.start);
                    var endtime = new Date(this.legacyContext().timeOfInterest.end);

                    toi = this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();
                }

                // 3. store the current layer
                // FIXXME: integrate with context!
                this.currentLayer = 'h2o_vol_demo';

                // 4. add the data to the viewer
                this._addVolume(this.currentToI, this.currentAoI, this.currentLayer);
            }
        },

        _onTimeChange: function(time) {
            var starttime = new Date(time.start);
            var endtime = new Date(time.end);

            this.currentToI = starttime.toISOString() + '/' + endtime.toISOString();

            this._addVolume(this.currentToI, this.currentAoI, this.currentLayer);
        },

        _createViewer: function() {
            return new XTKViewer({
                elem: this.el,
                backgroundColor: [0.005, 0.005, 0.005],
                // cameraPosition: [120, 80, 160]
                cameraPosition: [2, 10, 10]
            });
        },

        _addVolume: function(toi, aoi, layer) {
            this.enableEmptyView(false);
            this.onShow();

            var volume_url = this.baseURL;
            volume_url += '&boundingBox=' + aoi;
            volume_url += '&time=' + toi;
            volume_url += '&layer=' + layer;
            volume_url += '&format=model/nii-gz';

            if (!this.getViewer()) {
                this.setViewer(this._createViewer());
            }

            //
            // Add a volume to the viewer:
            //

            this.getViewer().addVolume({
                // FIXXME: hack to satisfy xtk, which obviously determines the format of the volume data by the ending of the url it gets.
                // I appended a dummy file here, so xtk gets the format, the backend W3DS server will simply discard the extra parameter...
                filename: volume_url + '&dummy.nii',
                label: layer,
                volumeRendering: true,
                upperThreshold: 219,
                opacity: 0.3,
                minColor: [0.4, 0.4, 0.4],
                maxColor: [0, 0, 0],
                reslicing: false
            });

            //
            // Add a an eventual mesh to the viewer:
            //

            var model_base = 'data/curtain-obj/1143645b-49d5-4da0-b9fb-b519d24f75b3-scaled';
            // var model_base = 'data/curtain-obj/1143645b-49d5-4da0-b9fb-b519d24f75b3';
            // var model_base = 'data/curtain-obj/box-tex';

            layer = "Cloudsat";
            var model_url = this.baseURL;
            model_url += '&boundingBox=' + aoi;
            model_url += '&time=' + toi;
            model_url += '&layer=' + layer;
            model_url += '&format=model/obj';

            var tex_url = this.baseURL;
            tex_url += '&boundingBox=' + aoi;
            tex_url += '&time=' + toi;
            tex_url += '&layer=' + layer;
            tex_url += '&format=image/png';

            var request = new XMLHttpRequest(),
                request2 = new XMLHttpRequest(),
                that = this;

            request.onload = function(evt) {
                console.log('data: ' + this.response);
                var objdata = this.response;


                request2.onload = function(evt) {
                    console.log('data: ' + this.response);
                    var mtldata = this.response;

                    that.getViewer().addMesh({
                        // FIXXME: hack to satisfy xtk, which obviously determines the format of the volume data by the ending of the url it gets.
                        // I appended a dummy file here, so xtk gets the format, the backend W3DS server will simply discard the extra parameter...
                        // model_filename: model_url + '&dummy.obj',
                        model_filename: 'dummy.obj',
                        filedata: objdata,
                        mtldata: mtldata
                    });
                }

                model_url = model_base + '.mtl';
                request2.open('GET', model_url, true);
                request2.responseType = 'arraybuffer';
                // request.responseType = 'text/plain';
                request2.send(null);
            }

            model_url = model_base + '.obj';
            request.open('GET', model_url, true);
            request.responseType = 'arraybuffer';
            // request.responseType = 'text/plain';
            request.send(null);
        }
    });

    return SliceView;

}); // end module definition