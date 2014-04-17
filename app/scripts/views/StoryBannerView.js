(function() {
  'use strict';


  var root = this;
  root.define([
    'backbone',
    'communicator',
    'globals',
    'underscore'
  ],
  function( Backbone, Communicator, globals) {

    var StoryBannerView = Backbone.Marionette.ItemView.extend({
      tagName: "article",
      id: "story",

      events: {
        //'scroll': 'onScroll'
        /*"click #btn-select-all-coverages": "onSelectAllCoveragesClicked",
        "click #btn-invert-coverage-selection": "onInvertCoverageSelectionClicked",
        'change input[type="checkbox"]': "onCoverageSelected",
        "click #btn-start-download": "onStartDownloadClicked"*/
      },

      initialize: function(options) {

      },

      onShow: function(view){

        // Bind scroll event of parent element
        $("#story").bind("scroll", this.onScroll.bind(this));

        $(".close").bind("click", this.onClose.bind(this));

        // Array of story section elements.
        this.sections = $('section');

        // Set first element as active
        this.setActive(0);
      },

      onScroll: function(evt){

        var story = document.getElementById('story');

        // All Browsers, might not work on IE8
        var y = story.scrollTop;
        var h = story.offsetHeight;

        // If scrolled to the very top of the page set the first section active.
        if (y === 0) return this.setActive(0);

        // Otherwise, conditionally determine the extent to which page must be
        // scrolled for each section. The first section that matches the current
        // scroll position wins and exits the loop early.
        var memo = 0;
        var buffer = (h * 0.2);
        var active = _(this.sections).any(function(el, index) {
            memo += el.offsetHeight;
            return y < (memo-buffer) ? this.setActive(index) : false;
        }, this);

        // If no section was set active the user has scrolled past the last section.
        // Set the last section active.
        if (!active) this.setActive(this.sections.length - 1);
      },

      // Helper to set the active section.
      setActive: function(index) {

        // Cache the active section and only run, when it changes
        if (document.getElementById('story').dataset.active == index) return true;
        document.getElementById('story').dataset.active = index;

        // Set active class on this.sections, markers.
        _(this.sections).each(function(s) { s.className = s.className.replace(' active', '') });
        this.sections[index].className += ' active';

        // Set a body class for the active section.
        document.body.className = 'section-' + index;

        // Do we need to zoom?
        var doZoom = false;
        if(this.sections[index].hasAttribute('data-zoom')) {
            doZoom = true;
            var zoom = this.sections[index].getAttribute('data-zoom');
        }

        var center={};
        // Get the new center?
        var doPan = false;
        if(this.sections[index].hasAttribute('data-longitude')) {
            center.lon = this.sections[index].getAttribute('data-longitude');
            doPan = true;
        }
        if(this.sections[index].hasAttribute('data-latitude')) {
            center.lat = this.sections[index].getAttribute('data-latitude');
            doPan = true;
        }

        // Zoom / Pan
        if(doZoom) {
            if(!doPan) {
                //map.zoomTo(zoom);
            } else {
                Communicator.mediator.trigger("map:center", {
                  x: center.lon, y: center.lat, l: zoom
                });
            }
        } else {
           // map.panTo(center);
        }

        // Events to fire
        if(this.sections[index].hasAttribute('data-events')) {
          var events = this.sections[index].getAttribute('data-events').split(";");
          _.each(events, function(event){
            Communicator.mediator.trigger(event);
          }, this);
        }

        // Time selection
        if( this.sections[index].hasAttribute('data-time')){
            var dates = this.sections[index].getAttribute('data-time').split('/');
            var opt = {};
            opt.start = new Date(dates[0]);
            opt.end = new Date(dates[1]);

            Communicator.mediator.trigger("date:selection:change", opt);
            
        }

        // Activate / Deactivate layers
        if(this.sections[index].hasAttribute('data-layers')) {
            var activeLayers = this.sections[index].getAttribute('data-layers').split(';');
            
            _.each(activeLayers, function(layer){
              Communicator.mediator.trigger("layer:activate", layer);
            }, this);
            /*_(map.layers).each(function(layer) {
                if(!layer.isBaseLayer){
                    shouldBeVisible = _.contains(activeLayers, layer.layer);
                    if(layer.visibility != shouldBeVisible) {
                        layer.setVisibility(shouldBeVisible);
                    }
                }
            });*/
        }

        // Setup which visualization widget is displayed in which region
        if(this.sections[index].hasAttribute('data-tl')){
          Communicator.mediator.trigger("region:show:view", 'tl', this.sections[index].getAttribute('data-tl'));
        }
        if(this.sections[index].hasAttribute('data-tr')){
          Communicator.mediator.trigger("region:show:view", 'tr', this.sections[index].getAttribute('data-tr'));
        }
        if(this.sections[index].hasAttribute('data-bl')){
          Communicator.mediator.trigger("region:show:view", 'bl', this.sections[index].getAttribute('data-bl'));
        }
        if(this.sections[index].hasAttribute('data-br')){
          Communicator.mediator.trigger("region:show:view", 'br', this.sections[index].getAttribute('data-br'));
        }

        // Load a selection specified by a json file
        if(this.sections[index].hasAttribute('data-selection')){
          $.get(this.sections[index].getAttribute('data-selection'), function(values) {
            Communicator.mediator.trigger("map:load:geojson", values);
          });
          
        }

        return true;
      },

      onClose: function(){
        this.close();
      }

    });
    return {'StoryBannerView':StoryBannerView};
  });
}).call( this );
