define([
	'backbone.marionette',
	'app',
	'communicator',
	'./AnalyticsView'
], function(Marionette, App, Communicator, AnalyticsView) {

	'use strict';

	// The Controller takes care of the (private) implementation of a module. All functionality
	// is solely accessed via the controller. Therefore, also the Module.Router uses the Controller
	// for triggering actions caused by routing events.
	// The Controller has per definition only direct access to the View, it does not i.e. access
	// the Application object directly.
	var AnalyticsViewController = Backbone.Marionette.Controller.extend({

		initialize: function(opts) {
			this.id = opts.id;
			
			this.analyticsView = new AnalyticsView({
				context: Communicator.mediator
			});
		},

		getView: function(id) {
			return this.analyticsView;
		},

		isActive: function(){
			return !this.analyticsView.isClosed;
		}
	});

	return AnalyticsViewController;
});