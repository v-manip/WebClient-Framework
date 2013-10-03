define([
	'backbone',
	'communicator',
	'app',
	'contrib/RectangularBoxViewer/RectangularBoxView'
], function(Backbone, Communicator, App, RectangularBoxView) {

	'use strict';

	App.module('RectangularBoxViewer', function(Module) {

		this.startsWithParent = true;

		Module.Controller = Backbone.Marionette.Controller.extend({

			initialize: function(options) {
				this.rbvView = undefined;
			},

			show: function() {
				if (typeof(this.rbvView) == 'undefined') {
					this.rbvView = new RectangularBoxView({
						x3did: '#x3dom',
						hideid: '#hidden'
					});
				}

				App.map.show(this.rbvView);
			}
		});

		this.on('start', function(options) {
			var controller = new Module.Controller();

			registerWithCommunicator(controller);
			setupRouter(controller);

			console.log('[VirtualGlobeViewer] Finished module initialization');

		});

		var registerWithCommunicator = function(rbv_controller) {
			Communicator.registerEventHandler("viewer:show:rectangularboxviewer", function() {
				Backbone.history.navigate("rbv", {
					trigger: true
				});
			});

			Communicator.registerEventHandler("viewer:hide:rectangularboxviewer", function() {
				rbv_controller.hide();
			});			
		};

		var setupRouter = function(rbv_controller) {
			var Router = Backbone.Marionette.AppRouter.extend({
				appRoutes: {
					"rbv": "show"
				}
			});

			var RouteController = function() {};

			_.extend(RouteController.prototype, {
				show: function() {
					rbv_controller.show();
				}
			});

			new Router({
				controller: new RouteController(rbv_controller)
			});
		};
	});
});