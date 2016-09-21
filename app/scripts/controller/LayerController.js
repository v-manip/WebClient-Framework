(function() {
	'use strict';

	var root = this;

	root.require([
		'backbone',
		'communicator',
    	'globals',
		'app'
	],

	function( Backbone, Communicator, globals, App) {

		var LayerController = Backbone.Marionette.Controller.extend({

		    initialize: function(options){
		        //this.listenTo(Communicator.mediator, "ui:open:layercontrol", this.onLayerControlOpen);
		        this.listenTo(Communicator.mediator, "layer:activate", this.layerActivate);
		        this.listenTo(Communicator.mediator, "app:reset", this.OnAppReset);
		        this.layercontrolopen = false;
			},

			/*onLayerControlOpen: function () {
		       this.layercontrolopen = !this.layercontrolopen;
		       if(this.layercontrolopen){
		       		this.stopListening(Communicator.mediator, "ui:open:layercontrol");
		       }else{
		       		this.listenTo(Communicator.mediator, "ui:open:layercontrol", this.onLayerControlOpen);
		       }
		    },*/

		   	layerActivate: function(layer){

	            var layer_model = globals.products.find(function(model) { 
	            	if(model.get('views'))
	            		return model.get('views')[0].id == layer;
	            	else 
	            		return false; 
	            });

	            var options = {};
	            if (layer_model) {
		        	if(layer_model.get('visible')){
		        		options = { name: layer_model.get('name'), isBaseLayer: false, visible: false };
		        		layer_model.set('visible',false);
		          	}else{
		            	options = { name: layer_model.get('name'), isBaseLayer: false, visible: true };
		            	layer_model.set('visible',true);
		          	}
		          	Communicator.mediator.trigger('map:layer:change', options);
	            }else{
	            	layer_model = globals.swarm.filtered_collection.find(function(model) { 
		            	if(model.get('id'))
		            		return model.get('id') == layer;
		            	else 
		            		return false; 
		            });
		            
		            if(layer_model){
		            	/*var product_keys = _.keys(globals.swarm.products[layer_model.get("id")]);

                		for (var i = product_keys.length - 1; i >= 0; i--) {
            				globals.products.forEach(function(p){
	                			if(p.get("download").id == globals.swarm.products[layer_model.get("id")][product_keys[i]]){
	                				if(!p.get("visible") && globals.swarm.satellites[product_keys[i]]){

	                				}else{
		                				p.set("visible", false);
		                				Communicator.mediator.trigger('map:layer:change', {
		                					name: p.get("name"),
		                					isBaseLayer: false,
		                					visible: false
		                				});
		                				var indexofactiveproduct = globals.swarm.activeProducts.indexOf(p.get("download").id);
		                				globals.swarm.activeProducts.splice(indexofactiveproduct, 1);
	                				}
	                			}
	                		});
                		}*/
		            }
	            }
			    
			},

			OnAppReset: function(){
				globals.products.each(function(layer){
					if(layer.get('visible')){
		        		var options = { name: layer.get('name'), isBaseLayer: false, visible: false };
		        		layer.set('visible',false);
		        		Communicator.mediator.trigger('map:layer:change', options);
		          	}
				});
			}
		});
		return new LayerController();
	});

}).call( this );