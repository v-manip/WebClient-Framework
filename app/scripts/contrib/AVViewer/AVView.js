define(['backbone.marionette',
		'communicator',
		'app',
		'models/AVModel',
		'globals',
		'hbs!tmpl/wps_getdata',
		'd3',
		'analytics'
	],
	function(Marionette, Communicator, App, AVModel, globals, wps_getdataTmpl) {

		var AVView = Marionette.View.extend({

			model: new AVModel.AVModel(),
			className: "analytics",

			initialize: function(options) {
				this.isClosed = true;
				this.request_url = "";
				this.plot_type = 'scatter';
				this.sp = undefined;

				$(window).resize(function() {
					this.onResize();
				}.bind(this));
				this.connectDataEvents();
			},


			onShow: function() {

				this.stopListening(Communicator.mediator, "change:axis:parameters", this.onChangeAxisParameters);
				this.listenTo(Communicator.mediator, "change:axis:parameters", this.onChangeAxisParameters);

				var that = this;
				
				this.isClosed = false;

				this.selection_list = [];
				this.plotdata = [];
				this.request_url = "";
				this.img = null;
				this.overlay = null;
				this.activeWPSproducts = [];
				this.plot_type = 'scatter';
				this.previous_parameters = [];

				$('#tmp_download_button').unbind( "click" );
				$('#tmp_download_button').remove();

				// TODO: Dirty hack to handle how analyticsviewer re-renders button, need to update analaytics viewer
				var download = d3.select(this.el).append("button")
			        .attr("type", "button")
			        .attr("id", "tmp_download_button")
			        .attr("class", "btn btn-success")
			        .attr("style", "position: absolute; right: 55px; top: 7px; z-index: 1000;")
			        .text("Download");


				$("#tmp_download_button").click(function(evt){
					Communicator.mediator.trigger("dialog:open:download:filter", true);
				});
				
				this.$('.d3canvas').remove();
				this.$el.append("<div class='d3canvas'></div>");

				this.$('.d3canvas').append("<div id='scatterdiv' style='height:55%;'></div>");
				this.$('.d3canvas').append("<div id='parallelsdiv' style='height:45%;'></div>");

            	/*var args = {
					selector: this.$('.d3canvas')[0]
				};*/

				var swarmdata = globals.swarm.get('data');

				var args = {
					scatterEl: '#scatterdiv',
					histoEl: "#parallelsdiv",
					selection_x: 'Latitude',
					selection_y: ['F'],
					margin: {top: 10, right: 67, bottom: 10, left: 60},
					histoMargin: {top: 55, right: 70, bottom: 25, left: 100},
					shorten_width: 125,
					toIgnoreHistogram: ['Latitude', 'Longitude', 'Radius'],
					fieldsforfiltering: ["F","B_N", "B_E", "B_C", "Dst", "QDLat","MLT"],
					single_color: true,
					file_save_string: "VirES_Services_plot_rendering"
				};

				
				if (this.sp === undefined){

	            	this.sp = new scatterPlot(args, function(){},
						function (values) {
							if (values != null){
								Communicator.mediator.trigger("cesium:highlight:point", [values.Latitude, values.Longitude, values.Radius]);
							}else{
								Communicator.mediator.trigger("cesium:highlight:removeAll");
							}
							
						}, 
						function(filter){
							Communicator.mediator.trigger("analytics:set:filter", filter);
						}
					);

					// If filters from previous session load them
					if(localStorage.getItem('filterSelection') !== null){
						var filters = JSON.parse(localStorage.getItem('filterSelection'));
						Communicator.mediator.trigger('analytics:set:filter', filters);
						_.map(filters, function(value, key){
							that.sp.active_brushes.push(key);
							that.sp.brush_extents[key] = value;
							
						});
					}

					// If filters from previous session load them
					if(localStorage.getItem('yAxisSelection') !== null &&
						localStorage.getItem('xAxisSelection') !== null){

							that.sp.sel_y = JSON.parse(localStorage.getItem('yAxisSelection'));
							that.sp.sel_x = JSON.parse(localStorage.getItem('xAxisSelection'));
					}

				}
				if(swarmdata && swarmdata.length>0){
					args['parsedData'] = swarmdata;
					that.sp.loadData(args);
				}

				
				return this;
			},

			connectDataEvents: function(){
				globals.swarm.on('change:data', this.reloadData.bind(this));
			},

			reloadData: function(model, data) {

				if( $(this.el).html()){
						

					 // Prepare to create list of available parameters
					var available_parameters = {};
					globals.products.each(function(prod) {
						if(prod.get("download_parameters")){
							var par = prod.get("download_parameters");
							var new_keys = _.keys(par);
							_.each(new_keys, function(key){
								available_parameters[key] = par[key];
							});
						}
					});
					this.sp.uom_set = available_parameters;

					// Remove uom of time
					if(this.sp.uom_set.hasOwnProperty("Timestamp")){
						this.sp.uom_set["Timestamp"].uom = null;
					}

					// Special cases for separeted vectors
					if (this.sp.uom_set.hasOwnProperty('B_error')){
						this.sp.uom_set['B_error,X'] = $.extend({}, this.sp.uom_set['B_error']);
						this.sp.uom_set['B_error,Y'] = $.extend({}, this.sp.uom_set['B_error']);
						this.sp.uom_set['B_error,Z'] = $.extend({}, this.sp.uom_set['B_error']);
						this.sp.uom_set['B_error,X'].name = "Component of "+this.sp.uom_set['B_error'].name;
						this.sp.uom_set['B_error,Y'].name = "Component of "+this.sp.uom_set['B_error'].name;
						this.sp.uom_set['B_error,Z'].name = "Component of "+this.sp.uom_set['B_error'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_NEC')){
						this.sp.uom_set['B_N'] = $.extend({}, this.sp.uom_set['B_NEC']);
						this.sp.uom_set['B_E'] = $.extend({}, this.sp.uom_set['B_NEC']);
						this.sp.uom_set['B_C'] = $.extend({}, this.sp.uom_set['B_NEC']);
						this.sp.uom_set['B_N'].name = "Component of "+this.sp.uom_set['B_NEC'].name;
						this.sp.uom_set['B_E'].name = "Component of "+this.sp.uom_set['B_NEC'].name;
						this.sp.uom_set['B_C'].name = "Component of "+this.sp.uom_set['B_NEC'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('v_SC')){
						this.sp.uom_set['v_SC_N'] = $.extend({}, this.sp.uom_set['v_SC']);
						this.sp.uom_set['v_SC_E'] = $.extend({}, this.sp.uom_set['v_SC']);
						this.sp.uom_set['v_SC_C'] = $.extend({}, this.sp.uom_set['v_SC']);
						this.sp.uom_set['v_SC_N'].name = "Component of "+this.sp.uom_set['v_SC'].name;
						this.sp.uom_set['v_SC_E'].name = "Component of "+this.sp.uom_set['v_SC'].name;
						this.sp.uom_set['v_SC_C'].name = "Component of "+this.sp.uom_set['v_SC'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_VFM')){
						this.sp.uom_set['B_VFM,X'] = $.extend({}, this.sp.uom_set['B_VFM']);
						this.sp.uom_set['B_VFM,Y'] = $.extend({}, this.sp.uom_set['B_VFM']);
						this.sp.uom_set['B_VFM,Z'] = $.extend({}, this.sp.uom_set['B_VFM']);
						this.sp.uom_set['B_VFM,X'].name = "Component of "+this.sp.uom_set['B_VFM'].name;
						this.sp.uom_set['B_VFM,Y'].name = "Component of "+this.sp.uom_set['B_VFM'].name;
						this.sp.uom_set['B_VFM,Z'].name = "Component of "+this.sp.uom_set['B_VFM'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_NEC_res_IGRF12')){
						this.sp.uom_set['B_N_res_IGRF12'] = $.extend({}, this.sp.uom_set['B_NEC_res_IGRF12']);
						this.sp.uom_set['B_E_res_IGRF12'] = $.extend({}, this.sp.uom_set['B_NEC_res_IGRF12']);
						this.sp.uom_set['B_C_res_IGRF12'] = $.extend({}, this.sp.uom_set['B_NEC_res_IGRF12']);
						this.sp.uom_set['B_N_res_IGRF12'].name = "Component of "+this.sp.uom_set['B_NEC_res_IGRF12'].name;
						this.sp.uom_set['B_E_res_IGRF12'].name = "Component of "+this.sp.uom_set['B_NEC_res_IGRF12'].name;
						this.sp.uom_set['B_C_res_IGRF12'].name = "Component of "+this.sp.uom_set['B_NEC_res_IGRF12'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_NEC_res_SIFM')){
						this.sp.uom_set['B_N_res_SIFM'] = $.extend({}, this.sp.uom_set['B_NEC_res_SIFM']);
						this.sp.uom_set['B_E_res_SIFM'] = $.extend({}, this.sp.uom_set['B_NEC_res_SIFM']);
						this.sp.uom_set['B_C_res_SIFM'] = $.extend({}, this.sp.uom_set['B_NEC_res_SIFM']);
						this.sp.uom_set['B_N_res_SIFM'].name = "Component of "+this.sp.uom_set['B_NEC_res_SIFM'].name;
						this.sp.uom_set['B_E_res_SIFM'].name = "Component of "+this.sp.uom_set['B_NEC_res_SIFM'].name;
						this.sp.uom_set['B_C_res_SIFM'].name = "Component of "+this.sp.uom_set['B_NEC_res_SIFM'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_NEC_res_CHAOS-5-Combined')){
						this.sp.uom_set['B_N_res_CHAOS-5-Combined'] = $.extend({}, this.sp.uom_set['B_NEC_res_CHAOS-5-Combined']);
						this.sp.uom_set['B_E_res_CHAOS-5-Combined'] = $.extend({}, this.sp.uom_set['B_NEC_res_CHAOS-5-Combined']);
						this.sp.uom_set['B_C_res_CHAOS-5-Combined'] = $.extend({}, this.sp.uom_set['B_NEC_res_CHAOS-5-Combined']);
						this.sp.uom_set['B_N_res_CHAOS-5-Combined'].name = "Component of "+this.sp.uom_set['B_NEC_res_CHAOS-5-Combined'].name;
						this.sp.uom_set['B_E_res_CHAOS-5-Combined'].name = "Component of "+this.sp.uom_set['B_NEC_res_CHAOS-5-Combined'].name;
						this.sp.uom_set['B_C_res_CHAOS-5-Combined'].name = "Component of "+this.sp.uom_set['B_NEC_res_CHAOS-5-Combined'].name;
					}
					if (this.sp.uom_set.hasOwnProperty('B_NEC_res_Custom_Model')){
						this.sp.uom_set['B_N_res_Custom_Model'] = $.extend({}, this.sp.uom_set['B_NEC_res_Custom_Model']);
						this.sp.uom_set['B_E_res_Custom_Model'] = $.extend({}, this.sp.uom_set['B_NEC_res_Custom_Model']);
						this.sp.uom_set['B_C_res_Custom_Model'] = $.extend({}, this.sp.uom_set['B_NEC_res_Custom_Model']);
						this.sp.uom_set['B_N_res_Custom_Model'].name = "Component of "+this.sp.uom_set['B_NEC_res_Custom_Model'].name;
						this.sp.uom_set['B_E_res_Custom_Model'].name = "Component of "+this.sp.uom_set['B_NEC_res_Custom_Model'].name;
						this.sp.uom_set['B_C_res_Custom_Model'].name = "Component of "+this.sp.uom_set['B_NEC_res_Custom_Model'].name;
					}

					this.sp.uom_set['MLT'] = {uom: null, name:"Magnetic Local Time"};
					this.sp.uom_set['QDLat'] = {uom: "deg", name:"Quasi-Dipole Latitude"};
					this.sp.uom_set['QDLon'] = {uom: "deg", name:"Quasi-Dipole Longitude"};
					this.sp.uom_set['Dst'] = {uom: null, name:"Disturbance storm time Index"};
					this.sp.uom_set['Kp'] = {uom: null, name:"Global geomagnetic storm Index"};

					$('#tmp_download_button').unbind( "click" );
					$('#tmp_download_button').remove();

					if(data.length > 0){

						// TODO: Dirty hack to handle how analyticsviewer re-renders button, need to update analaytics viewer
						var download = d3.select(this.el).append("button")
					        .attr("type", "button")
					        .attr("id", "tmp_download_button")
					        .attr("class", "btn btn-success")
					        .attr("style", "position: absolute; right: 55px; top: 7px; z-index: 1000;")
					        .text("Download");


						$("#tmp_download_button").click(function(evt){
							Communicator.mediator.trigger("dialog:open:download:filter", true);
						});

						if (!_.isEqual(this.previous_parameters, _.keys(data[0]))){
							var filterstouse = ["Dst", "QDLat", "MLT", "n", "T_elec", "Bubble_Probability"];
							var residuals = _.filter(_.keys(data[0]), function(item) {
								return item.indexOf("_res") !== -1;
							});
							
							// If new datasets contains residuals add those instead of normal components
							if(residuals.length > 0){
								filterstouse = filterstouse.concat(residuals);
							}else{
								filterstouse = filterstouse.concat(["F","F_error" ]);
							}

							this.sp.fieldsforfiltering = filterstouse;

							// Check if we want to change the y-selection
							// If previous does not contain plasma data and new one
							// does we add plasma parameter n to selection i plot
							if( 
								(this.previous_parameters.indexOf("n") == -1) && 
								(_.keys(data[0]).indexOf("n") != -1)
							){
								if(this.sp.sel_y.indexOf("n")==-1){
									this.sp.sel_y.push("n");
								}
							}

							// If previous does not contain mag data and new one
							// does we add mag parameter F to selection i plot
							if( 
								(this.previous_parameters.indexOf("F") == -1) && 
								(_.keys(data[0]).indexOf("F") != -1)
							){
								// Make sure it is not already enabled
								if(this.sp.sel_y.indexOf("F")==-1){
									this.sp.sel_y.push("F");
								}
							}

							// If previous does not contain a residual a new one does
							// we switch the selection to residual value
							var res_index = residuals.indexOf(
								_.find(_.keys(data[0]), function(item) {
										return item.indexOf("F_res") !== -1;
									})
								);
							if(res_index != -1){
								var res_p = residuals[res_index];
								if( 
									(this.previous_parameters.indexOf(res_p) == -1) && 
									(_.keys(data[0]).indexOf(res_p) != -1)
								){
									this.sp.sel_y = [res_p];
								}
							}
						}



						this.previous_parameters = _.keys(data[0]);

						if(this.$('.d3canvas').length == 1){
							$('#scatterdiv').empty();
							$('#parallelsdiv').empty();
							var args = {
								selector: this.$('.d3canvas')[0],
								parsedData: data
							};

							this.sp.loadData(args);
						}
						var that = this;
						// Active parameters
						$(".SumoSelect").change(function(evt){
							localStorage.setItem('yAxisSelection', JSON.stringify(that.sp.sel_y));
							localStorage.setItem('xAxisSelection', JSON.stringify(that.sp.sel_x));
						});


					}else{
						$('#scatterdiv').empty();
						$('#parallelsdiv').empty();
						$('#scatterdiv').append('<div id="nodatainfo">No data available for your current selection</div>');
					}
				}
			},

			onResize: function() {
			},

			render: function(type) {
				this.onResize();
			},

			onChangeAxisParameters: function (selection) {
				this.sp.sel_y=selection;
				this.sp.render();
			},

			close: function() {
	            this.isClosed = true;
	            this.$el.empty();
	            //globals.swarm.off("change:data", this.reloadData);
	            this.triggerMethod('view:disconnect');
	        }

		});

		return AVView;
	});