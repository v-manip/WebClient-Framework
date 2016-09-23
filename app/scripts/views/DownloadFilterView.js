(function() {
  'use strict';


  var root = this;
  root.define([
    'backbone',
    'communicator',
    'globals',
    'models/DownloadModel',
    'hbs!tmpl/DownloadFilter',
    'hbs!tmpl/FilterTemplate',
    'hbs!tmpl/wps_retrieve_data_filtered',
    'hbs!tmpl/CoverageDownloadPost',
    'hbs!tmpl/wps_fetchFilteredData',
    'underscore',
    'w2ui'
  ],
  function( Backbone, Communicator, globals, m, DownloadFilterTmpl,
            FilterTmpl, wps_requestTmpl, CoverageDownloadPostTmpl, wps_fetchFilteredData ) {

    var DownloadFilterView = Backbone.Marionette.ItemView.extend({
      tagName: "div",
      id: "modal-start-download",
      className: "panel panel-default download",
      template: {
          type: 'handlebars',
          template: DownloadFilterTmpl
      },

      initialize: function(options) {

        this.coverages = new Backbone.Collection([]);
        this.start_picker = null;
        this.end_picker = null;
        this.models = [];
        this.swarm_prod = [];
        this.loadcounter = 0;

      },
      onShow: function(view){

        this.listenTo(this.coverages, "reset", this.onCoveragesReset);
        this.$('.close').on("click", _.bind(this.onClose, this));
        this.$el.draggable({ 
          containment: "#content",
          scroll: false,
          handle: '.panel-heading'
        });

        this.$('#btn-start-download').on("click", _.bind(this.onStartDownloadClicked, this));

        var options = {};

        // Check for filters
        var filters = this.model.get("filter");

        var aoi = this.model.get("AoI");
        if (aoi){
          if (typeof filters === 'undefined') {
            filters = {};
          }
          filters["Longitude"] = [aoi.w, aoi.e];
          filters["Latitude"] = [aoi.s, aoi.n];
        }

        if (!$.isEmptyObject(filters)){
          this.renderFilterList(filters);
        }


        this.$('.delete-filter').click(function(evt){
          this.parentElement.parentElement.remove();
        });

        // Check for products and models
        var products;
        this.models = [];
        this.swarm_prod = [];

        // Initialise datepickers
        $.datepicker.setDefaults({
          showOn: "both",
          dateFormat: "dd.mm.yy"
        });

        var that = this;

        var timeinterval = this.model.get("ToI");

        this.start_picker = this.$('#starttime').datepicker({
          onSelect: function() {
            var date1 = that.start_picker.datepicker( "getDate" );
            var date2 = that.end_picker.datepicker( "getDate" );
            var diff = Math.floor((date2 - date1) / (1000*60*60*24));
            if (diff>30){
              date2 = new Date(date1);
              date2.setDate(date2.getDate()+30);
              that.end_picker.datepicker("setDate", date2);
            }else if(diff<0){
              that.start_picker.datepicker("setDate", date2);
            }
          }
        });
        this.start_picker.datepicker("setDate", timeinterval.start);

        this.end_picker = this.$('#endtime').datepicker({
          onSelect: function() {
            var date1 = that.start_picker.datepicker( "getDate" );
            var date2 = that.end_picker.datepicker( "getDate" );
            var diff = Math.floor((date2 - date1) / (1000*60*60*24));
            if (diff>30){
              date1 = new Date(date2);
              date1.setDate(date1.getDate()-30);
              that.start_picker.datepicker("setDate", date1);
            }else if(diff<0){
              that.end_picker.datepicker("setDate", date1);
            }
          }
        });
        this.end_picker.datepicker("setDate", timeinterval.end);

        // Prepare to create list of available parameters
        var available_parameters = [];

        products = this.model.get("products");
        // Separate models and Swarm products and add lists to ui
        _.each(products, function(prod){

            if(prod.get("download_parameters")){
              var par = prod.get("download_parameters");
              var new_keys = _.keys(par);
              _.each(new_keys, function(key){
                if(!_.find(available_parameters, function(item){
                  return item.id == key;
                })){
                  available_parameters.push({
                    id: key,
                    uom: par[key].uom,
                    description: par[key].name,
                  });
                }
              });

            }

            if(prod.get("processes")){
              var result = $.grep(prod.get("processes"), function(e){ return e.id == "retrieve_data"; });
              if (result)
                this.swarm_prod.push(prod);
            }

            if(prod.get("model"))
              this.models.push(prod);

        },this);

        var prod_div = this.$el.find("#products");
        prod_div.append('<div>Products:</div>');

        prod_div.append('<ul style="padding-left:15px">');
        var ul = prod_div.find("ul");
        _.each(this.swarm_prod, function(prod){
          ul.append('<li style="list-style-type: circle; padding-left:-6px;list-style-position: initial;">'+prod.get("name")+'</li>');
        }, this);

        
        if (this.models.length>0){
          var mod_div = this.$el.find("#model");
          mod_div.append('<div>Models:</div>');
          mod_div.append('<ul style="padding-left:15px">');
          ul = mod_div.find("ul");
          _.each(this.models, function(prod){
            ul.append('<li style="list-style-type: circle; padding-left:-6px;list-style-position: initial;">'+prod.get("name")+'</li>');
          }, this);
        }

        this.$el.find("#custom_parameter_cb").off();
        this.$el.find("#custom_download").empty();
        this.$el.find("#custom_download").html(
          '<div class="w2ui-field">'+
              '<div class="checkbox" style="margin-left:20px;"><label><input type="checkbox" value="" id="custom_parameter_cb">Custom download parameters</label></div>'+
              '<div style="margin-left:0px;"> <input id="param_enum" style="width:100%;"> </div>'+
          '</div>'
        );

        var selected = [];
        // Check if latitude available
        if(_.find(available_parameters, function(item){return item.id == "Latitude";})){
          selected.push({id: "Latitude"});
        }
        //Check if Longitude available
        if(_.find(available_parameters, function(item){return item.id == "Longitude";})){
          selected.push({id: "Longitude"});
        }
        //Check if timestamp available
        if(_.find(available_parameters, function(item){return item.id == "Timestamp";})){
          selected.push({id: "Timestamp"});
        }
        //Check if radius available
        if(_.find(available_parameters, function(item){return item.id == "Radius";})){
          selected.push({id: "Radius"});
        }

        $('#param_enum').w2field('enum', { 
            items: _.sortBy(available_parameters, 'id'), // Sort parameters alphabetically 
            openOnFocus: true,
            selected: selected,
            renderItem: function (item, index, remove) {
                var html = remove + that.createSubscript(item.id);
                return html;
            },
            renderDrop: function (item, options) {
              $("#w2ui-overlay").addClass("downloadsection");

              var html = '<b>'+that.createSubscript(item.id)+'</b>';
              if(item.uom != null){
                html += ' ('+item.uom+')';
              }
              if(item.description){
                html+= ': '+item.description;
              }
              //'<i class="fa fa-info-circle" aria-hidden="true" data-placement="right" style="margin-left:4px;" title="'+item.description+'"></i>';
              
              return html;
            }
        });
        $('#param_enum').prop('disabled', true);
        $('#param_enum').w2field().refresh();

        this.$el.find("#custom_parameter_cb").click(function(evt){
          if ($('#custom_parameter_cb').is(':checked')) {
            $('#param_enum').prop('disabled', false);
            $('#param_enum').w2field().refresh();
          }else{
            $('#param_enum').prop('disabled', true);
            $('#param_enum').w2field().refresh();
          }
        });

      },

      createSubscript: function(string){
        // Adding subscript elements to string which contain underscores
        var newkey = "";
        var parts = string.split("_");
        if (parts.length>1){
          newkey = parts[0];
          for (var i=1; i<parts.length; i++){
            newkey+=(" "+parts[i]).sub();
          }
        }else{
          newkey = string;
        }
        return newkey;
      },

      renderFilterList: function(filters) {
        var fil_div = this.$el.find("#filters");
        fil_div.empty();
        fil_div.append("<div>Filters</div>");

        _.each(_.keys(filters), function(key){

          var extent = filters[key].map(this.round);
          var name = "";
          var parts = key.split("_");
          if (parts.length>1){
            name = parts[0];
            for (var i=1; i<parts.length; i++){
              name+=(" "+parts[i]).sub();
            }
          }else{
            name = key;
          }

          var $html = $(FilterTmpl({
              id: key,
              name: name,
              extent: extent
            })
          );
          fil_div.append($html);
        }, this);

      },

      round: function(val){
        return val.toFixed(2);
      },


      onStartDownloadClicked: function() {
        var $downloads = $("#div-downloads");
        var options = {};

        // format
        options.format = this.$("#select-output-format").val();

        // time
        options.begin_time = this.start_picker.datepicker( "getDate" );
        options.begin_time = new Date(Date.UTC(options.begin_time.getFullYear(), options.begin_time.getMonth(),
        options.begin_time.getDate(), options.begin_time.getHours(), 
        options.begin_time.getMinutes(), options.begin_time.getSeconds()));
        options.begin_time.setUTCHours(0,0,0,0);
        options.begin_time = getISODateTimeString(options.begin_time);

        options.end_time = this.end_picker.datepicker( "getDate" );
        options.end_time = new Date(Date.UTC(options.end_time.getFullYear(), options.end_time.getMonth(),
        options.end_time.getDate(), options.end_time.getHours(), 
        options.end_time.getMinutes(), options.end_time.getSeconds()));
        options.end_time.setUTCHours(23,59,59,999);
        options.end_time = getISODateTimeString(options.end_time);

        // products
        //options.collection_ids = this.swarm_prod.map(function(m){return m.get("views")[0].id;}).join(",");
        var retrieve_data = [];

        globals.products.each(function(model) {
          if (_.find(this.swarm_prod, function(p){ return model.get("views")[0].id == p.get("views")[0].id})) {
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

          var collections = {};
          for (var i = retrieve_data.length - 1; i >= 0; i--) {
            var sat = false;
            var product_keys = _.keys(globals.swarm.products);
            for (var j = product_keys.length - 1; j >= 0; j--) {
              var sat_keys = _.keys(globals.swarm.products[product_keys[j]]);
              for (var k = sat_keys.length - 1; k >= 0; k--) {
                if (globals.swarm.products[product_keys[j]][sat_keys[k]] == retrieve_data[i].layer){
                  sat = sat_keys[k];
                }
              }
            }
            if(sat){
              if(collections.hasOwnProperty(sat)){
                collections[sat].push(retrieve_data[i].layer);
              }else{
                collections[sat] = [retrieve_data[i].layer];
              }
            }
           
          }

          var collection_keys = _.keys(collections);
          for (var i = collection_keys.length - 1; i >= 0; i--) {
            collections[collection_keys[i]] = collections[collection_keys[i]].reverse();
          }

          options["collections_ids"] = JSON.stringify(collections);
        }


        // models
        options.model_ids = this.models.map(function(m){return m.get("download").id;}).join(",");

        // custom model (SHC)
        var shc_model = _.find(globals.products.models, function(p){return p.get("shc") != null;});
        if(shc_model){
          options.shc = shc_model.get("shc");
        }


        // filters
        var filters = [];
        var filter_elem = this.$el.find(".input-group");

        _.each(filter_elem, function(fe){
          var extent_elem = $(fe).find("textarea");
          var extent = [];
          for (var i = extent_elem.length - 1; i >= 0; i--) {
            extent[i] = parseFloat(extent_elem[i].value);
          };
          // Make sure smaller value is first item
          extent.sort(function (a, b) { return a-b; });

          // Check to see if filter is on a vector component
          var original = false;
          var index = -1;
          _.each(VECTOR_BREAKDOWN, function(v, key){
            for (var i = 0; i < v.length; i++) {
              if(v[i] === fe.id){
                index = i;
                original = key;
              }
            }
            
          });

          if (original) {
            filters.push(original+"["+index+"]:"+ extent.join(","));
          }else{
            filters.push(fe.id+":"+ extent.join(","));
          }
        });

        options.filters = filters.join(";");

        // Custom variables
        if ($('#custom_parameter_cb').is(':checked')) {
          var variables = $('#param_enum').data('selected');
          variables = variables.map(function(item) {return item.id;});
          variables = variables.join(',');
          options.variables = variables;
        }

        // TODO: Just getting last URL here think of how different urls should be handled
        var url = this.swarm_prod.map(function(m){return m.get("views")[0].urls[0];})[0];

        //var xml = wps_requestTmpl(options);
        var xml = wps_fetchFilteredData(options);
        
        var $form = $(CoverageDownloadPostTmpl({
              url: url, xml: xml
            }));

        $downloads.append($form);

        var that = this;

        function formsubmit(){
          $form.submit();
          return false;
        }

        formsubmit();

      },

      onClose: function() {
        Communicator.mediator.trigger("ui:close", "download");
        this.close();
      }

    });
    return {'DownloadFilterView':DownloadFilterView};
  });
}).call( this );
