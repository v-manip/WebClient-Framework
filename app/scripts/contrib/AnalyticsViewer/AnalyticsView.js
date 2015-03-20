define(['backbone.marionette',
		'communicator',
		'app',
		'models/AnalyticsModel',
		'globals',
		'hbs!tmpl/wps_getdata',
		'd3',
		'analytics',
		'nv'
	],
	function(Marionette, Communicator, App, AnalyticsModel, globals, wps_getdataTmpl) {

		var AnalyticsView = Marionette.View.extend({

			model: new AnalyticsModel.AnalyticsModel(),
			className: "analytics",

			initialize: function(options) {
				this.isClosed = true;
				this.selection_list = [];
				this.plotdata = [];
				this.request_url = "";
				this.img = null;
				this.overlay = null;
				this.activeWPSproducts = [];
				this.plot_type = 'scatter';
				this.selected_time = Communicator.reqres.request('get:time');
				//this.shc = null;
				this.shc_active = false;
				this.activeModels = [];
				this.sp = null;

				$(window).resize(function() {
					this.onResize();
				}.bind(this));
			},

			/*events: {
				'click .scatter-btn': function() {
					this.render('scatter');
				},

			},*/

			onShow: function() {
				
				//this.delegateEvents();
				this.isClosed = false;
				//this.triggerMethod('view:connect');

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
				

				this.$el.append(
					"<div class='d3canvas'></div>" +
					"<div class='gui'>" +
					"</div> ");


				globals.products.each(function(product) {
	                if (product.get('visible')) {
	                    if (product.get("processes")) {
	                        this.activeWPSproducts.push(product.get('processes')[0].layer_id)
	                    }
	                    if (product.get("model")){
		              		this.activeModels.push(product.get("views")[0].id);
		              	}
	                }
            	}, this);

            	var args = {
					selector: this.$('.d3canvas')[0]
				};

            	this.sp = new scatterPlot(args, function(){
								//sp.absolute("id1","Latitude");
								//sp.colatitude("undefined");
							},
							function (values) {
								Communicator.mediator.trigger("cesium:highlight:point", [values.Latitude, values.Longitude, values.Radius]);
							}, 
							function(){
								Communicator.mediator.trigger("cesium:highlight:removeAll");
							},
							function(filter){
								Communicator.mediator.trigger("download:set:filter", filter);
							});


				this.render('scatter');

				this.checkSelections();
				
				return this;
			},

			onResize: function() {
			},

			render: function(type) {

				var colors = globals.objects.get("productcolors");

				this.plot_type = type;

				if(type!="overlay")
					this.$('.d3canvas').empty();

				var args = {
					selector: this.$('.d3canvas')[0],
					//url: this.request_url
					data: this.plotdata,
					//colors: colors
				};
				

				switch (type){
					case 'scatter':
						this.sp.loadData(args);
					break;
				}

				this.onResize();
			},

			changeLayer: function(options) {
				if (!options.isBaseLayer){
		          var product = globals.products.find(function(model) { return model.get('name') == options.name; });
		          if (product){
		            if(options.visible && product.get('timeSlider')){

		            	if (product.get("processes")){
		            		_.each(product.get("processes"), function(process){
		            			this.activeWPSproducts.push(process.layer_id);
		            		},this);
		              	}
		              	if (product.get("model")){
		              		//this.activeModels.push({id: product.get("views")[0].id, url: product.get("views")[0.urls[0]]});
		              		this.activeModels.push(product.get("views")[0].id);
		              	}
		              			              
		            }else{
		            	_.each(product.get("processes"), function(process){
	            			if (this.activeWPSproducts.indexOf(process.layer_id)!=-1)
			                	this.activeWPSproducts.splice(this.activeWPSproducts.indexOf(process.layer_id), 1);
			              	console.log(this.activeWPSproducts);
	            		},this);

	            		if (product.get("model")){
		              		//this.activeModels.push({id: product.get("views")[0].id, url: product.get("views")[0.urls[0]]});
		              		if (this.activeModels.indexOf(product.get("views")[0].id)!=-1)
		              			this.activeModels.splice(this.activeModels.indexOf(product.get("views")[0].id), 1);
		              	}
		            }
		            if(options.visible && product.get("views")[0].id == "shc")
		            	this.shc_active = true;
		            else if (!options.visible && product.get("views")[0].id == "shc")
		            	this.shc_active = false;

		            this.checkSelections();
		          }
		        }
			},

			onSortProducts: function(productLayers) {},

			onSelectionChanged: function(feature) {
				
				if(feature){
					this.selection_list.push(feature.clone());
					this.checkSelections();
				}else{
					this.plotdata = [];
					this.selection_list = [];
					this.request_url = "";
					this.checkSelections();
				}

				
			},

			checkSelections: function(){
				//if (this.activeWPSproducts.length > 0 && this.selection_list.length > 0 && this.selected_time){
				if (this.activeWPSproducts.length > 0 && this.selected_time){
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

				var map_crs_reverse_axes = true;

				var retrieve_data = [];

				globals.products.each(function(model) {
	                if (model.get('visible')) {
	                	var processes = model.get("processes");
	                	_.each(processes, function(process){
	                		if(process){
			                    switch (process.id){
			                    	case "retrieve_data":
			                    		retrieve_data.push({
			                    			layer:process.layer_id,
			                    			url: model.get("views")[0].urls[0]
			                    		});
			                    	break;
			                    	
			                    }
			                }
	                	}, this);
	                }
            	}, this);


            	if (retrieve_data.length > 0){

            		var options = {
        				"collection_ids": retrieve_data.map(function(e){return e.layer;}).join(),
        				"begin_time": getISODateTimeString(this.selected_time.start),
        				"end_time": getISODateTimeString(this.selected_time.end)
        			};

            		if(this.selection_list.length > 0)
            			options["bbox"] = this.selection_list[0].geometry.getBounds().toBBOX(10,map_crs_reverse_axes);	
            		
            		var shc_model = _.find(globals.products.models, function(p){return p.get("shc") != null;});
            		if(shc_model){
            			options["shc"] = shc_model.get("shc");
            		}

            		if(this.activeModels.length > 0)
            			options["model_ids"] = this.activeModels.join();

            		var req_data = wps_getdataTmpl(options);

        			var that = this;

        			$.post( retrieve_data[0].url, req_data, "xml")
						.done(function( data ) {
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