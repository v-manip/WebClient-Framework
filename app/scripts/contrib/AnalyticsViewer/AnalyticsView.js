define(['core/BaseView',
		'communicator',
		'app',
		'models/AnalyticsModel',
		'globals',
		'd3',
		'analytics',
		'nv'
	],
	function(BaseView, Communicator, App, AnalyticsModel, globals) {

		var AnalyticsView = BaseView.extend({

			model: new AnalyticsModel.AnalyticsModel(),
			className: "analytics",

			initialize: function(options) {
				// Initialize parent upfront to have this.context() initialized:
				BaseView.prototype.initialize.call(this, options);
				this.enableEmptyView(false);

				this.selection_list = [];
				this.plotdata = [];
				this.plot_type = 'scatter';
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

        	didInsertElement: function() {
				this.listenTo(Communicator.mediator, "map:layer:change", this.changeLayer);
				this.listenTo(Communicator.mediator, "productCollection:sortUpdated", this.onSortProducts);
				this.listenTo(Communicator.mediator, "selection:changed", this.onSelectionChanged);
				this.listenTo(Communicator.mediator, 'time:change', this.onTimeChange);

				this.$el.append(
					"<div class='d3canvas'></div>" +
					"<div class='gui'>" +
						"<div class='scatter-btn highlight '><i class='sprite sprite-scatter' style='widht:22px'></i></div>" +
						"<div class='box-btn highlight '><i class='sprite sprite-box'></i></div>" +
						"<div class='parallel-btn highlight '><i class='sprite sprite-parallel'></i></div>" +
					"</div> ");


				this.render('scatter');
				
				return this;				
			},

	        didRemoveElement: function() {
	            // NOTE: The 'listenTo' bindings are automatically unbound by marionette
	        },

	        showEmptyView: function() {
	            // FIXXME: use marionette's templating mechanism for that!
	            this.$el.html('<div class="empty-view">Please select an Area of Interest (AoI) in one of the map viewer!</div>');
	        },

	        hideEmptyView: function() {
	            // CAUTION: simply removing the content of the view's div can have sideeffects. Be cautious not
	            // to accidently remove previousle created elements!
	            this.$el.html('');
	        },

			render: function(type) {

				this.plot_type = type;

				
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
				}
			},

			changeLayer: function(options) {},

			onSortProducts: function(productLayers) {},

			onSelectionChanged: function(feature) {

				var that = this;
				console.log(feature);
				
				if(feature){
					this.selection_list.push(feature);
					var selected_features = this.selection_list.length;

					request_process = '<?xml version="1.0" encoding="UTF-8"?>'+
								'<wps:Execute version="1.0.0" service="WPS" '+
								'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
								'xmlns="http://www.opengis.net/wps/1.0.0" '+
								'xmlns:wfs="http://www.opengis.net/wfs" '+
								'xmlns:wps="http://www.opengis.net/wps/1.0.0" '+
								'xmlns:ows="http://www.opengis.net/ows/1.1" '+
								'xmlns:gml="http://www.opengis.net/gml" '+
								'xmlns:ogc="http://www.opengis.net/ogc" '+
								'xmlns:wcs="http://www.opengis.net/wcs/1.1.1" '+
								'xmlns:xlink="http://www.w3.org/1999/xlink" '+
								'xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsAll.xsd">'+
								  '<ows:Identifier>random_gen</ows:Identifier>'+
								  '<wps:DataInputs>'+
								    '<wps:Input>'+
								      '<ows:Identifier>input</ows:Identifier>'+
								      '<wps:Data>'+
								        '<wps:LiteralData>'+ selected_features +'</wps:LiteralData>'+
								      '</wps:Data>'+
								    '</wps:Input>'+
								  '</wps:DataInputs>'+
								  '<wps:ResponseForm>'+
								    '<wps:RawDataOutput mimeType="text/plain">'+
								      '<ows:Identifier>output</ows:Identifier>'+
								    '</wps:RawDataOutput>'+
								  '</wps:ResponseForm>'+
								'</wps:Execute>';

					$.post( "http://localhost:9000/wps/cgi-bin/wps", request_process, function( data ) {
						that.plotdata = data;
						that.render(that.plot_type);
					});

				}else{
					this.plotdata = [];
					this.selection_list = [];
					this.render(this.plot_type);
				}

				
			},

			onTimeChange: function () {},

			close: function() {
	            this.isClosed = true;
	            this.triggerMethod('view:disconnect');
	        },

			/*onClose: function(){
				this.$el.empty();
				this.isClosed = true;
				
			}*/
		});

		return AnalyticsView;
	});