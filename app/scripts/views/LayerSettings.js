(function() {
	'use strict';

	var root = this;

	root.define([
		'backbone',
		'communicator',
		'hbs!tmpl/LayerSettings',
		'underscore'
	],

	function( Backbone, Communicator, LayerSettingsTmpl ) {

		var LayerSettings = Backbone.Marionette.Layout.extend({

			template: {type: 'handlebars', template: LayerSettingsTmpl},
			className: "panel panel-default optionscontrol not-selectable",

			initialize: function(options) {
				this.selected = null;
			},

			/*events: {
		        "change #upload-selection": "onUploadSelectionChanged"
	      	},*/

			onShow: function(view){

				

				this.$(".panel-title").html('<h3 class="panel-title"><i class="fa fa-fw fa-gears"></i> ' + this.model.get("name") + ' Settings</h3>');

		    	this.$('.close').on("click", _.bind(this.onClose, this));
		    	this.$el.draggable({ 
		    		containment: "#main",
		    		scroll: false,
		    		handle: '.panel-heading'
	    		});
		    	var options = this.model.get("parameters");
		    	var height = this.model.get("height");
		    	var outlines = this.model.get("outlines");
		    	var protocol = this.model.get("views")[0].protocol;
		    	var keys = _.keys(options);
				var option = '';
				var colorscaletypes = ["coolwarm", "rainbow", "jet", "custom1", "custom2", "blackwhite"];

				var that = this;

				_.each(keys, function(key){
					if(options[key].selected){
						that.selected = key;
				   		option += '<option value="'+ key + '" selected>' + options[key].name + '</option>';
				   	}else{
				   		option += '<option value="'+ key + '">' + options[key].name + '</option>';
				   	}
				});

				this.$("#options").append(option);

				if(options[this.selected].description){
					this.$("#description").text(options[this.selected].description);
				}

				if(options[that.selected].hasOwnProperty("logarithmic")){
					this.addLogOption(options);
				}

				this.$("#options").change(function(evt){

					delete options[that.selected].selected;
					that.selected = $(evt.target).find("option:selected").val();

					that.$("#style").empty();
					var colorscale_options = "";
					var selected_colorscale;
					_.each(colorscaletypes, function(colorscale){
						if(options[that.selected].colorscale == colorscale){
							selected_colorscale = colorscale;
					   		colorscale_options += '<option value="'+ colorscale + '" selected>' + colorscale + '</option>';
					   	}else{
					   		colorscale_options += '<option value="'+ colorscale + '">' + colorscale + '</option>';
					   	}
					});

					that.$("#style").append(colorscale_options);

					that.$("#range_min").val(options[that.selected].range[0]);
					that.$("#range_max").val(options[that.selected].range[1]);

					if(options[that.selected].hasOwnProperty("logarithmic")){
						that.addLogOption(options);

					}else{
						that.$("#logarithmic").empty();
					}

					options[that.selected].selected = true;

					if(options[that.selected].description){
						that.$("#description").text(options[that.selected].description);
					}

					if(options[that.selected].hasOwnProperty("logarithmic"))
						that.createScale(options[that.selected].logarithmic);
					else
						that.createScale();

					that.createHeightTextbox(height);

					Communicator.mediator.trigger("layer:band:changed", that.model.get("name"), that.selected, options[that.selected].range);
				});

				this.$("#range_min").val(options[this.selected].range[0]);
				this.$("#range_max").val(options[this.selected].range[1]);

				this.$("#range_min").keypress(function(evt) {
					if(evt.keyCode == 13){ //Enter pressed
						evt.preventDefault();
						var range = [parseFloat($(this).val()), options[that.selected].range[1]];
						options[that.selected].range[0] = range[0];
						that.model.set("parameters", options);

						if(options[that.selected].hasOwnProperty("logarithmic"))
							that.createScale(options[that.selected].logarithmic);
						else
							that.createScale();

						Communicator.mediator.trigger("layer:range:changed", that.model.get("name"), range);
					}
				});

				this.$("#range_max").keypress(function(evt) {
					if(evt.keyCode == 13){ //Enter pressed
						evt.preventDefault();
						var range = [options[that.selected].range[0], parseFloat($(this).val())];
						options[that.selected].range[1] = range[1];
						that.model.set("parameters", options);

						if(options[that.selected].hasOwnProperty("logarithmic"))
							that.createScale(options[that.selected].logarithmic);
						else
							that.createScale();
						
						Communicator.mediator.trigger("layer:range:changed", that.model.get("name"), range);
						
					}
				});

				

				var colorscale_options = "";
				var selected_colorscale;
				_.each(colorscaletypes, function(colorscale){
					if(options[that.selected].colorscale == colorscale){
						selected_colorscale = colorscale;
				   		colorscale_options += '<option value="'+ colorscale + '" selected>' + colorscale + '</option>';
				   	}else{
				   		colorscale_options += '<option value="'+ colorscale + '">' + colorscale + '</option>';
				   	}
				});

				this.$("#style").append(colorscale_options);
				this.$("#gradient").attr("class", selected_colorscale);

				this.$("#style").change(function(evt){
					var selected = $(evt.target).find("option:selected").text();
					selected_colorscale = selected;
					that.$("#gradient").attr("class", selected_colorscale);
					options[that.selected].colorscale = selected;
					that.model.set("parameters", options);

					if(options[that.selected].hasOwnProperty("logarithmic"))
						that.createScale(options[that.selected].logarithmic);
					else
						that.createScale();

					Communicator.mediator.trigger("layer:style:changed", that.model.get("name"), selected_colorscale);
				});

				

				if(!(typeof outlines === 'undefined')){
					var checked = "";
					if (outlines)
						checked = "checked";

					this.$("#outlines").append(
						'<form style="vertical-align: middle;">'+
						'<label for="outlines" style="width: 70px;">Outlines: </label>'+
						'<input type="checkbox" name="outlines" value="outlines" ' + checked + '></input>'+
						'</form>'
					);

					this.$("#outlines input").change(function(evt){
						var outlines = !that.model.get("outlines");
						that.model.set("outlines", outlines);
						Communicator.mediator.trigger("layer:outlines:changed", that.model.get("name"), outlines);
					});
				}





				
				if(!(typeof this.model.get("coefficients_range") === 'undefined')){

					this.$("#coefficients_range").append(
					'<li style="margin-top: 5px;">'+
						'<label for="coefficients_range_min" style="width: 120px;">Coefficients range: </label>'+
						'<textarea rows="1" cols="10" id="coefficients_range_min" style="resize: none;"></textarea>'+
						'<textarea rows="1" cols="10" id="coefficients_range_max" style="resize: none;margin-left:8px"></textarea>'+
					'</li>'+
					'<p style="font-size:0.85em; margin-left:130px;"> [-1,-1]: No range limitation</p>'
					);

					this.$("#coefficients_range_min").val(this.model.get("coefficients_range") [0]);
					this.$("#coefficients_range_max").val(this.model.get("coefficients_range") [1]);

					this.$("#coefficients_range_min").keypress(function(evt) {
						if(evt.keyCode == 13){ //Enter pressed
							evt.preventDefault();
							var coefficients_range = that.model.get("coefficients_range");
							var range = [parseFloat($(this).val()), coefficients_range[1]];
							that.model.set("coefficients_range", range);
							Communicator.mediator.trigger("coefficients:range:changed", that.model);
						}
					});

					this.$("#coefficients_range_max").keypress(function(evt) {
						if(evt.keyCode == 13){ //Enter pressed
							evt.preventDefault();
							var coefficients_range = that.model.get("coefficients_range");
							var range = [coefficients_range[0], parseFloat($(this).val())];
							that.model.set("coefficients_range", range);
							Communicator.mediator.trigger("coefficients:range:changed", that.model);
							
						}
					});
				}	





				if (protocol == "WPS"){
					this.$("#shc").append(
						'<p>Spherical Harmonics Coefficients</p>'+
						'<div class="myfileupload-buttonbar ">'+
					    	'<label class="btn btn-default shcbutton">'+
					        '<span><i class="fa fa-fw fa-upload"></i> Upload SHC File</span>'+
					        '<input id="upload-selection" type="file" accept=".shc" name="files[]" />'+
					      '</label>'+
					  '</div>'
					);

					this.$("#upload-selection").change(this.onUploadSelectionChanged.bind(this));

					if(this.model.get('shc_name')){
						that.$("#shc").append('<p id="filename" style="font-size:.9em;">Selected File: '+this.model.get('shc_name')+'</p>');
					}
					
				}



				if(options[this.selected].hasOwnProperty("logarithmic"))
					this.createScale(options[that.selected].logarithmic);
				else
					this.createScale();

				this.createHeightTextbox(height);

		    },

			onClose: function() {
				this.close();
			}, 

			setModel: function(model){
				this.model = model;
			},

			sameModel: function(model){
				return this.model.get("name") == model.get("name");
			},

			onUploadSelectionChanged: function(evt) {
				var that = this;
	      		var reader = new FileReader();
	      		var filename = evt.target.files[0].name;
				reader.onloadend = function(evt) {
					//console.log(evt.target.result);
					that.model.set('shc', evt.target.result);
					that.model.set('shc_name', filename);
					that.$("#shc").find("#filename").remove();
					that.$("#shc").append('<p id="filename" style="font-size:.9em;">Selected File: '+filename+'</p>');
					Communicator.mediator.trigger("file:shc:loaded", evt.target.result);

					var options = { name: that.model.get("name"), isBaseLayer: false, visible: false };
					Communicator.mediator.trigger('map:layer:change', options);
					Communicator.mediator.trigger("layer:activate", that.model.get("views")[0].id);


				}

				reader.readAsText(evt.target.files[0]);
	      	},

	      	addLogOption: function(options){
	      		var that = this;
	      		if(options[this.selected].hasOwnProperty("logarithmic")){
					var checked = "";
					if (options[this.selected].logarithmic)
						checked = "checked";

					this.$("#logarithmic").append(
						'<form style="vertical-align: middle;">'+
						'<label for="outlines" style="width: 100px;">Log. Scale: </label>'+
						'<input type="checkbox" name="logarithmic" value="logarithmic" ' + checked + '></input>'+
						'</form>'
					);

					this.$("#logarithmic input").change(function(evt){
						var options = that.model.get("parameters");
						options[that.selected].logarithmic = !options[that.selected].logarithmic;
						Communicator.mediator.trigger("layer:fieldlines:changed");

						if(options[that.selected].hasOwnProperty("logarithmic"))
							that.createScale(options[that.selected].logarithmic);
						else
							that.createScale();
					});
				}
	      	},

	      	createScale: function(logscale){

	      		var superscript = "⁰¹²³⁴⁵⁶⁷⁸⁹",
    			formatPower = function(d) { 
    				if (d>=0)
    					return (d + "").split("").map(function(c) { return superscript[c]; }).join("");
    				else if (d<0)
    					return "⁻"+(d + "").split("").map(function(c) { return superscript[c]; }).join("");
    			};

	      		$("#setting_colorscale").empty();
	      		var margin = 20;
				var width = $("#setting_colorscale").width();
				var scalewidth =  width - margin *2;

				var range_min = this.model.get("parameters")[this.selected].range[0];
				var range_max = this.model.get("parameters")[this.selected].range[1];
				var uom = this.model.get("parameters")[this.selected].uom;
				var style = this.model.get("parameters")[this.selected].colorscale;

				$("#setting_colorscale").append(
					'<div class="'+style+'" style="width:'+scalewidth+'px; height:20px; margin-left:'+margin+'px"></div>'
				);



				var svgContainer = d3.select("#setting_colorscale").append("svg")
					.attr("width", width)
					.attr("height", 40);

				var axisScale;
				
				if(logscale){
					axisScale = d3.scale.log();
					if (range_min == 0)
						range_min = 0.001;
				}else{
					axisScale = d3.scale.linear();
				}

				axisScale.domain([range_min, range_max]);
				axisScale.range([0, scalewidth]);

				var xAxis = d3.svg.axis()
					.scale(axisScale)
					.ticks(8, function(d) { 
						return 10 + formatPower(Math.round(Math.log(d) / Math.LN10)); 
					});

				//axisScale.tickFormat(5,'e');
				//xAxis.tickFormat(function(d) { return "e" + formatPower(Math.round(Math.log(d))); });

				xAxis.tickValues( axisScale.ticks( 5 ).concat( axisScale.domain() ) );


			    var g = svgContainer.append("g")
			        .attr("class", "x axis")
			        .attr("transform", "translate(" + [margin, 3]+")")
			        .call(xAxis);
			       

				if(uom){
					g.append("text")
						.style("text-anchor", "middle")
						.style("font-size", "1.1em")
						.attr("transform", "translate(" + [scalewidth/2, 35]+")")
						.text(uom);
				}

				svgContainer.selectAll(".tick").select("line")
					.attr("stroke", "black");
	      	},

	      	createHeightTextbox: function(height){
	      		var that = this;
	      		this.$("#height").empty();
	      		if(height && this.selected != "Fieldlines"){
					this.$("#height").append(
						'<form style="vertical-align: middle;">'+
						'<label for="heightvalue" style="width: 70px;">Height: </label>'+
						'<textarea rows="1" cols="10" id="heightvalue" style="resize: none;margin:0;vertical-align: middle;"></textarea>'+
						'</form>'
					);
					this.$("#heightvalue").val(height);
					this.$("#height").append(
						'<p style="font-size:0.85em; margin-left: 70px;">Above ellipsoid (Km)</p>'
					);

					this.$("#heightvalue").keypress(function(evt) {
						if(evt.keyCode == 13){ //Enter pressed
							evt.preventDefault();
							var new_height = parseInt($(this).val());
							Communicator.mediator.trigger("layer:height:changed", that.model.get("name"), new_height);
							that.model.set("height", new_height);
						}
					});
				}
	      	}

		});

		return {"LayerSettings": LayerSettings};

	});

}).call( this );
