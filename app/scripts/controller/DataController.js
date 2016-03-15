(function() {
  'use strict';

  var root = this;

  root.require([
    'backbone',
    'communicator',
    'globals',
    'hbs!tmpl/wps_getdata',
    'app',
    'papaparse',
  ],

  function( Backbone, Communicator, globals, wps_getdataTmpl, App, Papa) {

    var DataController = Backbone.Marionette.Controller.extend({

      initialize: function(options){

        this.selection_list = [];
        this.activeWPSproducts = [];
        this.activeModels = [];
        this.selected_time = null;

        this.listenTo(Communicator.mediator, "map:layer:change",this.changeLayer);
        this.listenTo(Communicator.mediator, "selection:changed", this.onSelectionChanged);
        this.listenTo(Communicator.mediator, 'time:change', this.onTimeChange);

        this.listenTo(Communicator.mediator, "analytics:set:filter", this.onAnalyticsFilterChanged);

        // TODO: Check to see if already active products are configured
       
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
                this.activeModels.push(product.get("views")[0].id);
              }         
            }else{
              _.each(product.get("processes"), function(process){
                if (this.activeWPSproducts.indexOf(process.layer_id)!=-1)
                  this.activeWPSproducts.splice(this.activeWPSproducts.indexOf(process.layer_id), 1);
              },this);
            }
          }
          this.checkSelections();
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

      onAnalyticsFilterChanged: function (filters) {
        globals.swarm.set({filters: filters});
      },

      checkSelections: function(){
        if (this.selected_time == null)
          this.selected_time = Communicator.reqres.request('get:time');

        if (this.activeWPSproducts.length > 0 && this.selected_time){
          this.sendRequest();
        }else{
          globals.swarm.set({data:[]});
          //Communicator.mediator.trigger("map:clear:image");
          //$(".colorlegend").empty();
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
          if (that.activeWPSproducts.indexOf(model.get("views")[0].id)!=-1) {
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

          $.post( retrieve_data[0].url, req_data)
            .done(function( data ) {
              // Parse data here centrally so other modules do not have to do it again
              Papa.parse(data, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                  var dat = results.data; 
                  for (var i = dat.length - 1; i >= 0; i--) {
                    if(dat[i].hasOwnProperty('Timestamp')) {
                      dat[i]['Timestamp'] = new Date(dat[i]['Timestamp']);
                    }
                  }
                  globals.swarm.set({data: results.data});
                }
              });
              
          });

        }
      },

    });
    return new DataController();
  });

}).call( this );