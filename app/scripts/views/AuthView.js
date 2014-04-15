(function() {
  'use strict';

 
  var root = this;
  root.define([
    'backbone',
    'communicator',
    'hbs!tmpl/iFrame',
    'underscore'
  ],
  function( Backbone, Communicator, globals, iFrameTmpl) {

    var AuthView = Backbone.Marionette.ItemView.extend({

      className: "panel panel-default authview not-selectable",

      /*events: {
        "load": "onLoadiFrame",
      },*/

      initialize: function(options) {
        this.layerprop = options.layerprop;
      },
      onShow: function(view){

        this.loadcounter = 0;

        $('#authiframe').load(function(){
          this.loadcounter++;
          console.log('loaded: '+this.loadcounter);
          if(this.loadcounter ==2){
            Communicator.mediator.trigger('map:layer:change', this.layerprop);
            this.close();
          }
        }.bind(this));

        this.$('.close').on("click", _.bind(this.onClose, this));
        this.$el.draggable({ 
          containment: "#content",
          scroll: false,
          handle: '.panel-heading'
        });
      },

      /*onClose: function() {
        
        this.close();
      },*/

      onLoadiFrame: function(){
        console.log("iframe loaded");
      }

    });
    return {'AuthView':AuthView};
  });
}).call( this );
