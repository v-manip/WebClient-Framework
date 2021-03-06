define(['backbone.marionette',
		'communicator',
		'app',
		'models/AnalyticsModel',
		'globals',
		'hbs!tmpl/wps_getdata',
		'hbs!tmpl/wps_getCoverageDifference',
		'hbs!tmpl/wps_getVolumePixelValues',
		'hbs!tmpl/wps_getValuesThroughTime',
		'd3',
		'analytics',
		'nv'
	],
	function(Marionette, Communicator, App, AnalyticsModel, globals, wps_getdataTmpl, wps_getCovDiffTmpl, wps_getVolumePixelValuesTmpl, wps_getValuesThroughTimeTmpl) {

		var AnalyticsView = Marionette.View.extend({

			model: new AnalyticsModel.AnalyticsModel(),
			className: "analytics",

			initialize: function(options) {
				this.isClosed = true;
				this.selection_list = [];
				this.plotdata = [];
				this.img = null;
				this.overlay = null;
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
	                    if (model.get("processes")) {
	                        this.activeWPSproducts.push(model.get('processes')[0].layer_id)
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

				var colors = globals.objects.get("productcolors");

				this.plot_type = type;

				if(type!="overlay")
					this.$('.d3canvas').empty();
				
				var args = {
					selector: this.$('.d3canvas')[0],
					data: this.plotdata,
					colors: colors
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
					case 'stacked':
						analytics.stackedPlot(args);
						break;
					case 'line':
						analytics.linePlot(args);
						break;
					case 'diff':
						this.$('.d3canvas').html(
							'<div class="outer">'+
								'<div class="middle">'+
									'<div class="inner">'+
										'<img id="diffimg" style="width:100%; height:100%;" src="data:image/png;base64,' + this.img + '" />'+
									'</div>'+
								'</div>'+
							'</div>'
						);

							
						this.img = null;
						break;
					case 'overlay':
						this.$('.d3canvas').append(
							'<div class="outer">'+
								'<div class="middle">'+
									'<div class="inner">'+
										'<img style="width:100%; height:100%;z-index=800"; background:transparent; src="' + this.overlay + '" />'+
									'</div>'+
								'</div>'+
							'</div>'
						);	
						this.overlay = null;
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
		              			              
		            }else{
		            	_.each(product.get("processes"), function(process){
	            			if (this.activeWPSproducts.indexOf(process.layer_id)!=-1)
			                	this.activeWPSproducts.splice(this.activeWPSproducts.indexOf(process.layer_id), 1);
			              	console.log(this.activeWPSproducts);
	            		},this);
		            }
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
				var getvolumepixelvaluelist = [];
				var getvaluesthroughtimelist = [];

				globals.products.each(function(model) {
	                if (model.get('visible')) {
	                	var processes = model.get("processes");
	                	_.each(processes, function(process){
	                		if(process){
			                    switch (process.id){
			                    	case "getData":
			                    		getdatalist.push(process.layer_id);
			                    	break;
			                    	case "getCoverageData":
			                    		getcoveragedifflist.push(process.layer_id);
			                    	break;
			                    	case "getVolumePixelValues":
			                    		getvolumepixelvaluelist.push(process.layer_id);
			                    	break;
			                    	case "getValuesThroughTime":
			                    		getvaluesthroughtimelist.push(process.layer_id);
			                    	break;
			                    	
			                    }
			                }
	                	}, this);
	                }
            	}, this);

            	/*if (getcoveragedifflist.length > 0 && this.selection_list[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Polygon"){

            		var bbox = this.selection_list[0].geometry.getBounds().toBBOX();

					var request_process = wps_getCovDiffTmpl({
						layer: getcoveragedifflist,
						start: getISODateTimeString(this.selected_time.start),
						end: getISODateTimeString(this.selected_time.end),
						bbox: bbox,
						srid: "4326"
					});

					var url = "http://demo.v-manip.eox.at/browse/ows" + "?service=WPS&version=1.0.0&request=Execute&" +
							  "identifier=getCoverageDifference&" +
							  "DataInputs="+
							  "collections="+ getcoveragedifflist +"%3B"+
							  "begin_time="+ getISODateTimeString(this.selected_time.start) +"%3B"+
							  "end_time="+ getISODateTimeString(this.selected_time.end) +"%3B"+
							  "bbox="+ bbox +"%3B"+
							  "crs=4326&"+
							  "rawdataoutput=processed";

					//Communicator.mediator.trigger("map:load:image", url);

					$.post( "http://demo.v-manip.eox.at/browse/ows", request_process, function( data ) {
						that.img = data;
						Communicator.mediator.trigger("map:load:image", data);
						that.render("diff");
						var url = "http://a.tiles.maps.eox.at/wms/?"
						var req = "LAYERS=overlay&TRANSPARENT=true&FORMAT=image%2Fpng&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&STYLES=&SRS=EPSG%3A4326";
						//var BBOX=33.75,45,39.375,50.625&
						req = req + "&BBOX=" + that.selection_list[0].geometry.getBounds().toBBOX();
						var img = document.getElementById('diffimg');
						req = req + "&WIDTH=" + img.clientWidth;
						req = req + "&HEIGHT=" + img.clientHeight;
						that.overlay = url + req;
						that.render("overlay");
						console.log(req);
					});

            	}else */if (getdatalist.length == 1 && this.selection_list[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Point"){
            		var list = "";
					for (var i=0;i<this.selection_list.length;i++){
						list += this.selection_list[i].geometry.x +','+ this.selection_list[i].geometry.y + ';';
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

					$.post( "https://demo.v-manip.eox.at/unsec/ows", request_process, function( data ) {
						that.plotdata = data;
						that.render(that.plot_type);
					});
            	}else if (getvolumepixelvaluelist.length > 0 && this.selection_list[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Point"){

            		var list = "";
					for (var i=0;i<this.selection_list.length;i++){
						list += this.selection_list[i].geometry.x +','+ this.selection_list[i].geometry.y + ';';
					}
					list = list.substring(0, list.length - 1);

					var request_process = wps_getVolumePixelValuesTmpl({
						layers: getvolumepixelvaluelist,
						start: getISODateTimeString(this.selected_time.start),
						end: getISODateTimeString(this.selected_time.end),
						list: list,
						srid: "4326"
					});
					$.post( "http://demo.v-manip.eox.at/browse/ows", request_process, function( data ) {
						that.plotdata = data;
						that.render(that.plot_type);
					});

            	}else if (getvaluesthroughtimelist.length > 0 && this.selection_list[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Point"){

            		var list = "";
					for (var i=0;i<this.selection_list.length;i++){
						list += this.selection_list[i].geometry.x +','+ this.selection_list[i].geometry.y + ';';
					}
					list = list.substring(0, list.length - 1);

					var request_process = wps_getValuesThroughTimeTmpl({
						layers: getvaluesthroughtimelist,
						start: getISODateTimeString(this.selected_time.start),
						end: getISODateTimeString(this.selected_time.end),
						list: list,
						srid: "4326"
					});
					$.post( "http://demo.v-manip.eox.at/browse/ows", request_process, function( data ) {
						that.plotdata = data;
						that.render('line');
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