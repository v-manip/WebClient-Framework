(function() {
	'use strict';

	var root = this;

	root.require([
		'backbone',
		'communicator',
    	'globals',
		'app',
	],

	function( Backbone, Communicator, globals, App) {

		var DifferenceController = Backbone.Marionette.Controller.extend({

		    initialize: function(options){

		    	this.selection_list = [];
				this.activeWPSproducts = [];
				//this.selected_time = Communicator.reqres.request('get:time');

				this.listenTo(Communicator.mediator, "map:layer:change",this.changeLayer);
				this.listenTo(Communicator.mediator, "selection:changed", this.onSelectionChanged);
				this.listenTo(Communicator.mediator, 'time:change', this.onTimeChange);
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

			onSelectionChanged: function(feature) {
				
				if(feature){
					this.selection_list.push(feature.clone());
					this.checkSelections();
				}else{
					this.plotdata = [];
					this.selection_list = [];
					this.checkSelections();
				}

				
			},

			checkSelections: function(){
				this.selected_time = Communicator.reqres.request('get:time');
				if (this.activeWPSproducts.length > 0 && this.selection_list.length > 0 && this.selected_time){
					this.sendRequest();
				}else{
					//TODO remove image layer
				}
			},

			onTimeChange: function (time) {
				this.selected_time = time;
				this.checkSelections();
			},

			sendRequest: function(){

				var that = this;

				var getcoveragedifflist = [];

				globals.products.each(function(model) {
	                if (model.get('visible')) {
	                	var processes = model.get("processes");
	                	_.each(processes, function(process){
	                		if(process){
	                			if (process.id == "getCoverageData"){
	                				getcoveragedifflist.push(process.layer_id);
	                			}
			                }
	                	}, this);
	                }
            	}, this);

            	if (getcoveragedifflist.length > 0 && this.selection_list[0].geometry.CLASS_NAME == "OpenLayers.Geometry.Polygon"){

            		var bbox = this.selection_list[0].geometry.getBounds().toBBOX();

					var url = "http://demo.v-manip.eox.at/browse/ows" + "?service=WPS&version=1.0.0&request=Execute&" +
							  "identifier=getCoverageDifference&" +
							  "DataInputs="+
							  "collections="+ getcoveragedifflist +"%3B"+
							  "begin_time="+ getISODateTimeString(this.selected_time.start) +"%3B"+
							  "end_time="+ getISODateTimeString(this.selected_time.end) +"%3B"+
							  "bbox="+ bbox +"%3B"+
							  "crs=4326&"+
							  "rawdataoutput=processed";

					Communicator.mediator.trigger("map:load:image", url, this.selection_list[0].geometry.getBounds());
            	}
			}
		});
		return new DifferenceController();
	});

}).call( this );