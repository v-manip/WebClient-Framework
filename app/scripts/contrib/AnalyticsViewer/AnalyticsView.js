define(['backbone.marionette',
		'communicator',
		'app',
		'models/AnalyticsModel',
		'globals',
		'hbs!tmpl/wps_getdata',
		'd3',
		'analytics'
	],
	function(Marionette, Communicator, App, AnalyticsModel, globals, wps_getdataTmpl) {

		var AnalyticsView = Marionette.View.extend({

			model: new AnalyticsModel.AnalyticsModel(),
			className: "analytics",

			initialize: function(options) {
				this.isClosed = true;
				this.request_url = "";
				this.plot_type = 'scatter';
				this.sp = null;

				$(window).resize(function() {
					this.onResize();
				}.bind(this));
			},


			onShow: function() {

				var that = this;
				
				this.isClosed = false;

				this.selection_list = [];
				this.plotdata = [];
				this.request_url = "";
				this.img = null;
				this.overlay = null;
				this.activeWPSproducts = [];
				this.plot_type = 'scatter';


				// TODO: Dirty hack to handle how analyticsviewer re-renders button, need to update analaytics viewer
				var download = d3.select(this.el).append("button")   
			        .attr("type", "button")
			        .attr("id", "tmp_download_button")
			        .attr("class", "btn btn-success")
			        .attr("style", "position: absolute; right: 55px; top: 7px; z-index: 8000;")
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
					toIgnoreHistogram: ['id','Timestamp','SyncStatus','dF_AOCS','dF_other','B_VFM','B_NEC','dB_AOCS','dB_other','B_error','q_NEC_CRF','Att_error','Flags_F','Flags_B','Flags_q','Flags_Platform','ASM_Freq_Dev']
				};

				

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

				if(swarmdata && swarmdata.length>0){
					args['parsedData'] = swarmdata;
					that.sp.loadData(args);
				}

				


				globals.swarm.on('change:data', function(model, data) {
				  	var args = {
						selector: that.$('.d3canvas')[0],
						parsedData: data
					};

					that.sp.loadData(args);
					
				});
				
				return this;
			},

			onResize: function() {
			},

			render: function(type) {

				this.onResize();
			},

			close: function() {
	            this.isClosed = true;
	            this.triggerMethod('view:disconnect');
	        }

		});

		return AnalyticsView;
	});