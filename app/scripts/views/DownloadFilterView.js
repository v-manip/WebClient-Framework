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
    'underscore'
  ],
  function( Backbone, Communicator, globals, m, DownloadFilterTmpl, 
            FilterTmpl, wps_requestTmpl, CoverageDownloadPostTmpl) {

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
            if (diff>15){
              date2 = new Date(date1);
              date2.setDate(date2.getDate()+15);
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
            if (diff>15){
              date1 = new Date(date2);
              date1.setDate(date1.getDate()-15);
              that.start_picker.datepicker("setDate", date1);
            }else if(diff<0){
              that.end_picker.datepicker("setDate", date1);
            }
          }
        });
        this.end_picker.datepicker("setDate", timeinterval.end);

        products = this.model.get("products");
        // Separate models and Swarm products and add lists to ui
        _.each(products, function(prod){
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
        options.collection_ids = this.swarm_prod.map(function(m){return m.get("views")[0].id;}).join(",");

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
          filters.push(fe.id+":"+ extent.join(","));
        });

        options.filters = filters.join(";");

        // TODO: Just getting last URL here think of how different urls should be handled
        var url = this.swarm_prod.map(function(m){return m.get("views")[0].urls[0];})[0];

        var xml = wps_requestTmpl(options);
        
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
