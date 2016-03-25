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

				this.listenTo(Communicator.mediator, "layer:activate", this.layerActivate);

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

    			var that = this;

    			if (this.$el.has( ".fa-sliders" ).length){
	    			this.$el.find('.fa-sliders').click(function(){
	    				
	    				if (_.isUndefined(App.layerSettings.isClosed) || App.layerSettings.isClosed) {
	    					App.layerSettings.setModel(that.model);
							App.optionsBar.show(App.layerSettings);
						} else {
							if(App.layerSettings.sameModel(that.model)){
								App.optionsBar.close();
							}else{
								App.layerSettings.setModel(that.model);
								App.optionsBar.show(App.layerSettings);
							}
						}
	    			});
	    		}
			},


			onChange: function(evt){

                var isBaseLayer = false;
                if (this.model.get('view').isBaseLayer)
                	isBaseLayer = true;

                var options = { name: this.model.get('name'), isBaseLayer: isBaseLayer, visible: evt.target.checked };

                if( !isBaseLayer && evt.target.checked ){

                	var layer = globals.products.find(function(model) { return model.get('name') == options.name; });
                    if (layer != -1  && !(typeof layer === 'undefined')) {

                    	if(options.visible)
                    		this.model.set("visible", true);
                    	else
                    		this.model.set("visible", false);

                    	// TODO: Here we should go through all views, or maybe only url is necessary?
                    	var url = layer.get('views')[0].urls[0]+"?";
                    	

                    	if (url.indexOf('https') > -1){

                    		var layer = layer.get('views')[0].id;
							var req = "LAYERS=" + layer + "&TRANSPARENT=true&FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&SRS=EPSG%3A4326";
							req += "&BBOX=33.75,56.25,33.80,56.50&WIDTH=2&HEIGHT=2";
							req = url + req;

	                    	$.ajax({
							    url: req,
							    type: "GET",
							    suppressErrors: true,
							    xhrFields: {
							      withCredentials: true
							   	},
							    success: function(xml, textStatus, xhr) {
							        Communicator.mediator.trigger('map:layer:change', options);
							    },
							    error: function(jqXHR, textStatus, errorThrown) {
							    	if (jqXHR.status == 403){
							    		$("#error-messages").append(
					                              '<div class="alert alert-warning alert-danger">'+
					                              '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+
					                              '<strong>Warning!</strong> You are not authorized to access this product' +
					                            '</div>'
					                    );
							    	}else{
							    		this.authview = new av.AuthView({
								    		model: new am.AuthModel({url:req}),
								    		template: iFrameTmpl,
								    		layerprop: options
								    	});
								    	Communicator.mediator.trigger("progress:change", false);
								    	App.optionsBar.show(this.authview);
							    	}
							    }
							});
	                    }else if(this.model.get('views')[0].protocol == "WPS"){
	                    	if(this.model.get('shc')){
	                    		// If an shc file was loaded acticate layer as normal
	                    		Communicator.mediator.trigger('map:layer:change', options);
	                    	}else{
	                    		// If an shc file is not loaded open settings and show message to select shc file
	                    		if (_.isUndefined(App.layerSettings.isClosed) || App.layerSettings.isClosed) {
			    					App.layerSettings.setModel(this.model);
									App.optionsBar.show(App.layerSettings);
								} else {
									if(App.layerSettings.sameModel(this.model)){
										App.optionsBar.close();
									}else{
										App.layerSettings.setModel(this.model);
										App.optionsBar.show(App.layerSettings);
									}
								}
								$("#error-messages").append(
			                              '<div class="alert alert-info">'+
			                              '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+
			                              'Please click on Upload SHC and select a spherical harmonics coefficients file before activating this layer' +
			                            '</div>'
			                    );

			                    var checkbox = $( "input[type$='checkbox']", this.$el);
		    					//checkbox.attr('checked', false);
		    					checkbox.prop( "checked", false );
		    					//checkbox.disableSelection();
	                    	}

	                    }else{
	                    	Communicator.mediator.trigger('map:layer:change', options);
	                    }
                    }else if (typeof layer === 'undefined'){
	                	Communicator.mediator.trigger('map:layer:change', options);
	                }
                } else if (!evt.target.checked){
                	Communicator.mediator.trigger('map:layer:change', options);

                } else if (isBaseLayer && evt.target.checked){
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
		    },

		    layerActivate: function(layer){
		    	if(this.model.get('views') && this.model.get('views')[0].id == layer){
		    		//this.model.set("visible", true);
		    		var checkbox = $( "input[type$='checkbox']", this.$el);
		    		//checkbox.attr('checked', true);
		    		checkbox.prop( "checked", true );
		    	}
		    },

			onRender: function(){
				//TODO: This is a somwhat temporary solution, we need to think about
				// how we want to handle the DEM for the Virtual Globe
			 	if (this.model.get("name") == "Digital Elevation Model"){
			 		this.$el.empty();
			 	}
			 }

		});
		return {'LayerItemView':LayerItemView};
	});
}).call( this );
