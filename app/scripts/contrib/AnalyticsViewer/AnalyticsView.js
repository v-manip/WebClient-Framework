define(['backbone.marionette',
		'communicator',
		'app',
		'models/AnalyticsModel',
		'globals',
		'hbs!tmpl/wps_getdata',
		'hbs!tmpl/wps_getCoverageDifference',
		'd3',
		'analytics',
		'nv'
	],
	function(Marionette, Communicator, App, AnalyticsModel, globals, wps_getdataTmpl, wps_getCovDiffTmpl) {

		var AnalyticsView = Marionette.View.extend({

			model: new AnalyticsModel.AnalyticsModel(),
			className: "analytics",

			initialize: function(options) {
				this.isClosed = true;
				this.selection_list = [];
				this.plotdata = [];
				this.img = null;
				this.activeWPSproducts = [];
				this.plot_type = 'scatter';
				this.selected_time = Communicator.reqres.request('get:time');
				$(window).resize(function() {
					this.onResize();
				}.bind(this));
			},

			events: {
				'click .scatter-btn': function() {
					this.render('scatter');
				},

				'click .box-btn': function() {
					this.render('box');	
				},

				'click .parallel-btn': function() {
					this.render('parallel');
				}
			},

			onShow: function() {
				
				//this.delegateEvents();
				this.isClosed = false;
				//this.triggerMethod('view:connect');
				

				this.$el.append(
					"<div class='d3canvas'></div>" +
					"<div class='gui'>" +
						"<div class='scatter-btn highlight '><i class='sprite sprite-scatter' style='widht:22px'></i></div>" +
						"<div class='box-btn highlight '><i class='sprite sprite-box'></i></div>" +
						"<div class='parallel-btn highlight '><i class='sprite sprite-parallel'></i></div>" +
					"</div> ");


				globals.products.each(function(model) {
	                if (model.get('visible')) {
	                    if (model.get("process")) {
	                        this.activeWPSproducts.push(model.get('process').layer_id)
	                    } 
	                }
            	}, this);


				this.render('scatter');

				this.checkSelections();
				
				return this;
			},

			onResize: function() {
			},

			render: function(type) {

				this.plot_type = type;

				this.$('.d3canvas').empty();
				var args = {
					selector: this.$('.d3canvas')[0],
					data: this.plotdata
				};

				switch (type){
					case 'scatter':
						analytics.scatterPlot(args);
						break;
					case 'box':
						analytics.boxPlot(args);
						break;
					case 'parallel':
						analytics.parallelsPlot(args);
						break;
					case '':
						this.$('.d3canvas').html(
							'<div class="outer">'+
								'<div class="middle">'+
									'<div class="inner">'+
										'<img style="width:100%; height:100%;" src="data:image/png;base64,' + this.img + '" />'+
									'</div>'+
								'</div>'+
							'</div>'
						);

							
						this.img = null;
						break;
				}

				this.onResize();
			},

			changeLayer: function(options) {
				if (!options.isBaseLayer){
		          var product = globals.products.find(function(model) { return model.get('name') == options.name; });
		          if (product){
		            if(options.visible && product.get('timeSlider')){

		            	if (product.get("process")){
		                  this.activeWPSproducts.push(product.get('process').layer_id);
		              	}
		              	this.checkSelections();
		              
		            }else{
		              if (this.activeWPSproducts.indexOf(product.get('process').layer_id)!=-1)
		                this.activeWPSproducts.splice(this.activeWPSproducts.indexOf(product.get('process').layer_id), 1);
		              console.log(this.activeWPSproducts);
		            }
		          }
		        }
			},

			onSortProducts: function(productLayers) {},

			onSelectionChanged: function(feature) {
				
				if(feature){
					this.selection_list.push(feature);
					this.checkSelections();
				}else{
					this.plotdata = [];
					this.selection_list = [];
					//this.render(this.plot_type);
					this.checkSelections();
				}

				
			},

			checkSelections: function(){
				if (this.activeWPSproducts.length > 0 && this.selection_list.length > 0 && this.selected_time){
					this.sendRequest();
				}else{
					this.$('.d3canvas').empty();
					this.$('.d3canvas').html('<div class="empty-view">Please make sure to select a Layer, an Area of Interest (AoI) and a Time of Interest</div>');
				}
			},

			onTimeChange: function (time) {
				this.selected_time = time;
				this.checkSelections();
			},

			sendRequest: function(){

				var that = this;

				var getcoveragedifflist = [];
				var getdatalist = [];

				globals.products.each(function(model) {
	                if (model.get('visible')) {
	                	var process = model.get("process");
	                	if(process){
		                    switch (process.id){
		                    	case "getData":
		                    		getdatalist.push(model.get("process").layer_id);
		                    	break;
		                    	case "getCoverageData":
		                    		getcoveragedifflist.push(model.get("process").layer_id);
		                    	break;
		                    }
		                }

	                }
            	}, this);

            	if (getcoveragedifflist.length > 0){

            		var bbox = this.selection_list[0].geometry.getBounds().toBBOX();

					var request_process = wps_getCovDiffTmpl({
						layer: getcoveragedifflist,
						start: getISODateTimeString(this.selected_time.start),
						end: getISODateTimeString(this.selected_time.end),
						bbox: bbox,
						srid: "4326"
					});

					$.post( "http://demo.v-manip.eox.at/browse/ows", request_process, function( data ) {
						that.img = data;
						that.render("");
					});

            	}else if (getdatalist.length == 1){
            		var list = "";
					for (var i=0;i<this.selection_list.length;i++){
						list += this.selection_list[i].x +','+ this.selection_list[i].y + ';';
					}
					list = list.substring(0, list.length - 1);

					// TODO: Need to go over all possible layers that have this process
					//       and need to change how the response data is saved, probably array

					var request_process = wps_getdataTmpl({
						layer: getdatalist[0],
						start: getISODateTimeString(this.selected_time.start),
						end: getISODateTimeString(this.selected_time.end),
						list: list,
						srid: "4326"
					});

					$.post( "http://demo.v-manip.eox.at/browse/ows", request_process, function( data ) {
						that.plotdata = data;
						that.render(that.plot_type);
					});
            	}

				
			},

			close: function() {
	            this.isClosed = true;
	            this.triggerMethod('view:disconnect');
	        }

		});

		return AnalyticsView;
	});