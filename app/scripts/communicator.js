(function() {
	'use strict';

	var root = this;

	root.define([
		'backbone',
		'backbone.marionette'
	],
	function( Backbone ) {

		var Communicator = Backbone.Marionette.Controller.extend({
			initialize: function( options ) {

				// create a pub sub
				this.mediator = new Backbone.Wreqr.EventAggregator();

				// Allow of logging all events when debug activated
				this.mediator.on("all", function(event, param){
					if( !(event == "map:center" || event == "router:setUrl" ||
					      event == "progress:change")){
							console.log(event);
					}

					if (typeof Piwik !== 'undefined') {
						this.trackEvents(event, param);
					}

					// Track events to save current status of workspace to allow restoring
					// when user visits again
					if (typeof(Storage) !== "undefined") {
					    this.saveStatus(event, param);
					}
					

				}, this);


				//create a req/res
				this.reqres = new Backbone.Wreqr.RequestResponse();

				// create commands
				this.command = new Backbone.Wreqr.Commands();

				this.on('all');
			},

			registerEventHandler: function(eventid, handler) {
				// FIXXME: create a list of eventid to keep track!
				// this.eventlist.push(eventid);

				// Register a new handler for the given eventid.
				this.command.setHandler(eventid, handler);
				
				// Tell the mediator to call the above command handler if the
				// event is fired somewhere in the application, i.e. via the toolbar. 
				this.mediator.on(eventid, function() {
					this.command.execute(eventid);
				}.bind(this));

			},

			setAoiModel: function(model) {
				this.aoiModel = model;
			},

			getAoiModel: function() {
				return this.aoiModel;
			},

			trackEvents: function(event, param){

				var events_registered = [
					'time:change', 'selection:changed',
					'map:layer:change', 'analytics:set:filter'
				];

				if (events_registered.indexOf(event) > -1) {

					var u="//nix.eox.at/piwik/";
					var tracker = Piwik.getTracker( u+'piwik.php', 4 );

					if(event == 'time:change'){
						var ts = getISODateTimeString(param.start).split('T')[0];
						var te = getISODateTimeString(param.end).split('T')[0];
						var time = ts +"/"+ te;
						tracker.trackEvent(event, "time_sel: "+time, (param.start+"/"+param.end));
					}

					if(event == 'selection:changed'){
						if (param){
							var bbox = ""+
								param.w.toFixed(3) +","+ param.s.toFixed(3) +","+ 
								param.e.toFixed(3) +","+ param.n.toFixed(3); 
							tracker.trackEvent(event, "geo_sel: "+bbox);
						}
					}

					if(event == 'map:layer:change'){
						var layer = param.name;
						tracker.trackEvent("layer:change", layer+": "+param.visible);
					}

					if(event == 'analytics:set:filter'){
						var keys = _.keys(param).join();
						var filters = JSON.stringify(param);
						tracker.trackEvent(event, keys, filters);
					}

				}
			},

			saveStatus: function(event, param){

				// Tracking timeslider
				if(event === 'time:domain:change'){
					localStorage.setItem('timeDomain', JSON.stringify(param));
				}

				if(event === 'time:change'){
					localStorage.setItem('timeSelection', JSON.stringify([param.start, param.end]));
				}

				// Tracking of workspace window configuration
				if(event === 'ui:fullscreen:globe'){
					localStorage.setItem('viewSelection', 'globe');
				}
				if(event === 'ui:fullscreen:analytics'){
					localStorage.setItem('viewSelection', 'analytics');
				}
				if(event === 'layout:switch:splitview'){
					localStorage.setItem('viewSelection', 'split');
				}

			}
		});

		return new Communicator();
	});
}).call( this );