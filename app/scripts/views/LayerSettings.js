(function() {
	'use strict';

	var root = this;

	root.define([
		'backbone',
		'communicator',
		'globals',
		'hbs!tmpl/LayerSettings',
		'hbs!tmpl/wps_eval_model_GET',
		'hbs!tmpl/wps_eval_model',
		'underscore',
		'plotty'
	],

	function( Backbone, Communicator, globals, LayerSettingsTmpl, evalModelTmpl, evalModelTmpl_POST ) {

		var LayerSettings = Backbone.Marionette.Layout.extend({

			template: {type: 'handlebars', template: LayerSettingsTmpl},
			className: "panel panel-default optionscontrol not-selectable",
			colorscaletypes : ["coolwarm", "rainbow", "jet", "custom1", "custom2", "blackwhite"],

			initialize: function(options) {
				this.selected = null;
				this.plot = new plotty.plot({
					colorScale: 'jet',
					domain: [0,1]
				});
				this.selected_satellite = "Alpha";
			},

			renderView: function(){
								// Unbind first to make sure we are not binding to many times
				this.stopListening(Communicator.mediator, "layer:settings:changed", this.onParameterChange);

				// Event handler to check if tutorial banner made changes to a model in order to redraw settings
				// If settings open rerender view to update changes
				this.listenTo(Communicator.mediator, "layer:settings:changed", this.onParameterChange);

				this.$(".panel-title").html('<h3 class="panel-title"><i class="fa fa-fw fa-sliders"></i> ' + this.current_model.get("name") + ' Settings</h3>');

		    	this.$('.close').on("click", _.bind(this.onClose, this));
		    	this.$el.draggable({ 
		    		containment: "#main",
		    		scroll: false,
		    		handle: '.panel-heading'
	    		});
		    	var options = this.current_model.get("parameters");
		    	var height = this.current_model.get("height");
		    	var outlines = this.current_model.get("outlines");
		    	var showColorscale = this.current_model.get("showColorscale");
		    	var protocol = this.current_model.get("views")[0].protocol;
		    	var keys = _.keys(options);
				var option = '';
				//var 

				var that = this;

				_.each(keys, function(key){
					if(options[key].selected){
						that.selected = key;
				   		option += '<option value="'+ key + '" selected>' + options[key].name + '</option>';
				   	}else{
				   		option += '<option value="'+ key + '">' + options[key].name + '</option>';
				   	}
				});

				this.$("#options").empty();

				this.$("#options").append(option);

				// Check if selected is not inside the available options
				// This happens if residuals were selected for the layer and
				// then the model was removed also removing the residuals parameter
				// from the cotnext menu.
				// If this happens the visualized parameter needs to be changed
				if(!options.hasOwnProperty(this.selected)){
					this.onOptionsChanged();
				}else{

					if(options[this.selected].description){
						this.$("#description").text(options[this.selected].description);
					}

					if(options[that.selected].hasOwnProperty("logarithmic")){
						this.addLogOption(options);
					}

					this.$("#options").unbind();
					// Add event handler for change in drop down selection
					this.$("#options").change(this.onOptionsChanged.bind(this));

					// Set values for color scale ranges
					this.$("#range_min").val(options[this.selected].range[0]);
					this.$("#range_max").val(options[this.selected].range[1]);
					
					// Register necessary key events
					this.registerKeyEvents(this.$("#range_min"));
					this.registerKeyEvents(this.$("#range_max"));
					

					var colorscale_options = "";
					var selected_colorscale;
					_.each(this.colorscaletypes, function(colorscale){
						if(options[that.selected].colorscale == colorscale){
							selected_colorscale = colorscale;
					   		colorscale_options += '<option value="'+ colorscale + '" selected>' + colorscale + '</option>';
					   	}else{
					   		colorscale_options += '<option value="'+ colorscale + '">' + colorscale + '</option>';
					   	}
					});

					this.$("#style").unbind();

					this.$("#style").empty();
					this.$("#style").append(colorscale_options);

					this.$("#style").change(function(evt){
						var selected = $(evt.target).find("option:selected").text();
						selected_colorscale = selected;
						options[that.selected].colorscale = selected;
						that.current_model.set("parameters", options);

						if(options[that.selected].hasOwnProperty("logarithmic"))
							that.createScale(options[that.selected].logarithmic);
						else
							that.createScale();

						Communicator.mediator.trigger("layer:parameters:changed", that.current_model.get("name"));
					});

					this.$("#opacitysilder").unbind();
					this.$("#opacitysilder").val(this.current_model.attributes.opacity*100);
					this.$("#opacitysilder").on("input change", function(){
						var opacity = Number(this.value)/100;
						that.current_model.set("opacity", opacity);
						Communicator.mediator.trigger('productCollection:updateOpacity', {model:that.current_model, value:opacity});
					});

					

					if(!(typeof outlines === 'undefined')){
						var checked = "";
						if (outlines)
							checked = "checked";

						$("#outlines input").unbind();
						$("#outlines").empty();
						this.$("#outlines").append(
							'<form style="vertical-align: middle;">'+
							'<label class="valign" for="outlines" style="width: 70px;">Outlines </label>'+
							'<input class="valign" style="margin-top: -5px;" type="checkbox" name="outlines" value="outlines" ' + checked + '></input>'+
							'</form>'
						);

						this.$("#outlines input").change(function(evt){
							var outlines = !that.current_model.get("outlines");
							that.current_model.set("outlines", outlines);
							Communicator.mediator.trigger("layer:outlines:changed", that.current_model.get("views")[0].id, outlines);
						});
					}

					if(!(typeof showColorscale === 'undefined')){
						var checked = "";
						if (showColorscale)
							checked = "checked";

						$("#showColorscale input").unbind();
						$("#showColorscale").empty();
						this.$("#showColorscale").append(
							'<form style="vertical-align: middle;">'+
							'<label class="valign" for="outlines" style="width: 70px; margin">Legend </label>'+
							'<input class="valign" style="margin-top: -5px;" type="checkbox" name="outlines" value="outlines" ' + checked + '></input>'+
							'</form>'
						);

						this.$("#showColorscale input").change(function(evt){
							var showColorscale = !that.current_model.get("showColorscale");
							that.current_model.set("showColorscale", showColorscale);
							Communicator.mediator.trigger("layer:colorscale:show", that.current_model.get("download").id);
						});
					}


					if(!(typeof this.current_model.get("coefficients_range") === 'undefined')){

						this.$("#coefficients_range").empty();

						this.$("#coefficients_range").append(
						'<li style="margin-top: 5px;">'+
							'<label for="coefficients_range_min" style="width: 120px;">Coefficients range</label>'+
							'<input id="coefficients_range_min" type="text" style="width:30px;"/>'+
							'<input id="coefficients_range_max" type="text" style="width:30px; margin-left:8px"/>'+
						'</li>'+
						'<p style="font-size:0.85em; margin-left:130px;"> [-1,-1]: No range limitation</p>'
						);

						this.$("#coefficients_range_min").val(this.current_model.get("coefficients_range") [0]);
						this.$("#coefficients_range_max").val(this.current_model.get("coefficients_range") [1]);

						// Register necessary key events
						this.registerKeyEvents(this.$("#coefficients_range_min"));
						this.registerKeyEvents(this.$("#coefficients_range_max"));
						
					}	

					if (protocol == "WPS"){
						this.$("#shc").empty();
						this.$("#shc").append(
							'<p>Spherical Harmonics Coefficients</p>'+
							'<div class="myfileupload-buttonbar ">'+
						    	'<label class="btn btn-default shcbutton">'+
						        '<span><i class="fa fa-fw fa-upload"></i> Upload SHC File</span>'+
						        '<input id="upload-selection" type="file" accept=".shc" name="files[]" />'+
						      '</label>'+
						  '</div>'
						);

						this.$("#upload-selection").unbind();
						this.$("#upload-selection").change(this.onUploadSelectionChanged.bind(this));

						if(this.current_model.get('shc_name')){
							that.$("#shc").append('<p id="filename" style="font-size:.9em;">Selected File: '+this.current_model.get('shc_name')+'</p>');
						}
						
					}

					if(options[this.selected].hasOwnProperty("logarithmic"))
						this.createScale(options[that.selected].logarithmic);
					else
						this.createScale();

					this.createHeightTextbox(this.current_model.get("height"));
				}

				if(this.selected == "Fieldlines"){
					$("#coefficients_range").hide();
					$("#opacitysilder").parent().hide();
				}else{
					$("#coefficients_range").show();
					$("#opacitysilder").parent().show();
				}

			},

			onShow: function(view){

				if(this.model.get("containerproduct")){
					// Add options for three satellites
					$("#satellite_selection").off();
					$("#satellite_selection").empty();
					$("#satellite_selection").append('<label for="satellite_selec" style="width:70px;">Satellite </label>');
					$("#satellite_selection").append('<select style="margin-left:4px;" name="satellite_selec" id="satellite_selec"></select>');


					$('#satellite_selec').append('<option value="Alpha" selected>Alpha</option>');
					$('#satellite_selec').append('<option value="Bravo">Bravo</option>');
					$('#satellite_selec').append('<option value="Charlie">Charlie</option>');

					$("#satellite_selec option[value="+this.selected_satellite+"]").prop("selected", "selected");

					var model = null;
					var that = this;
					globals.products.forEach(function(p){
						if(p.get("download").id == globals.swarm.products[that.model.get("id")][that.selected_satellite]){
							model = p;
						}
					});
					this.current_model = model;

					$("#satellite_selection").on('change', function(){
						that.selected_satellite = $("#satellite_selection").find("option:selected").val();
						var model = null;
						globals.products.forEach(function(p){
							if(p.get("download").id == globals.swarm.products[that.model.get("id")][that.selected_satellite]){
								model = p;
							}
						});
						that.current_model = model;
						that.renderView();
					});

				}else{
					this.current_model = this.model;
				}
				this.renderView();
		    },

			onClose: function() {
				this.close();
			}, 

			onParameterChange: function(){
				this.onShow();
			},

			onOptionsChanged: function(){

				var options = this.current_model.get("parameters");

				if(options.hasOwnProperty(this.selected)){
					delete options[this.selected].selected;
				}

				$("#description").empty();

				this.selected = $("#options").find("option:selected").val();

				this.$("#style").empty();
				var colorscale_options = "";
				var selected_colorscale;
				_.each(this.colorscaletypes, function(colorscale){
					if(options[this.selected].colorscale == colorscale){
						selected_colorscale = colorscale;
				   		colorscale_options += '<option value="'+ colorscale + '" selected>' + colorscale + '</option>';
				   	}else{
				   		colorscale_options += '<option value="'+ colorscale + '">' + colorscale + '</option>';
				   	}
				}, this);

				this.$("#style").append(colorscale_options);


				if(options[this.selected].hasOwnProperty("logarithmic")){
					this.addLogOption(options);

				}else{
					this.$("#logarithmic").empty();
				}

				options[this.selected].selected = true;

				if(options[this.selected].description){
					this.$("#description").text(options[this.selected].description);
				}

				this.createHeightTextbox(this.current_model.get("height"));

				if(this.selected == "Fieldlines"){
					$("#coefficients_range").hide();
					$("#opacitysilder").parent().hide();
				}else{
					$("#coefficients_range").show();
					$("#opacitysilder").parent().show();
				}

				// request range for selected parameter if layer is of type model
				if(this.current_model.get("model") && this.selected != "Fieldlines"){

					var that = this;

					var sel_time = Communicator.reqres.request('get:time');
					var req = evalModelTmpl({
						url: this.current_model.get("download").url,
						model: this.current_model.get("download").id,
						variable: this.selected,
						begin_time: getISODateTimeString(sel_time.start),
						end_time: getISODateTimeString(sel_time.end),
						coeff_min: this.current_model.get("coefficients_range")[0],
						coeff_max: this.current_model.get("coefficients_range")[1],
						elevation: this.current_model.get("height")
					});

					if(this.current_model.get("views")[0].id == "shc"){

						if(this.current_model.attributes.hasOwnProperty("shc")){

							var payload = evalModelTmpl_POST({
								"model": "Custom_Model",
								"variable": this.selected,
								"begin_time": getISODateTimeString(sel_time.start),
								"end_time": getISODateTimeString(sel_time.end),
								"elevation": this.current_model.get("height"),
								"coeff_min": this.current_model.get("coefficients_range")[0],
								"coeff_max": this.current_model.get("coefficients_range")[1],
								"shc": this.current_model.get('shc'),
								"height": 24,
								"width": 24,
								"getonlyrange": true
							});

							$.post(this.current_model.get("download").url, payload)
								.success(this.handleRangeRespone.bind(this))
								.fail(this.handleRangeResponseError)
								.always(this.handleRangeChange.bind(this));
						}

					}else {

						var req = evalModelTmpl({
							url: this.current_model.get("download").url,
							model: this.current_model.get("download").id,
							variable: this.selected,
							begin_time: getISODateTimeString(sel_time.start),
							end_time: getISODateTimeString(sel_time.end),
							coeff_min: this.current_model.get("coefficients_range")[0],
							coeff_max: this.current_model.get("coefficients_range")[1],
							elevation: this.current_model.get("height")
						});

						$.get(req)
							.success(this.handleRangeRespone.bind(this))
							.fail(this.handleRangeResponseError)
							.always(this.handleRangeChange.bind(this));
					}
				}else{
					Communicator.mediator.trigger("layer:parameters:changed", this.current_model.get("name"));
				}

			},

			registerKeyEvents: function(el){
				var that = this;
				el.keypress(function(evt) {
					if(evt.keyCode == 13){ //Enter pressed
						evt.preventDefault();
						that.applyChanges();
					}else{
						that.createApplyButton();
					}
				});

				el.keyup(function(evt) {
					if(evt.keyCode == 8){ //Backspace clicked
						that.createApplyButton();
					}
				});

				// Add click event to select text when clicking or tabbing into textfield
				el.click(function () { $(this).select(); });
			},

			createApplyButton: function(){
				var that = this;
				if($("#changesbutton").length == 0){
					$("#applychanges").append('<button type="button" class="btn btn-default" id="changesbutton" style="width: 100%;"> Apply changes </button>');
					$("#changesbutton").click(function(evt){
						that.applyChanges();
					});
				}
			},

			handleRangeRespone: function(response){
				var options = this.current_model.get("parameters");
				var resp = response.split(',');
				var range = [Number(resp[1]), Number(resp[2])];
				// Make range "nicer", rounding depending on extent
				range = d3.scale.linear().domain(range).nice().domain();
				$("#range_min").val(range[0]);
				$("#range_max").val(range[1]);
				options[this.selected].range = range;
				this.current_model.set("parameters", options);
				this.createScale();
				Communicator.mediator.trigger("layer:parameters:changed", this.current_model.get("name"));
			},

			handleRangeResponseError: function(response){
				$("#error-messages").append(
					'<div class="alert alert-warning">'+
					'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+
					'Warning: There is a problem requesting the range values for the color scale, please revise and set them to adequate values if necessary.' +
					'</div>'
				);
			},

			handleRangeChange: function(){
				var options = this.current_model.get("parameters");
				$("#range_min").val(options[this.selected].range[0]);
				$("#range_max").val(options[this.selected].range[1]);

				this.current_model.set("parameters", options);
				if(options[this.selected].hasOwnProperty("logarithmic"))
					this.createScale(options[this.selected].logarithmic);
				else
					this.createScale();

				Communicator.mediator.trigger("layer:parameters:changed", this.current_model.get("name"));
			},

			applyChanges: function(){

				var options = this.current_model.get("parameters");

					//this.$("#coefficients_range_max").val(this.current_model.get("coefficients_range") [1]);

				var error = false;
				var model_change = false;

				// Check color ranges
				var range_min = parseFloat($("#range_min").val());
				error = error || this.checkValue(range_min,$("#range_min"));

				var range_max = parseFloat($("#range_max").val());
				error = error || this.checkValue(range_max,$("#range_max"));

				
				
				// Set parameters and redraw color scale
				if(!error){
					options[this.selected].range = [range_min, range_max];

					if(options[this.selected].hasOwnProperty("logarithmic"))
						this.createScale(options[this.selected].logarithmic);
					else
						this.createScale();
				}

				// Check coefficient ranges
				if ($("#coefficients_range_min").length && $("#coefficients_range_max").length){
					var coef_range_min = parseFloat($("#coefficients_range_min").val());
					error = error || this.checkValue(coef_range_min,$("#coefficients_range_min"));

					var coef_range_max = parseFloat($("#coefficients_range_max").val());
					error = error || this.checkValue(coef_range_max,$("#coefficients_range_max"));

					if(!error){
						if(this.current_model.get("coefficients_range")[0]!=coef_range_min || 
						   this.current_model.get("coefficients_range")[1]!=coef_range_max){
							model_change = true;
						}
						this.current_model.set("coefficients_range", [coef_range_min, coef_range_max]);
					}
				}

				// Check for height attribute
				if ($("#heightvalue").length){
					var height = parseFloat($("#heightvalue").val());
					error = error || this.checkValue(height,$("#heightvalue"));

					if (!error){
						if(this.current_model.get("height")!=height){
							model_change = true;
						}
						this.current_model.set("height", height);
					}
				}

				if(!error){
					// Remove button
					$("#applychanges").empty();

					// If there were changes of the model parameters recalculate the color range
					if(model_change){
						var that = this;

						var sel_time = Communicator.reqres.request('get:time');

						if(this.current_model.get("views")[0].id == "shc"){

							if(this.current_model.attributes.hasOwnProperty("shc")){

								var payload = evalModelTmpl_POST({
									"model": "Custom_Model",
									"variable": this.selected,
									"begin_time": getISODateTimeString(sel_time.start),
									"end_time": getISODateTimeString(sel_time.end),
									"elevation": this.current_model.get("height"),
									"coeff_min": this.current_model.get("coefficients_range")[0],
									"coeff_max": this.current_model.get("coefficients_range")[1],
									"shc": this.current_model.get('shc'),
									"height": 24,
									"width": 24,
									"getonlyrange": true
								});

								$.post(this.current_model.get("download").url, payload)
									.success(this.handleRangeRespone.bind(this))
									.fail(this.handleRangeResponseError);
							}

						}else {

							var req = evalModelTmpl({
								url: this.current_model.get("download").url,
								model: this.current_model.get("download").id,
								variable: this.selected,
								begin_time: getISODateTimeString(sel_time.start),
								end_time: getISODateTimeString(sel_time.end),
								coeff_min: this.current_model.get("coefficients_range")[0],
								coeff_max: this.current_model.get("coefficients_range")[1],
								elevation: this.current_model.get("height")
							});

							$.get(req)
								.success(this.handleRangeRespone.bind(this))
								.fail(this.handleRangeResponseError);
						}
						

					}else{
						//Apply changes
						this.current_model.set("parameters", options);
						Communicator.mediator.trigger("layer:parameters:changed", this.current_model.get("name"));
					}
				}
			},

			checkValue: function(value, textfield){
				if (isNaN(value)){
					textfield.addClass("text_error");
					return true;
				}else{
					textfield.removeClass("text_error");
					return false;
				}
			},

			setModel: function(model){
				this.model = model;
				/*this.model.on('change:parameters', function(model, data) {
					
				}, this);*/
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
					that.current_model.set('shc', evt.target.result);
					that.current_model.set('shc_name', filename);
					that.$("#shc").find("#filename").remove();
					that.$("#shc").append('<p id="filename" style="font-size:.9em;">Selected File: '+filename+'</p>');
					Communicator.mediator.trigger("file:shc:loaded", evt.target.result);

					var params = { name: that.current_model.get("name"), isBaseLayer: false, visible: false };
					Communicator.mediator.trigger('map:layer:change', params);
					Communicator.mediator.trigger("layer:activate", that.current_model.get("views")[0].id);


				}

				reader.readAsText(evt.target.files[0]);
	      	},

	      	addLogOption: function(options){
	      		var that = this;
	      		if(options[this.selected].hasOwnProperty("logarithmic")){
					var checked = "";
					if (options[this.selected].logarithmic)
						checked = "checked";

					this.$("#logarithmic").empty();

					this.$("#logarithmic").append(
						'<form style="vertical-align: middle;">'+
						'<label class="valign" for="outlines" style="width: 100px;">Log. Scale</label>'+
						'<input class="valign" style="margin-top: -5px;" type="checkbox" name="logarithmic" value="logarithmic" ' + checked + '></input>'+
						'</form>'
					);

					this.$("#logarithmic input").change(function(evt){
						var options = that.current_model.get("parameters");
						options[that.selected].logarithmic = !options[that.selected].logarithmic;
						
						that.current_model.set("parameters", options);
						Communicator.mediator.trigger("layer:parameters:changed", that.current_model.get("name"));

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

				var range_min = this.current_model.get("parameters")[this.selected].range[0];
				var range_max = this.current_model.get("parameters")[this.selected].range[1];
				var uom = this.current_model.get("parameters")[this.selected].uom;
				var style = this.current_model.get("parameters")[this.selected].colorscale;

				$("#setting_colorscale").append(
					'<div id="gradient" style="width:'+scalewidth+'px;margin-left:'+margin+'px"></div>'
				);
				/*'<div class="'+style+'" style="width:'+scalewidth+'px; height:20px; margin-left:'+margin+'px"></div>'*/

				this.plot.setColorScale(style);
				var base64_string = this.plot.colorScaleImage.toDataURL();
				$('#gradient').css('background-image', 'url(' + base64_string + ')');


				var svgContainer = d3.select("#setting_colorscale").append("svg")
					.attr("width", width)
					.attr("height", 40);

				var axisScale;
				
				if(logscale){
					axisScale = d3.scale.log();
				}else{
					axisScale = d3.scale.linear();
				}

				axisScale.domain([range_min, range_max]);
				axisScale.range([0, scalewidth]);

				var xAxis = d3.svg.axis()
					.scale(axisScale);

				if(logscale){
					var numberFormat = d3.format(",f");
					function logFormat(d) {
						var x = Math.log(d) / Math.log(10) + 1e-6;
						return Math.abs(x - Math.floor(x)) < .3 ? numberFormat(d) : "";
					}
					xAxis.tickFormat(logFormat);

				}else{
					var step = (range_max - range_min)/5
					xAxis.tickValues(
						d3.range(range_min,range_max+step, step)
					);
					xAxis.tickFormat(d3.format("g"));
				}

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
	      		if( (height || height==0) && this.selected != "Fieldlines"){
					this.$("#height").append(
						'<form style="vertical-align: middle;">'+
						'<label for="heightvalue" style="width: 70px;">Height</label>'+
						'<input id="heightvalue" type="text" style="width:30px; margin-left:8px"/>'+
						'</form>'
					);
					this.$("#heightvalue").val(height);
					this.$("#height").append(
						'<p style="font-size:0.85em; margin-left: 70px;">Above ellipsoid (Km)</p>'
					);

					// Register necessary key events
					this.registerKeyEvents(this.$("#heightvalue"));
				}
	      	}

		});

		return {"LayerSettings": LayerSettings};

	});

}).call( this );
