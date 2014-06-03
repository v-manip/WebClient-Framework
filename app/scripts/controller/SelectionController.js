(function() {
	'use strict';

	var root = this;

	root.require([
		'backbone',
		'communicator',
    	'globals',
		'app',
    	'models/SelectionModel',
    	'openlayers'
	],

	function( Backbone, Communicator, globals, App, m ) {

		var SelectionController = Backbone.Marionette.Controller.extend({
			model: new m.SelectionModel(),

	    initialize: function(options){
	      	this.model.set('selections', []);

	      	// Openlayers format readers for loading geojson selections
			var io_options = {
				'internalProjection': new OpenLayers.Projection('EPSG:4326'),
				'externalProjection': new OpenLayers.Projection('EPSG:4326')
			};

			this.geojson = new OpenLayers.Format.GeoJSON(io_options);
			//this.colors = d3.scale.category10();


	        this.listenTo(Communicator.mediator, "selection:changed", this.onSelectionChange);
	        this.listenTo(Communicator.mediator, "map:load:geojson", this.onLoadGeoJSON);
		},

	    onSelectionChange: function(selection) {
	        if (selection != null) {
	        	var selections = this.model.get('selections');
	        	selections.push(selection);
	            this.model.set('selections', selections);
	        }else{
	        	this.model.set('selections', []);
	        }
		},

		
		onLoadGeoJSON: function(data) {
			
			var features = this.geojson.read(data);
			var bounds;
			if (features) {
				if (features.constructor != Array) {
					features = [features];
				}
				for (var i = 0; i < features.length; ++i) {
					if (!bounds) {
						bounds = features[i].geometry.getBounds();
					} else {
						bounds.extend(features[i].geometry.getBounds());
					}
					//var color = this.colors(i);
					//features[i].style = {fillColor: color, pointRadius: 6, strokeColor: color, fillOpacity: 0.5};
					Communicator.mediator.trigger("selection:changed", features[i]);
				}
				
				
				
				//this.vectorLayer.addFeatures(features);
				//this.map.zoomToExtent(bounds);
			}
		}


		});
		return new SelectionController();
	});

}).call( this );