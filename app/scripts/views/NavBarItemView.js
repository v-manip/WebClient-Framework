(function() {
	'use strict';

	var root = this;

	root.define([
		'backbone',
		'communicator',
		'models/NavBarItemModel',
		'hbs!tmpl/NavBarItem'
	],

	function( Backbone, Communicator, NavBarItemModel, NavBarItemTmpl ) {

		var NavBarItemView = Backbone.Marionette.ItemView.extend({
            model: NavBarItemModel,
            template: {
                type: 'handlebars',
                template: NavBarItemTmpl
            },
            tagName: 'li', 
            cursor: 'pointer',
            //events: {'click': 'itemClicked'},

            itemClicked: function(){
                Communicator.mediator.trigger(this.model.get('eventToRaise'), this);
            },

            initialize: function(options){
	        	if(this.model.get("subitems")){
	        		this.$el.attr("class", "dropdown");
	        	}else{
	        		this.$el.on("click", $.proxy(this.itemClicked, this));
	        	}
	      	}
            
		});
		return {'NavBarItemView' : NavBarItemView};
	});

}).call( this );