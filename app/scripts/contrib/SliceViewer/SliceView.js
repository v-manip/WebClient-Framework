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
        // 	type: 'handlebars',
        // 	template: VirtualSliceViewTmpl
        // },

        initialize: function(opts) {
            // Initialize parent upfront to have this.legacyContext() initialized:
            BaseView.prototype.initialize.call(this, opts);
            this.enableEmptyView(true); // this is the default

            this.currentToI = null;
            // Set a default AoI and Layer  as the timeline can be changed even if no AoI and Layer is selected in the WebClient:
            this.currentAoI = [17.6726953125, 56.8705859375, 19.3865625, 58.12302734375];
            this.currentLayer = 'Cris'; // FIXXME!

            // FIXXME: read from config!
            var backend = this.legacyContext().backendConfig['MeshFactory'];
            this.baseURL = backend.url + 'service=W3DS&request=GetScene&crs=EPSG:4326&format=model/nii-gz&version=' + backend.version;
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
                this.currentLayer = 'Cris';

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
                cameraPosition: [120, 80, 160]
            });
        },

        _addVolume: function(toi, aoi, layer) {
            this.enableEmptyView(false);
            this.onShow();

            var url = this.baseURL;
            url += '&boundingBox=' + aoi;
            url += '&time=' + toi;
            url += '&layer=' + layer;

            if (!this.getViewer()) {
                this.setViewer(this._createViewer());
            }

            this.getViewer().addVolume({
                // FIXXME: creative hack to satisfy xtk, which obviously determines the format of the volume data by the ending of the url it gets.
                // I appended a dummy file here, so xtk gets the format, the backend W3DS server will simply discard the extra parameter...
                filename: url + '&dummy.nii.gz', //'http://x.babymri.org/?vol.nrrd',
                label: layer,
                volumeRendering: true,
                upperThreshold: 219,
                opacity: 0.3,
                minColor: [0.4, 0.4, 0.4],
                maxColor: [0, 0, 0],
                reslicing: false
            });
        }
    });

    return SliceView;

}); // end module definition