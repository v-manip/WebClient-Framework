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
					margin: {top: 10, right: 20, bottom: 10, left: 50},
					toIgnoreHistogram: [
						'B_N_error','B_E_error','B_C_error',
						'B_N_res_IGRF12','B_E_res_IGRF12','B_C_res_IGRF12',
						'B_N_res_SIFM','B_E_res_SIFM','B_C_res_SIFM',
						'B_N_res_CHAOS-5-Combined','B_E_res_CHAOS-5-Combined','B_C_res_CHAOS-5-Combined',
						'B_N_res_Custom_Model','B_E_res_Custom_Model','B_C_res_Custom_Model',
						'Latitude', 'Longitude', 'Radius'
					]
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
				if(this.$('.d3canvas').length == 1){
					$('#scatterdiv').empty();
					$('#parallelsdiv').empty();
					var args = {
						selector: this.$('.d3canvas')[0],
						parsedData: data
					};

					this.sp.loadData(args);
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