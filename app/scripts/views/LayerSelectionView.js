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
		                		products.push(globals.swarm.products[p.get("id")]['Alpha'])
		                	}
		                	if ($('#betacheck').is(':checked')){
		                		products.push(globals.swarm.products[p.get("id")]['Bravo'])
		                	}
		                	if($('#charliecheck').is(':checked')){
		                		products.push(globals.swarm.products[p.get("id")]['Charlie'])
		                	}
	                	}
	                }
				});

				Communicator.mediator.trigger('map:multilayer:change', products);

        		for (var i = globals.swarm.activeProducts.length - 1; i >= 0; i--) {

        			var indexofproduct = products.indexOf(globals.swarm.activeProducts[i]);
        			// If previously active product no longer active need to deactivate it
        			if(indexofproduct == -1){

        				globals.products.forEach(function(p){
                			if(p.get("download").id == globals.swarm.activeProducts[i]){
                				p.set("visible", false);
                				Communicator.mediator.trigger('map:layer:change', {
                					name: p.get("name"),
                					isBaseLayer: false,
                					visible: false
                				});
                				globals.swarm.activeProducts.splice(i, 1);
                			}
                		});
        			}else{
        				// If it is already in the list it does not need to be activated again
        				products.splice(indexofproduct, 1);
        			}
        		}

        		// Activate all other layers
            	for (var i = products.length - 1; i >= 0; i--) {

            		globals.products.forEach(function(p){

            			if(p.get("download").id == products[i]){
            				p.set("visible", true);
            				Communicator.mediator.trigger('map:layer:change', {
            					name: p.get("name"),
            					isBaseLayer: false,
            					visible: true
            				});
            				globals.swarm.activeProducts.push(products[i]);
            			}
            		});
            	}
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