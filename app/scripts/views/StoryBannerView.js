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
        $("#storyView").bind( "scroll", this.onScroll.bind(this) );

        // Array of story section elements.
        this.sections = $('section');

        // Set first element as active
        this.setActive(0);
      },

      onScroll: function(evt){

        var story = document.getElementById('storyView');

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
        /*zoom = map.getZoom;
        doZoom = false;
        if(this.sections[index].hasAttribute('data-zoom') && zoom != this.sections[index].getAttribute('data-zoom')) {
            doZoom = true;
            zoom = this.sections[index].getAttribute('data-zoom');
        }

        // Get the new center?
        center = map.getCenter();
        doPan = false;
        if(this.sections[index].hasAttribute('data-longitude')) {
            longitude = this.sections[index].getAttribute('data-longitude');
            if(center.lon != longitude) {
                center.lon = longitude;
                doPan = true;
            }
        }
        if(this.sections[index].hasAttribute('data-latitude')) {
            latitude = this.sections[index].getAttribute('data-latitude');
            if(center.lat != latitude) {
                center.lat = latitude;
                doPan = true;
            }
        }

        // Zoom / Pan
        if(doZoom) {
            if(!doPan) {
                map.zoomTo(zoom);
            } else {
                map.setCenter(center, zoom);
            }
        } else {
            map.panTo(center);
        }

        // Time selection
        if( slider && this.sections[index].hasAttribute('data-time')){
            dates = this.sections[index].getAttribute('data-time').split('/');
            start = new Date(dates[0]);
            end = new Date(dates[1]);

            if(!(start.getTime() == selectedTimes.start.getTime() && end.getTime() == selectedTimes.end.getTime())) {
                slider.select(start, end);
            }
        }

        // Activate / Deactivate layers
        if(this.sections[index].hasAttribute('data-layers')) {
            activeLayers = this.sections[index].getAttribute('data-layers').split(',')
            _(map.layers).each(function(layer) {
                if(!layer.isBaseLayer){
                    shouldBeVisible = _.contains(activeLayers, layer.layer);
                    if(layer.visibility != shouldBeVisible) {
                        layer.setVisibility(shouldBeVisible);
                    }
                }
            });
        }*/

        return true;
      }

    });
    return {'StoryBannerView':StoryBannerView};
  });
}).call( this );
