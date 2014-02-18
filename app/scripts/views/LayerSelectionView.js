(function() {
	'use strict';

	var root = this;

	root.define([
		'backbone',
		'communicator',
		'globals',
		'underscore'
	],

	function( Backbone, Communicator, globals, UIElementTmpl ) {

		var LayerSelectionView = Backbone.Marionette.CollectionView.extend({

			tagName: "ul",

			initialize: function(options) {
			},

			onShow: function(view){

				this.listenTo(Communicator.mediator, "productCollection:updateSort", this.updateSort);
				this.listenTo(Communicator.mediator, "map:layer:change", this.onLayerSelectionChange);

				$( ".sortable" ).sortable({
					revert: true,

					stop: function(event, ui) {
						ui.item.trigger('drop', ui.item.index());
		        	}
			    });
			},

			updateSort: function(options) {         
		        this.collection.remove(options.model);

		        this.collection.each(function (model, index) {
		            var ordinal = index;
		            if (index >= options.position)
		                ordinal += 1;
		            model.set('ordinal', ordinal);
		        });            

		        options.model.set('ordinal', options.position);
		        this.collection.add(options.model, {at: options.position});

		        this.render();
		        
		        Communicator.mediator.trigger("productCollection:sortUpdated");
		    },

			onLayerSelectionChange: function(options) {
				if (options.isBaseLayer){
	                globals.baseLayers.forEach(function(model, index) {
	                    model.set("visible", false);
	                });
	                globals.baseLayers.find(function(model) { return model.get('name') == options.name; }).set("visible", true);
                } else {
                    var product = globals.products.find(function(model) { return model.get('name') == options.name; });
                    if (product){
                            product.set("visible", options.visible);
                    }else{
                            globals.overlays.find(function(model) { return model.get('name') == options.name; }).set("visible", options.visible);
                    }
                }
			},
		});
		
		return {'LayerSelectionView':LayerSelectionView};
	});

}).call( this );