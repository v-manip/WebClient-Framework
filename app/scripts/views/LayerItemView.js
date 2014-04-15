(function() {
	'use strict';
	var root = this;
	root.define([
		'backbone',
		'communicator',
		'views/AuthView',
		'models/AuthModel',
		'hbs!tmpl/BulletLayer',
		'hbs!tmpl/iFrame',
		'globals',
		'app',
		'underscore'
	],
	function( Backbone, Communicator, av, am, BulletLayerTmpl, iFrameTmpl, globals, App) {
		var LayerItemView = Backbone.Marionette.ItemView.extend({
			tagName: "li",
			events: {
				'drop' : 'drop',
				'change': 'onChange',
				'click .fa-adjust': 'onOpenSlider',
				'slide .ui-slider': 'onOpacityAdjust'
			},

			initialize: function(options) {

				this.$slider = $('<div>').slider({
			        range: "max",
			        max: 100,
			        min: 0
			    });
			    this.$slider.width(100);
			    this.authview = null;
			},
			onShow: function(view){

				$( ".sortable" ).sortable({
					revert: true,
					delay: 90,
					containment: ".layercontrol .panel-body",
					axis: "y",
					forceHelperSize: true,
					forcePlaceHolderSize: true,
					placeholder: "sortable-placeholder",
					handle: '.fa-sort',
					start: function(event, ui) {
						$( ".ui-slider" ).detach();
						$('.fa-adjust').toggleClass('active')
						$('.fa-adjust').popover('hide');
					},
					stop: function(event, ui) {
						ui.item.trigger('drop', ui.item.index());
		        	}
			    });

			    $('.fa-adjust').popover({
        			trigger: 'manual'
    			});
			},


			onChange: function(evt){
                var isBaseLayer = false;
                if (this.model.get('view').isBaseLayer)
                	isBaseLayer = true;
                var options = { name: this.model.get('name'), isBaseLayer: isBaseLayer, visible: evt.target.checked };
                if( !isBaseLayer && evt.target.checked ){
                	var layer = globals.products.find(function(model) { return model.get('name') == options.name; });
                    if (layer != -1) {
                    	// TODO: Here we should go through all views, or maybe only url is necessary?
                    	var url = layer.get('views')[0].urls[0];
                    	
                    	if (url.indexOf('https') > -1){
	                    	$.ajax({
							    url: url,
							    type: "GET",
							    dataType:"text xml",
							    success: function(xml, textStatus, xhr) {
							        console.log(arguments);
							        console.log(xhr.status);
							    },
							    complete: function(xhr, textStatus) {
							        console.log(xhr.status);
							    },
							    error: function(jqXHR, textStatus, errorThrown) {

							    	console.log(jqXHR, textStatus, errorThrown);

							    	this.authview = new av.AuthView({
							    		model: new am.AuthModel({url:url}),
							    		template: iFrameTmpl,
							    		layerprop: options
							    	});

							    	Communicator.mediator.trigger("progress:change", false);

							    	App.optionsBar.show(this.authview);
							    }
							});
	                    }else{
	                    	Communicator.mediator.trigger('map:layer:change', options);
	                    }
                    }
                } else if (!evt.target.checked){
                	Communicator.mediator.trigger('map:layer:change', options);
                }
            },

            drop: function(event, index) {
		        Communicator.mediator.trigger('productCollection:updateSort', {model:this.model, position:index});
		    },

		    onOpenSlider: function(evt){

		    	if (this.$('.fa-adjust').toggleClass('active').hasClass('active')) {
		            this.$('.fa-adjust').popover('show');
		            this.$('.popover-content')
		                .empty()
		                .append(this.$slider);
		            this.$( ".ui-slider" ).slider( "option", "value", this.model.get("opacity") * 100 );


		        } else {
		            this.$slider.detach();
		            this.$('.fa-adjust').popover('hide');
		        }
		    },

		    onOpacityAdjust: function(evt, ui) {
		    	this.model.set("opacity", ui.value/100);
		    	Communicator.mediator.trigger('productCollection:updateOpacity', {model:this.model, value:ui.value/100});
		    }

		});
		return {'LayerItemView':LayerItemView};
	});
}).call( this );
