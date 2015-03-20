(function() {
	'use strict';

	var root = this;

	root.require([
		'backbone',
		'communicator',
		'app'
	],

	function( Backbone, Communicator, App ) {

		var ContentController = Backbone.Marionette.Controller.extend({
            initialize: function(options){
            	this.listenTo(Communicator.mediator, "dialog:open:about", this.onDialogOpenAbout);
            	this.listenTo(Communicator.mediator, "ui:open:layercontrol", this.onLayerControlOpen);
            	this.listenTo(Communicator.mediator, "ui:open:toolselection", this.onToolSelectionOpen);
				this.listenTo(Communicator.mediator, "ui:open:options", this.onOptionsOpen);
				this.listenTo(Communicator.mediator, "ui:open:storybanner", this.StoryBannerOpen);
				this.listenTo(Communicator.mediator, "app:reset", this.OnAppReset);
			},

			onDialogOpenAbout: function(event){
				App.dialogRegion.show(App.DialogContentView);
			},
			onLayerControlOpen: function(event){
				//We have to render the layout before we can
                //call show() on the layout's regions
                if (_.isUndefined(App.layout.isClosed) || App.layout.isClosed) {
				  	App.leftSideBar.show(App.layout);
	                App.layout.baseLayers.show(App.baseLayerView);
	                App.layout.products.show(App.productsView);
	                App.layout.overlays.show(App.overlaysView);
				} else {
					App.layout.close();
                }
               
			},
			onToolSelectionOpen: function(event){
				if (_.isUndefined(App.toolLayout.isClosed) || App.toolLayout.isClosed) {
					App.rightSideBar.show(App.toolLayout);
					App.toolLayout.selection.show(App.selectionToolsView);
					App.toolLayout.visualization.show(App.visualizationToolsView);
					App.toolLayout.mapmode.show(App.visualizationModesView);
				} else {
					App.toolLayout.close();
				}
			},
			onOptionsOpen: function(event){
				if (_.isUndefined(App.optionsLayout.isClosed) || App.optionsLayout.isClosed) {
					App.optionsBar.show(App.optionsLayout);
					App.optionsLayout.colorramp.show(App.colorRampView);
				} else {
					App.optionsLayout.close();
				}
			},

			StoryBannerOpen: function(event){

				// Instance StoryBanner view
                /*if(config.storyTemplate){
                	this.storyBanner = new v.StoryBannerView({
	                	template: t[config.storyTemplate]
	                });
                }*/

                App.storyBanner = new App.views.StoryBannerView({
                	template: App.templates[event]
                });
                
				if (_.isUndefined(App.storyView.isClosed) || App.storyView.isClosed) {
					App.storyView.show(App.storyBanner);
				} else {
					App.storyView.close();
				}

			},

			OnAppReset: function(){
				App.layout.close();
				App.toolLayout.close();
				App.optionsLayout.close();
				App.optionsBar.close();
			}
		});
		return new ContentController();
	});

}).call( this );