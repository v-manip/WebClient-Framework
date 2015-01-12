define([
	'backbone.marionette',
	'app',
	'communicator',
	'./CesiumView'
], function(Marionette, App, Communicator, CesiumView) {

	'use strict';

	// The Controller takes care of the (private) implementation of a module. All functionality
	// is solely accessed via the controller. Therefore, also the Module.Router uses the Controller
	// for triggering actions caused by routing events.
	// The Controller has per definition only direct access to the View, it does not i.e. access
	// the Application object directly.
	var CesiumViewController = Backbone.Marionette.Controller.extend({

		initialize: function(opts) {
			this.id = opts.id;
			this.startPosition = opts.startPosition;
			//this.tileManager = new OpenLayers.TileManager();

			this.cesiumView = new CesiumView({
				startPosition: opts.startPosition,
				//tileManager: this.tileManager
			});

			this.connectToView();
		},

		getView: function(id) {
			return this.cesiumView;
		},

		centerAndZoom: function(x, y, l) {
			this.cesiumView.centerMap({
				x: x,
				y: y,
				l: l
			});
		},

		toggleDebug: function(){
			this.cesiumView.toggleDebug();
		},

		connectToView: function() {
			// this.cesiumView.listenTo(Communicator.mediator, "map:center", _.bind(this.cesiumView.centerMap, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, 'map:set:extent', _.bind(this.cesiumView.onSetExtent, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "map:layer:change", _.bind(this.cesiumView.changeLayer, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "productCollection:sortUpdated", _.bind(this.cesiumView.onSortProducts, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "productCollection:updateOpacity", _.bind(this.cesiumView.onUpdateOpacity, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "selection:activated", _.bind(this.cesiumView.onSelectionActivated, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "selection:changed", _.bind(this.cesiumView.onSelectionChanged, this.cesiumView));

			this.cesiumView.listenTo(Communicator.mediator, "cesium:highlight:point", _.bind(this.cesiumView.onHighlightPoint, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "cesium:highlight:removeAll", _.bind(this.cesiumView.onRemoveHighlights, this.cesiumView));

			this.cesiumView.listenTo(Communicator.mediator, "layer:range:changed", _.bind(this.cesiumView.onLayerRangeChanged, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "layer:band:changed", _.bind(this.cesiumView.onLayerBandChanged, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "layer:height:changed", _.bind(this.cesiumView.onLayerHeightChanged, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, "layer:style:changed", _.bind(this.cesiumView.onLayerStyleChanged, this.cesiumView));
			

			
			//this.cesiumView.listenTo(Communicator.mediator, "map:load:image", _.bind(this.cesiumView.onLoadImage, this.cesiumView));
			//this.cesiumView.listenTo(Communicator.mediator, "map:clear:image", _.bind(this.cesiumView.onClearImage, this.cesiumView));

			/*if (!this.cesiumView.isEventListenedTo("map:load:geojson"))
				this.cesiumView.listenTo(Communicator.mediator, "map:load:geojson", _.bind(this.cesiumView.onLoadGeoJSON, this.cesiumView));*/

	
			//this.cesiumView.listenTo(Communicator.mediator, "map:export:geojson", _.bind(this.cesiumView.onExportGeoJSON, this.cesiumView));
			this.cesiumView.listenTo(Communicator.mediator, 'time:change', _.bind(this.cesiumView.onTimeChange, this.cesiumView));
            

			//this.listenTo(Communicator.mediator, "selection:changed", _.bind(this.cesiumView.onSelectionChanged, this.cesiumView));

			//Communicator.reqres.setHandler('get:selection:json', _.bind(this.cesiumView.onGetGeoJSON, this.cesiumView));
			Communicator.reqres.setHandler('map:get:extent', _.bind(this.cesiumView.onGetMapExtent, this.cesiumView));

			this.cesiumView.listenTo(this.cesiumView.model, 'change', function(model, options) {
				/*Communicator.mediator.trigger("router:setUrl", {
					x: model.get('center')[0],
					y: model.get('center')[1],
					l: model.get('zoom')
				});*/
				/*Communicator.mediator.trigger("map:center", {
					x: model.get('center')[0],
					y: model.get('center')[1],
					l: model.get('zoom')
				});*/
			});
		},

		getStartPosition: function() {
			return this.startPosition;
		},

		isActive: function(){
			return !this.cesiumView.isClosed;
		}
	});

	return CesiumViewController;
});