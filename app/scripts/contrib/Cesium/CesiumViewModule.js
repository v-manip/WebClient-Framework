define([
	'backbone.marionette',
	'app',
	'communicator',
	'./CesiumViewController',
	'./CesiumViewRouter',
	'keypress'
], function(Marionette, App, Communicator, CesiumViewController, CesiumViewRouterController, keypress) {

	'use strict';

	App.module('CesiumViewer', function(Module) {

		this.startsWithParent = true;

		// This is the start routine of the module, called automatically by Marionette
		// after the core system is loaded. The module is responsible for creating its
		// private implementation, the Module.Controller. The Module.Controller is the
		// connected to the event system of the application via the Communicator.
		// Moreover the Router responsible for this module is activated in this routine.
		this.on('start', function(options) {
			//this.instances = {};
			this.idx = 0;
			this.instance = undefined;

			console.log('[CesiumViewerModule] Finished module initialization');
		});

		this.createController = function(opts) {
			/*var id = undefined;
			var startPosition = undefined;

			if (typeof opts !== 'undefined') {
				id = opts.id;
				startPosition = opts.startPosition;

			} else {
				startPosition = {
					x: 15,
					y: 47,
					l: 6
				};
			}

			// Go through instances and return first free one
			for (var contr in this.instances) {
				if(!this.instances[contr].isActive()){
					console.log("Free map viewer returned " +contr);
					this.instances[contr].connectToView();
					return this.instances[contr];
				}
			};

			// If there are no free insances create a new one

			if (typeof id === 'undefined') {
				id = 'CesiumViewer.' + this.idx++;
			}

			var controller = new CesiumViewController({
				id: id,
				startPosition: startPosition
			});
			this.instances[id] = controller;

			setupKeyboardShortcuts(controller);

			return controller;*/


			var i = this.insance;
			if(this.insance === undefined){
				i = new CesiumViewController({
					id: 'CesiumViewer',
					startPosition: {}
				});
				this.insance = i;
			}
			i.connectToView();
			setupKeyboardShortcuts(i);
			return i;

		};

		var setupKeyboardShortcuts = function(controller) {
			var keypressListener = new keypress.Listener();
			keypressListener.simple_combo("ctrl d", function() {
				/*var pos = controller.getStartPosition();
				controller.centerAndZoom(pos.x, pos.y, pos.l);*/
				controller.toggleDebug();
			});
		};

		// FIXXME: the router/history concept has to be redesigned for the multiple view approach!
		// var setupRouter = function(map_controller) {
		// 	// The Router maps the history API of the browser to the application in defining
		// 	// routes, which are then mapped to calls to the internal CesiumViewRouterController.
		// 	// The RouterController knows how to react to those events.
		// 	var CesiumViewRouter = Marionette.AppRouter.extend({
		// 		appRoutes: {
		// 			"map": "show",
		// 			"map/:x/:y/:l": "centerAndZoom"
		// 		}
		// 	});

		// 	new CesiumViewRouter({
		// 		controller: new CesiumViewRouterController(map_controller)
		// 	});
		// };
	});
});