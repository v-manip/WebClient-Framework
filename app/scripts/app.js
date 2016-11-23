
var SCALAR_PARAM = ["F", "n", "T_elec", "U_SC", "Bubble_Index", "Bubble_Probability"];
var VECTOR_PARAM = ["B_NEC", "v_SC", "SIFM", "IGRF12", "CHAOS-5-Combined", "Custom_Model"];
var VECTOR_BREAKDOWN = {
	'SIFM': ['B_N_res_SIFM','B_E_res_SIFM','B_C_res_SIFM'],
	'IGRF12': ['B_N_res_IGRF12','B_E_res_IGRF12','B_C_res_IGRF12'],
	'CHAOS-5-Combined': ['B_N_res_CHAOS-5-Combined','B_E_res_CHAOS-5-Combined','B_C_res_CHAOS-5-Combined'],
	'Custom_Model': ['B_N_res_Custom_Model','B_E_res_Custom_Model','B_C_res_Custom_Model'],
	'B_NEC': ['B_N','B_E','B_C'],
	'B_error': ['B_error,X', 'B_error,Y', 'B_error,Z'],
	'B_VFM': ['B_VFM,X', 'B_VFM,Y', 'B_VFM,Z'],
	'v_SC':  ['v_SC_N','v_SC_E','v_SC_C'],
	'B_NEC_res_SIFM': ['B_N_res_SIFM','B_E_res_SIFM','B_C_res_SIFM'],
	'B_NEC_res_IGRF12': ['B_N_res_IGRF12','B_E_res_IGRF12','B_C_res_IGRF12'],
	'B_NEC_res_CHAOS-5-Combined': ['B_N_res_CHAOS-5-Combined','B_E_res_CHAOS-5-Combined','B_C_res_CHAOS-5-Combined'],
	'B_NEC_res_Custom_Model': ['B_N_res_Custom_Model','B_E_res_Custom_Model','B_C_res_Custom_Model']
};


(function() {
	'use strict';

	var root = this;

	root.define([
			'backbone',
			'globals',
			'regions/DialogRegion', 'regions/UIRegion',
			'layouts/LayerControlLayout',
			'layouts/ToolControlLayout',
			'layouts/OptionsLayout',
			'core/SplitView/WindowView',
			'communicator',
			'jquery', 'backbone.marionette',
			'controller/ContentController',
			'controller/DownloadController',
			'controller/SelectionManagerController',
			'controller/LoadingController',
			'controller/LayerController',
			'controller/SelectionController',
			'controller/DifferenceController',
			'controller/DataController'
		],

		function(Backbone, globals, DialogRegion,
			UIRegion, LayerControlLayout, ToolControlLayout, OptionsLayout, WindowView, Communicator) {


		var Application = Backbone.Marionette.Application.extend({
			initialize: function(options) {
			},

			configure: function(config) {


				// Load jquery ui tooltip tool

				/*$(document).ready(function() {
				    $("body").tooltip({ 
				    	selector: '[data-toggle=tooltip]',
				    	position: { my: "left+5 center", at: "right center" },
						hide: { effect: false, duration: 0 },
						show:{ effect: false, delay: 700}
				    });

				});*/

				$("body").tooltip({ 
			    	selector: '[data-toggle=tooltip]',
			    	position: { my: "left+5 center", at: "right center" },
					hide: { effect: false, duration: 0 },
					show:{ effect: false, delay: 700}
			    });

				var imagerenderercanvas = $('<canvas/>',{id: 'imagerenderercanvas'});
				$('body').append(imagerenderercanvas);


				var v = {}; //views
				var m = {};	//models
				var t = {};	//templates

				// Application regions are loaded and added to the Marionette Application
				_.each(config.regions, function(region) {
					var obj = {};
					obj[region.name] = "#" + region.name;
					this.addRegions(obj);
					console.log("Added region " + obj[region.name]);
				}, this);

				//Load all configured views
				_.each(config.views, function(viewDef) {
					var View = require(viewDef);
					$.extend(v, View);
				}, this);

				//Load all configured models
				_.each(config.models, function(modelDef) {
					var Model = require(modelDef);
					$.extend(m, Model);
				}, this);

				//Load all configured templates
				_.each(config.templates, function(tmplDef) {
					var Tmpl = require(tmplDef.template);
					t[tmplDef.id] = Tmpl;
				}, this);

				this.templates = t;
				this.views = v;


				//Map attributes are loaded and added to the global map model
				globals.objects.add('mapmodel', new m.MapModel({
						visualizationLibs : config.mapConfig.visualizationLibs,
						center: config.mapConfig.center,
						zoom: config.mapConfig.zoom,
						sun: _.has(config.mapConfig, 'showSun') ? config.mapConfig.showSun: true,
						moon: _.has(config.mapConfig, 'showMoon') ? config.mapConfig.showMoon: true,
						skyBox: _.has(config.mapConfig, 'showSkyBox') ? config.mapConfig.showSkyBox: true,
						skyAtmosphere: _.has(config.mapConfig, 'skyAtmosphere') ? config.mapConfig.skyAtmosphere: true,
						backgroundColor: _.has(config.mapConfig, 'backgroundColor') ? config.mapConfig.backgroundColor: "#000"
					})
				);


				//Base Layers are loaded and added to the global collection
				// If there are already saved baselayer config in the local
				// storage use that instead

				if(localStorage.getItem('baseLayersConfig') !== null){
					config.mapConfig.baseLayers = JSON.parse(localStorage.getItem('baseLayersConfig'));
				}

				_.each(config.mapConfig.baseLayers, function(baselayer) {

					globals.baseLayers.add(
						new m.LayerModel({
							name: baselayer.name,
							visible: baselayer.visible,
							view: {
								id : baselayer.id,
								urls : baselayer.urls,
								protocol: baselayer.protocol,
								projection: baselayer.projection,
								attribution: baselayer.attribution,
								matrixSet: baselayer.matrixSet,
								style: baselayer.style,
								format: baselayer.format,
								resolutions: baselayer.resolutions,
								maxExtent: baselayer.maxExtent,
								gutter: baselayer.gutter,
								buffer: baselayer.buffer,
								units: baselayer.units,
								transitionEffect: baselayer.transitionEffect,
								isphericalMercator: baselayer.isphericalMercator,
								isBaseLayer: true,
								wrapDateLine: baselayer.wrapDateLine,
								zoomOffset: baselayer.zoomOffset,
									//time: baselayer.time // Is set in TimeSliderView on time change.
							},
							views: baselayer.views
						})
					);
					console.log("Added baselayer " + baselayer.id );
				}, this);
				
				var autoColor = {
		            colors : d3.scale.category10(),
		            index : 0,
		            getColor: function () { return this.colors(this.index++) }
		        }


				//Productsare loaded and added to the global collection
                var ordinal = 0;
                var domain = [];
                var range = [];

                // Remove three first colors as they are used by the products
                autoColor.getColor();autoColor.getColor();autoColor.getColor();

                // If there are already saved product config in the local
				// storage use that instead

				if(localStorage.getItem('productsConfig') !== null){
					config.mapConfig.products = JSON.parse(localStorage.getItem('productsConfig'));
				}

				_.each(config.mapConfig.products, function(product) {
					var p_color = product.color ? product.color : autoColor.getColor();
					var lm = new m.LayerModel({
						name: product.name,
						visible: product.visible,
                        ordinal: ordinal,
						timeSlider: product.timeSlider,
						// Default to WMS if no protocol is defined
						timeSliderProtocol: (product.timeSliderProtocol) ? product.timeSliderProtocol : "WMS",
						color: p_color,
						//time: products.time, // Is set in TimeSliderView on time change.
						opacity: (product.opacity) ? product.opacity : 1,
						views: product.views,
						view: {isBaseLayer: false},
						download: {
							id: product.download.id,
							protocol: product.download.protocol,
							url: product.download.url
						},
						processes: product.processes,
						unit: product.unit,
						parameters: product.parameters,
						download_parameters: product.download_parameters,
						height: product.height,
						outlines: product.outlines,
						model: product.model,
						coefficients_range: product.coefficients_range,
						satellite: product.satellite,
						tileSize: (product.tileSize) ? product.tileSize : 256,
						validity: product.validity,
						showColorscale: true
					});

					if(lm.get('download').id === 'Custom_Model'){
						var shcFile = localStorage.getItem('shcFile');
						if(shcFile !== null){
							shcFile = JSON.parse(shcFile);
							lm.set('shc', shcFile.data);
							lm.set('shc_name', shcFile.name);
						}
					}

					globals.products.add(lm);

					if(product.processes){
						domain.push(product.processes[0].layer_id);
						range.push(p_color);
					}
					
					console.log("Added product " + product.name );
				}, this);

				var productcolors = d3.scale.ordinal().domain(domain).range(range);

				globals.objects.add('productcolors', productcolors);

				// If there is already saved overly configuration use that
				if(localStorage.getItem('overlaysConfig') !== null){
					config.mapConfig.overlays = JSON.parse(localStorage.getItem('overlaysConfig'));
				}
				//Overlays are loaded and added to the global collection
				_.each(config.mapConfig.overlays, function(overlay) {

						globals.overlays.add(
							new m.LayerModel({
								name: overlay.name,
								visible: overlay.visible,
								ordinal: ordinal,
								view: overlay.view
							})
						);
						console.log("Added overlay " + overlay.id);
					}, this);


				// If Navigation Bar is set in configuration go trhough the 
				// defined elements creating a item collection to rendered
				// by the marionette collection view
				if (config.navBarConfig) {

					var addNavBarItems = defaultFor(self.NAVBARITEMS, []);
					config.navBarConfig.items = config.navBarConfig.items.concat(addNavBarItems);
					var navBarItemCollection = new m.NavBarCollection;

					_.each(config.navBarConfig.items, function(list_item){
						navBarItemCollection.add(
							new m.NavBarItemModel(list_item)
						);
					}, this);

					this.topBar.show(new v.NavBarCollectionView(
						{template: t.NavBar({
							title: config.navBarConfig.title,
							url: config.navBarConfig.url}),
						className:"navbar navbar-inverse navbar-fixed-top not-selectable",
						itemView: v.NavBarItemView, tag: "div",
						collection: navBarItemCollection}));

				};

				// Added region to test combination of backbone
				// functionality combined with jQuery UI
				this.addRegions({dialogRegion: DialogRegion.extend({el: "#viewContent"})});
				this.DialogContentView = new v.ContentView({
					template: {type: 'handlebars', template: t.Info},
                    id: "about",
                    className: "modal fade",
                    attributes: {
                        role: "dialog",
                        tabindex: "-1",
                        "aria-labelledby": "about-title",
                        "aria-hidden": true,
                        "data-keyboard": true,
                        "data-backdrop": "static"
                    }
				});

				// Create the views - these are Marionette.CollectionViews that render ItemViews
                this.baseLayerView = new v.BaseLayerSelectionView({
                	collection:globals.baseLayers,
                	itemView: v.LayerItemView.extend({
                		template: {
                			type:'handlebars',
                			template: t.BulletLayer},
                		className: "radio"
                	})
                });

                // We want to have the full list of products as the underlying
				// system works in this manner but in order to accomodate the 
				// concept of one product with three satellites we remove here 
				// Each three products and combine them to one, the logic for
				// "separating" them is then done when activating one of this
				// "special products"

                var filtered = globals.products.filter(function (m) {
					if (m && m.get("download").id && 
						 (
						 	m.get("download").id.indexOf("SW_OPER_MAG") != -1 ||
						 	m.get("download").id.indexOf("SW_OPER_EFI") != -1 ||
						 	m.get("download").id.indexOf("SW_OPER_IBI") != -1
						 )
					){
						return false;
					}else{
						return true;
					}
		        });

		        globals.swarm["satellites"] = {
		        	"Alpha": true,
		        	"Bravo": false,
		        	"Charlie": false
		        };

		        if(localStorage.getItem("satelliteSelection") !== null){
		        	globals.swarm.satellites = JSON.parse(localStorage.getItem("satelliteSelection"));
		        }

		        globals.swarm["products"] = {
		        	"MAG": {
		        		"Alpha": "SW_OPER_MAGA_LR_1B",
		        		"Bravo": "SW_OPER_MAGB_LR_1B",
		        		"Charlie": "SW_OPER_MAGC_LR_1B"
		        	},
		        	"EFI":  {
		        		"Alpha": "SW_OPER_EFIA_PL_1B",
		        		"Bravo": "SW_OPER_EFIB_PL_1B",
		        		"Charlie": "SW_OPER_EFIC_PL_1B"
		        	},
		        	"IBI":  {
		        		"Alpha": "SW_OPER_IBIATMS_2F",
		        		"Bravo": "SW_OPER_IBIBTMS_2F",
		        		"Charlie": "SW_OPER_IBICTMS_2F"
		        	}
		        };

		        globals.swarm["activeProducts"] = [];
		        
		        var filtered_collection = new Backbone.Collection(filtered);

		        var containerSelection = {
		        	'MAG': true,
		        	'EFI': false,
		        	'IBI': false
		        };

		        var clickEvent = "require(['communicator'], function(Communicator){Communicator.mediator.trigger('application:reset');});";

		        if(localStorage.getItem("containerSelection") !== null){
		        	containerSelection = JSON.parse(localStorage.getItem("containerSelection"));
		        	showMessage('success',
		        	 'The configuration of your last visit has been loaded, '+
		        	 'if you would like to reset to the default configuration click '+
		        	 '<b><a href="javascript:void(0);" onclick="'+clickEvent+'">here</a></b> '+
		        	 'or on the Reset button above.', 35);
		        }else{
		        	localStorage.setItem("containerSelection", JSON.stringify(containerSelection));
		        }

		        var csKeys = _.keys(containerSelection);
		        for (var i = csKeys.length - 1; i >= 0; i--) {
		        	if(containerSelection[csKeys[i]]){
		        		var satKeys = _.keys(globals.swarm.products[csKeys[i]]);
		        		for (var j = satKeys.length - 1; j >= 0; j--) {
		        			if(globals.swarm.satellites[satKeys[j]]){
		        				globals.swarm.activeProducts.push(
		        					globals.swarm.products[csKeys[i]][satKeys[j]]
		        				);
		        			}
		        		}
		        	}
		        }

	        	for (var i = globals.swarm.activeProducts.length - 1; i >= 0; i--) {
		        	globals.products.forEach(function(p){
            			if(p.get("download").id == globals.swarm.activeProducts[i]){
            				if(!p.get("visible")){
	            				p.set("visible", true);
            				}
            			}
            		});
		        }



		        // Add generic product (which is container for A,B and C sats)
				filtered_collection.add({
					name: "Bubble Index data (IBI)",
					visible: containerSelection['IBI'],
					color: "#2ca02c",
					protocol: null,
					containerproduct: true,
					id: "IBI"
				}, {at: 0});
				filtered_collection.add({
					name: "Plasma data (EFI PL)",
					visible: containerSelection['EFI'],
					color: "#ff7f0e",
					protocol: null,
					containerproduct: true,
					id: "EFI"
				}, {at: 0});
				filtered_collection.add({
					name: "Magnetic data (MAG LR)",
					visible: containerSelection['MAG'],
					color: "#1f77b4",
					protocol: null,
					containerproduct: true,
					id: "MAG"
				}, {at: 0});


                this.productsView = new v.LayerSelectionView({
                	collection: filtered_collection,
                	itemView: v.LayerItemView.extend({
                		template: {
                			type:'handlebars',
                			template: t.CheckBoxLayer},
                		className: "sortable-layer"
                	}),
                	className: "sortable"
                });

                globals.swarm["filtered_collection"] = filtered_collection;

                this.overlaysView = new v.BaseLayerSelectionView({
                	collection: globals.overlays,
                	itemView: v.LayerItemView.extend({
                		template: {
                			type: 'handlebars',
                			template: t.CheckBoxOverlayLayer},
                		className: "checkbox"
                	}),
                	className: "check"
                });



                // Create layout that will hold the child views
                this.layout = new LayerControlLayout();


                // Define collection of selection tools
                var selectionToolsCollection = new m.ToolCollection();
                _.each(config.selectionTools, function(selTool) {
					selectionToolsCollection.add(
							new m.ToolModel({
								id: selTool.id,
								description: selTool.description,
								icon:selTool.icon,
								enabled: true,
								active: false,
								type: "selection",
								selectionType: selTool.selectionType
							}));
				}, this);

                // Define collection of visualization tools
                var visualizationToolsCollection = new m.ToolCollection();
                _.each(config.visualizationTools, function(visTool) {
					visualizationToolsCollection.add(
							new m.ToolModel({
								id: visTool.id,
								eventToRaise: visTool.eventToRaise,
								description: visTool.description,
								disabledDescription: visTool.disabledDescription,
								icon:visTool.icon,
								enabled: visTool.enabled,
								active: visTool.active,
								type: "tool"
							}));
				}, this);

				// Define collection of visualization modes
                var visualizationModesCollection = new m.ToolCollection();
                _.each(config.visualizationModes, function(visMode) {
                    visualizationModesCollection.add(
                        new m.ToolModel({
                            id: visMode.id,
                            eventToRaise: visMode.eventToRaise,
                            description: visMode.description,
                            icon: visMode.icon,
                            enabled: visMode.enabled,
                            active: visMode.active,
                            type: "vis_mode"
                        }));
                }, this);	
                
                // Create Collection Views to hold set of views for selection tools
                this.visualizationToolsView = new v.ToolSelectionView({
                	collection:visualizationToolsCollection,
                	itemView: v.ToolItemView.extend({
                		template: {
                			type:'handlebars',
                			template: t.ToolIcon}
                	})
                });

                // Create Collection Views to hold set of views for visualization tools
                this.selectionToolsView = new v.ToolSelectionView({
                	collection:selectionToolsCollection,
                	itemView: v.ToolItemView.extend({
                		template: {
                			type:'handlebars',
                			template: t.ToolIcon}
                	})
                });


                // Create Collection Views to hold set of views for visualization modes
                this.visualizationModesView = new v.ToolSelectionView({
                    collection: visualizationModesCollection,
                    itemView: v.ToolItemView.extend({
                        template: {
                            type: 'handlebars',
                            template: t.ToolIcon
                        }
                    })
                });


                this.layerSettings = new v.LayerSettings();

                // Create layout to hold collection views
                this.toolLayout = new ToolControlLayout();
                this.optionsLayout = new OptionsLayout();

                // Instance timeslider view
                this.timeSliderView = new v.TimeSliderView(config.timeSlider);

                // Load possible available filter selection
				if(localStorage.getItem('filterSelection') !== null){
					globals.swarm.set('filters', JSON.parse(localStorage.getItem('filterSelection')));
				}

				


			},

			// The GUI is setup after the application is started. Therefore all modules
			// are already registered and can be requested to populate the GUI.
			setupGui: function() {

				// Starts the SplitView module and registers it with the Communicator.
				this.module('SplitView').start();
				var splitview = this.module('SplitView').createController();
				this.main.show(splitview.getView());

				
				// Show Timsliderview after creating modules to
				// set the selected time correctly to the products
				this.bottomBar.show(this.timeSliderView);

				// Show storybanner
				/*if(this.storyBanner){
					this.storyView.show(this.storyBanner);
				}*/

				if ( (typeof(Storage) !== "undefined") && localStorage.getItem("viewSelection") !== null) {
					if(localStorage.getItem('viewSelection') == 'split'){
						splitview.setSplitscreen();
					}
					if(localStorage.getItem('viewSelection') == 'globe'){
						splitview.setSinglescreen('CesiumViewer');
					}
					if( localStorage.getItem('viewSelection') == 'analytics'){
						splitview.setSinglescreen('AVViewer');
					}
				}else{
					splitview.setSplitscreen();
				}

				// Try to get CSRF token, if available set it for necesary ajax requests
				function getCookie(name) {
				    var cookieValue = null;
				    if (document.cookie && document.cookie != '') {
				        var cookies = document.cookie.split(';');
				        for (var i = 0; i < cookies.length; i++) {
				            var cookie = jQuery.trim(cookies[i]);
				            // Does this cookie string begin with the name we want?
				            if (cookie.substring(0, name.length + 1) == (name + '=')) {
				                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
				                break;
				            }
				        }
				    }
				    return cookieValue;
				}
				var csrftoken = getCookie('csrftoken');

				function csrfSafeMethod(method) {
				    // these HTTP methods do not require CSRF protection
				    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
				}

				if(csrftoken){
					$.ajaxSetup({
					    beforeSend: function(xhr, settings) {
					        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
					            xhr.setRequestHeader("X-CSRFToken", csrftoken);
					        }
					    }
					});
				}

			    // Add a trigger for ajax calls in order to display loading state
                // in mouse cursor to give feedback to the user the client is busy
                $(document).ajaxStart(function() {
                  	Communicator.mediator.trigger("progress:change", true);
                });

                $(document).ajaxStop(function() {
                  	Communicator.mediator.trigger("progress:change", false);
                });

                $(document).ajaxError(function( event, request, settings ) {
                	if(settings.suppressErrors) {
				        return;
				    }

				    showMessage('danger', ('Error response on HTTP ' + settings.type + ' to '+ settings.url.split("?")[0]), 15);
                });

                // The tooltip is called twice at beginning and end, it seems to show the style of the
                // tooltips more consistently, there is some problem where sometimes no style is shown for tooltips
                $("body").tooltip({ 
			    	selector: '[data-toggle=tooltip]',
			    	position: { my: "left+5 center", at: "right center" },
					hide: { effect: false, duration: 0 },
					show:{ effect: false, delay: 700}
			    });

			    // Broadcast possible area selection
				if(localStorage.getItem('areaSelection') !== null){
					Communicator.mediator.trigger('selection:changed', JSON.parse(localStorage.getItem('areaSelection')));
				}

				Communicator.mediator.trigger('map:multilayer:change', globals.swarm.activeProducts);

			    globals.products.each(function(product){
					if(product.get("visible")){
						Communicator.mediator.trigger("map:layer:change", {
							name: product.get('name'),
							isBaseLayer: false,
							visible: true
						})
					}
				}, this);

                // Remove loading screen when this point is reached in the script
                $('#loadscreen').remove();


			}



		});

		return new Application();
	});
}).call( this );