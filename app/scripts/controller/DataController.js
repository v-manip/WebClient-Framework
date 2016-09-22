(function() {
  'use strict';

  var root = this;

  root.require([
    'backbone',
    'communicator',
    'globals',
    'hbs!tmpl/wps_getdata',
    'hbs!tmpl/wps_fetchData',
    'app',
    'papaparse',
  ],

  function( Backbone, Communicator, globals, wps_getdataTmpl, wps_fetchDataTmpl, App, Papa) {

    var DataController = Backbone.Marionette.Controller.extend({

      initialize: function(options){

        this.selection_list = [];
        this.activeWPSproducts = [];
        this.activeModels = [];
        this.selected_time = null;

        this.listenTo(Communicator.mediator, "map:layer:change",this.changeLayer);
        this.listenTo(Communicator.mediator, "map:multilayer:change",this.multiChangeLayer);
        this.listenTo(Communicator.mediator, "selection:changed", this.onSelectionChanged);
        this.listenTo(Communicator.mediator, 'time:change', this.onTimeChange);

        this.listenTo(Communicator.mediator, "analytics:set:filter", this.onAnalyticsFilterChanged);

        // TODO: Check to see if already active products are configured
       
      },

      checkModelValidity: function(){
        // Added some checks here to see if model is outside validity
        $(".validitywarning").remove();
        var invalid_models = [];

        if(this.activeModels.length>0){
          var that = this;
          for (var i = this.activeModels.length - 1; i >= 0; i--) {
            var model = globals.products.find(function(model) { return model.get('download').id == that.activeModels[i]; });
            if(model.get("validity")){
              var val = model.get("validity");
              var start = new Date(val.start);
              var end = new Date(val.end);
              if(this.selected_time && (this.selected_time.start < start || this.selected_time.end > end)){
                invalid_models.push({
                  model: model.get('download').id,
                  start: start,
                  end: end
                });
              }
            }
          }
        }

        if(invalid_models.length>0){
          var invalid_models_string = '';
          for (var i = invalid_models.length - 1; i >= 0; i--) {
            invalid_models_string += invalid_models[i].model+':' + start + ' - ' + end + '<br>';
          }

          $("#error-messages").append(
              '<div class="alert alert-warning validitywarning">'+
                '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>'+
                '<strong>Warning!</strong> The current time selection is outside the validity of the model, '+
                'data is displayed for the last valid date, please take this into consideration when analysing the data.<br>'+
                invalid_models_string+
                'Tip: You can see the validity of the model in the time slider.'+
              '</div>'
            );
        }
      },

      updateLayerResidualParameters: function () {
        // Manage additional residual parameter for Swarm layers
        globals.products.each(function(product) {

          if(product.get("satellite")=="Swarm"){

            // Get Layer parameters
            var pars = product.get("parameters");

            var selected = null;

            // Remove already added model residuals
            var keys = _.keys(pars);
            for (var i = keys.length - 1; i >= 0; i--) {
              if(pars[keys[i]].residuals){
                if(pars[keys[i]].selected){
                  selected = keys[i];
                }
                delete pars[keys[i]];
              }
            }

            for (var i = this.activeModels.length - 1; i >= 0; i--) {
              
              pars[this.activeModels[i]] = {
                  "range": [-10, 40],
                  "uom":"nT",
                  "colorscale": "jet",
                  "name": ("Residuals to "+this.activeModels[i]),
                  "residuals": true
              };
              if(this.activeModels[i] == selected){
                pars[this.activeModels[i]].selected = true;
              }

              product.set({"parameters": pars});
            }
          }
        }, this);
        // Make sure any possible opened settings are updated
        Communicator.mediator.trigger("layer:settings:changed");
      },


      changeLayer: function(options) {
        if (!options.isBaseLayer){
          var product = globals.products.find(function(model) { return model.get('name') == options.name; });
          if (product){
            if(options.visible){
              if (product.get("model")){
                this.activeModels.push(product.get("download").id);
                this.updateLayerResidualParameters();
                this.checkSelections();
              }
            }else{
              if (this.activeModels.indexOf(product.get("download").id)!=-1){
                this.activeModels.splice(this.activeModels.indexOf(product.get("download").id), 1);
                this.updateLayerResidualParameters();
                this.checkSelections();
              }
            }
          }
        }

        this.checkModelValidity();
      },
      

      multiChangeLayer: function(layers) {
        this.activeWPSproducts = [];
        for (var i = layers.length - 1; i >= 0; i--) {
          var product = globals.products.find(function(model) { return model.get('download').id == layers[i]; });
          if (product){
              if (product.get("processes")){
                _.each(product.get("processes"), function(process){
                  this.activeWPSproducts.push(process.layer_id);
                },this);
              } 
          }
        }
        this.checkSelections();
        this.checkModelValidity();
      },

      onSelectionChanged: function(bbox) {
        
        if(bbox){
          this.selection_list.push(bbox);
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
        this.checkModelValidity();
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

          var options = {
            "collections_ids": JSON.stringify(collections),
            "begin_time": getISODateTimeString(this.selected_time.start),
            "end_time": getISODateTimeString(this.selected_time.end)
          };

          options.variables = [
            "F", "F_error", "B_VFM", "B_error", "B_NEC", "n", "T_elec", "U_SC",
            "v_SC", "Bubble_Probability", "Dst", "QDLat", "QDLon", "MLT",
            "B_NEC_res_IGRF12","B_NEC_res_SIFM","B_NEC_res_CHAOS-5-Combined",
            "B_NEC_res_Custom_Model", "F_res_IGRF12","F_res_SIFM",
            "F_res_CHAOS-5-Combined", "F_res_Custom_Model"
          ].join(",");

          if(this.selection_list.length > 0){
            var bb = this.selection_list[0];
            options["bbox"] = bb.s + "," + bb.w + "," + bb.n + "," + bb.e;
          }
                
          var shc_model = _.find(globals.products.models, function(p){return p.get("shc") != null;});

          if(shc_model){
            options["shc"] = shc_model.get("shc");
          }

          if(this.activeModels.length > 0)
            options["model_ids"] = this.activeModels.join();

          var req_data = wps_fetchDataTmpl(options);

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
                      dat[i]['Timestamp'] = new Date(dat[i]['Timestamp']*1000);
                    }
                    if(dat[i].hasOwnProperty('B_NEC')) {
                      var bnec = dat[i]['B_NEC'];
                      bnec = bnec.slice(1,-1).split(';').map(Number);
                      delete dat[i]['B_NEC'];
                      dat[i]['B_N'] = bnec[0];
                      dat[i]['B_E'] = bnec[1];
                      dat[i]['B_C'] = bnec[2];
                    }
                    if(dat[i].hasOwnProperty('B_error')) {
                      var bnec = dat[i]['B_error'];
                      bnec = bnec.slice(1,-1).split(';').map(Number);
                      delete dat[i]['B_error'];
                      dat[i]['B_error,X'] = bnec[0];
                      dat[i]['B_error,Y'] = bnec[1];
                      dat[i]['B_error,Z'] = bnec[2];
                    }
                    if(dat[i].hasOwnProperty('B_VFM')) {
                      var bnec = dat[i]['B_VFM'];
                      bnec = bnec.slice(1,-1).split(';').map(Number);
                      delete dat[i]['B_VFM'];
                      dat[i]['B_VFM,X'] = bnec[0];
                      dat[i]['B_VFM,Y'] = bnec[1];
                      dat[i]['B_VFM,Z'] = bnec[2];
                    }
                    if(dat[i].hasOwnProperty('v_SC')) {
                      var bnec = dat[i]['v_SC'];
                      bnec = bnec.slice(1,-1).split(';').map(Number);
                      delete dat[i]['v_SC'];
                      dat[i]['v_SC_N'] = bnec[0];
                      dat[i]['v_SC_E'] = bnec[1];
                      dat[i]['v_SC_C'] = bnec[2];
                    }
                    
                    $.each(dat[i], function(key, value){
                      if (key.indexOf("B_NEC_res")>-1){
                        var res_model = key.substring(6);
                        var bnec = dat[i][key];
                        bnec = bnec.slice(1,-1).split(';').map(Number);
                        delete dat[i][key];
                        dat[i]['B_N_'+res_model] = bnec[0];
                        dat[i]['B_E_'+res_model] = bnec[1];
                        dat[i]['B_C_'+res_model] = bnec[2];
                      }
                    });
                    
                    

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
