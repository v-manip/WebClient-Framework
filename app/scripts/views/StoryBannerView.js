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
        'scroll': 'onScroll'
        /*"click #btn-select-all-coverages": "onSelectAllCoveragesClicked",
        "click #btn-invert-coverage-selection": "onInvertCoverageSelectionClicked",
        'change input[type="checkbox"]': "onCoverageSelected",
        "click #btn-start-download": "onStartDownloadClicked"*/
      },

      initialize: function(options) {

      },

      onShow: function(view){
        // Array of story section elements.
        var sections = $('section');
        console.log(sections);
      },

      onScroll: function(evt){
        var story = document.getElementById('story');

        // All Browsers, might not work on IE8
        var y = story.scrollTop;
        var h = story.offsetHeight;

        // If scrolled to the very top of the page set the first section active.
        if (y === 0) return setActive(0);

        // Otherwise, conditionally determine the extent to which page must be
        // scrolled for each section. The first section that matches the current
        // scroll position wins and exits the loop early.
        var memo = 0;
        var buffer = (h * 0.2);
        var active = _(sections).any(function(el, index) {
            memo += el.offsetHeight;
            return y < (memo-buffer) ? setActive(index) : false;
        });

        // If no section was set active the user has scrolled past the last section.
        // Set the last section active.
        if (!active) setActive(sections.length - 1);
      },

          // Helper to set the active section.
      setActive: function(index) {
        // Cache the active section and only run, when it changes
        /*if (document.getElementById('story').dataset.active == index) return true;
        document.getElementById('story').dataset.active = index;

        // Set active class on sections, markers.
        _(sections).each(function(s) { s.className = s.className.replace(' active', '') });
        sections[index].className += ' active';

        // Set a body class for the active section.
        document.body.className = 'section-' + index;

        // Do we need to zoom?
        zoom = map.getZoom;
        doZoom = false;
        if(sections[index].hasAttribute('data-zoom') && zoom != sections[index].getAttribute('data-zoom')) {
            doZoom = true;
            zoom = sections[index].getAttribute('data-zoom');
        }

        // Get the new center?
        center = map.getCenter();
        doPan = false;
        if(sections[index].hasAttribute('data-longitude')) {
            longitude = sections[index].getAttribute('data-longitude');
            if(center.lon != longitude) {
                center.lon = longitude;
                doPan = true;
            }
        }
        if(sections[index].hasAttribute('data-latitude')) {
            latitude = sections[index].getAttribute('data-latitude');
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
        if( slider && sections[index].hasAttribute('data-time')){
            dates = sections[index].getAttribute('data-time').split('/');
            start = new Date(dates[0]);
            end = new Date(dates[1]);

            if(!(start.getTime() == selectedTimes.start.getTime() && end.getTime() == selectedTimes.end.getTime())) {
                slider.select(start, end);
            }
        }

        // Activate / Deactivate layers
        if(sections[index].hasAttribute('data-layers')) {
            activeLayers = sections[index].getAttribute('data-layers').split(',')
            _(map.layers).each(function(layer) {
                if(!layer.isBaseLayer){
                    shouldBeVisible = _.contains(activeLayers, layer.layer);
                    if(layer.visibility != shouldBeVisible) {
                        layer.setVisibility(shouldBeVisible);
                    }
                }
            });
        }

        return true;*/
      }

    });
    return {'StoryBannerView':StoryBannerView};
  });
}).call( this );
