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
				// Initially tell the models in the collection, which layer ordinal they have:
				var idx = 0;


				// Add generic product (which is container for A,B and C sats)
				this.collection.add({
					name: "Bubble Index data (IBI)",
					visible: false,
					color: "red",
					protocol: null,
					containerproduct: true,
					id: "IBI"
				}, {at: 0});
				this.collection.add({
					name: "Plasma data (EFI PL)",
					visible: false,
					color: "red",
					protocol: null,
					containerproduct: true,
					id: "EFI"
				}, {at: 0});
				this.collection.add({
					name: "Magnetic data (MAG LR)",
					visible: false,
					color: "red",
					protocol: null,
					containerproduct: true,
					id: "MAG"
				}, {at: 0});

				this.collection.forEach(function(model) {
					model.set('ordinal', idx++);
					// console.log('[LayerSeleectionView::initialize] layer: ' + model.get('view').id + ' / ordinal: ' + model.get('ordinal'));
				});
			},

			onShow: function(view){

				var self = this;

				this.listenTo(Communicator.mediator, "productCollection:updateSort", this.updateSort);
				this.listenTo(Communicator.mediator, "map:layer:change", this.onLayerSelectionChange);


				$( ".sortable" ).sortable({
					revert: true,

					stop: function(event, ui) {
						ui.item.trigger('drop', ui.item.index());
		        	}
			    });

				$('#alphacheck').prop('checked', globals.swarm.satellites["Alpha"]);
				$('#betacheck').prop('checked', globals.swarm.satellites["Beta"]);
				$('#charliecheck').prop('checked', globals.swarm.satellites["Charlie"]);

				$('#alphacheck').change(function(evt){
					globals.swarm.satellites["Alpha"] = $('#alphacheck').is(':checked');
					self.checkMultiProduct();
				});
				$('#betacheck').change(function(evt){
					globals.swarm.satellites["Beta"] = $('#betacheck').is(':checked');
					self.checkMultiProduct();
				});
				$('#charliecheck').change(function(evt){
					globals.swarm.satellites["Charlie"] = $('#charliecheck').is(':checked');
					self.checkMultiProduct();
				});

			},

			checkMultiProduct: function(){
				var that = this;
				var products = [];

				this.collection.forEach(function(p){

					if(p.get("containerproduct")){

						if(p.get("visible")){
	                		
		                	if($('#alphacheck').is(':checked')){
		                		if(p.get("id") == "MAG"){products.push("SW_OPER_MAGA_LR_1B");}
		                	}
		                	if ($('#betacheck').is(':checked')){
		                		if(p.get("id") == "MAG"){products.push("SW_OPER_MAGB_LR_1B");}
		                	}
		                	if($('#charliecheck').is(':checked')){
		                		if(p.get("id") == "MAG"){products.push("SW_OPER_MAGC_LR_1B");}

		                	}
	                	}
	                }
				});

				Communicator.mediator.trigger('map:multilayer:change', products);
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