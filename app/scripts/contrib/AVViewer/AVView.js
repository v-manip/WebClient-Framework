define(['backbone.marionette',
    'communicator',
    'app',
    'models/AVModel',
    'globals',
    'd3',
    'graphly',
    'analytics'
], function(Marionette, Communicator, App, AVModel, globals) {
    'use strict';
    var AVView = Marionette.View.extend({
        model: new AVModel.AVModel(),
        className: 'analytics',
        initialize: function() {
            this.isClosed = true;
            this.requestUrl = '';
            this.plotType = 'scatter';
            this.sp = undefined;

            $(window).resize(function() {
                if(this.graph){
                    this.graph.resize();
                }
            }.bind(this));

            this.connectDataEvents();
        },

        onShow: function() {
            var that = this;
            this.stopListening(Communicator.mediator, 'change:axis:parameters', this.onChangeAxisParameters);
            this.listenTo(Communicator.mediator, 'change:axis:parameters', this.onChangeAxisParameters);

            this.isClosed = false;
            this.selectionList = [];
            this.plotdata = [];
            this.requestUrl = '';
            this.img = null;
            this.overlay = null;
            this.activeWPSproducts = [];
            this.plotType = 'scatter';
            this.prevParams = null;
            this.fieldsforfiltering = [];


            $('#saveRendering').off();
            $('#saveRendering').remove();
            this.$el.append('<div type="button" class="btn btn-success darkbutton" id="saveRendering"><i class="fa fa-floppy-o" aria-hidden="true"></i></div>');

           if (typeof this.graph === 'undefined') {
                this.$el.append('<div class="d3canvas"></div>');
                this.$('.d3canvas').append('<div id="graph"></div>');
                this.$('.d3canvas').append('<div id="filterDivContainer"></div>');
                this.$('#filterDivContainer').append('<div id="filters"></div>');
                this.$el.append('<div id="nodataavailable"></div>');
                $('#nodataavailable').text('No data available for current selection');
                
            }else if(this.graph){
                this.graph.resize();
            }

            $('#saveRendering').click(function(){
                that.graph.saveImage();
            });


            this.$('#filterDivContainer').append('<div id="filterSelectDrop"></div>');
            //$('#filterSelectDrop').append('<select id="filterSelect" multiple></select>');

            //$('#filterSelect').SumoSelect({ okCancelInMulti: true });

            /*var y_select = d3.select(this.scatterEl)
                .insert("div")
                .attr("id", "yselectiondropdown")
                .attr("style", "position: absolute;"+
                    "margin-left:"+(this.margin.left)+
                    "px; margin-top:"+(this.margin.top-40)+"px;")
                .append("select")
                    .attr("multiple", "multiple");

        y_select.selectAll("option")
            .data(this.headerNames)
            .enter()
            .append("option")
            .text(function (d) { 
                if(self.sel_y.indexOf(d) != -1)
                    d3.select(this).attr("selected","selected");

                // Renaming of keys introducing subscript
                var newkey = "";
                var parts = d.split("_");
                if (parts.length>1){
                    newkey = parts[0];
                    for (var i=1; i<parts.length; i++){
                        newkey+=(" "+parts[i]).sub();
                    }
                }else{
                    newkey = d;
                }

                d3.select(this).attr("value", d)
                return newkey; 
            });

        $(y_select).SumoSelect({ okCancelInMulti: true });*/


        /*$(".SumoSelect").change(function(evt){
            var objs = [];
            $('#yselectiondropdown option:selected').each(function(i) {
                objs.push($(this).val());
            });

            self.sel_y = objs;
            self.yAxisSelectionChanged(self.sel_y);
            self.render();
            self.parallelsPlot();
        
        });*/

            this.reloadUOM();


            var swarmdata = globals.swarm.get('data');

            var filterList = localStorage.getItem('selectedFilterList');
            if(filterList !== null){
                filterList = JSON.parse(filterList);
                this.selectedFilterList = filterList;
            } else {
                this.selectedFilterList = ['F','B_N', 'B_E', 'B_C', 'Dst', 'QDLat','MLT'];
            }


            this.filterManager = new FilterManager({
                el:'#filters',
                filterSettings: {
                    visibleFilters: this.selectedFilterList,
                    dataSettings: globals.swarm.get('uom_set'),
                    parameterMatrix:{}
                },
                showCloseButtons: true
            });


            var identifiers = [];
            for (var key in globals.swarm.satellites) {
                if(globals.swarm.satellites[key]){
                    identifiers.push(key);
                }
            }

            this.renderSettings = {
                xAxis:  'Latitude',
                yAxis: ['F'],
                colorAxis: [null],
                dataIdentifier: {
                    parameter: 'id',
                    identifiers: identifiers
                }
            };

            this.graph = new graphly.graphly({
                el: '#graph',
                dataSettings: globals.swarm.get('uom_set'),
                renderSettings: this.renderSettings,
                filterManager: this.filterManager
            });

            if(localStorage.getItem('filterSelection') !== null){
                var filters = JSON.parse(localStorage.getItem('filterSelection'));
                this.filterManager.brushes = filters;
                this.graph.filters = globals.swarm.get('filters');
                this.filterManager.filters = globals.swarm.get('filters');
            }

            if(localStorage.getItem('xAxisSelection') !== null){
                this.graph.renderSettings.xAxis =JSON.parse(localStorage.getItem('xAxisSelection'));
            }
            if(localStorage.getItem('yAxisSelection') !== null){
                this.graph.renderSettings.yAxis = JSON.parse(localStorage.getItem('yAxisSelection'));
                var nllArray = [];
                for (var i = this.graph.renderSettings.yAxis.length - 1; i >= 0; i--) {
                    nllArray.push(null);
                }
                this.graph.renderSettings.colorAxis = nllArray;
            }

            this.graph.on('axisChange', function(){
                localStorage.setItem(
                    'xAxisSelection',
                    JSON.stringify(this.renderSettings.xAxis)
                );
                localStorage.setItem(
                    'yAxisSelection',
                    JSON.stringify(this.renderSettings.yAxis)
                );
            });


            /*var args = {
                scatterEl: '#scatterdiv',
                histoEl: '#parallelsdiv',
                selection_x: 'Latitude',
                selection_y: ['F'],
                margin: {top: 10, right: 67, bottom: 10, left: 60},
                histoMargin: {top: 55, right: 70, bottom: 25, left: 100},
                shorten_width: 125,
                toIgnoreHistogram: ['Latitude', 'Longitude', 'Radius'],
                fieldsforfiltering: ['F','B_N', 'B_E', 'B_C', 'Dst', 'QDLat','MLT'],
                single_color: true,
                file_save_string: 'VirES_Services_plot_rendering'
            };

            args.filterListChanged = function(param){
              localStorage.setItem('selectedFilterList', JSON.stringify(param));
            };
            args.xAxisSelectionChanged = function(param){
              localStorage.setItem('xAxisSelection', JSON.stringify(param));
            };
            args.yAxisSelectionChanged = function(param){
              localStorage.setItem('xAxisSelection', JSON.stringify(param));
            };
            args.filtersViewChanged = function(param){
              localStorage.setItem('filterViewHidden', JSON.stringify(param));
            };
            args.gridSettingChanged = function(param){
              localStorage.setItem('gridVisible', JSON.stringify(param));
            };

            if(localStorage.getItem('filterViewHidden') !== null){
                args.filters_hidden = JSON.parse(
                    localStorage.getItem('filterViewHidden')
                );
                if(args.filters_hidden){
                    $('#scatterdiv').css('height', '95%');
                    $('#parallelsdiv').css('height', '40px');
                }
            }
            if(localStorage.getItem('gridVisible') !== null){
                args.grid = JSON.parse(localStorage.getItem('gridVisible'));
            }

            var filterList = localStorage.getItem('selectedFilterList');
            if(filterList !== null){
                filterList = JSON.parse(filterList);
                args.fieldsforfiltering = filterList;
            }
            if(localStorage.getItem('prevParams') !== null){
                this.prevParams = JSON.parse(
                    localStorage.getItem('prevParams')
                );
            }*/

            /*if (this.sp === undefined){
                this.sp = new scatterPlot(
                    args, function(){},
                    function (values) {
                        if (values !== null){
                            Communicator.mediator.trigger(
                                'cesium:highlight:point',
                                [values.Latitude, values.Longitude, values.Radius]
                            );
                        }else{
                            Communicator.mediator.trigger('cesium:highlight:removeAll');
                        }
                    }, 
                    function(filter){
                        Communicator.mediator.trigger('analytics:set:filter', filter);
                    }
                );

                 // If filters from previous session load them
                if(localStorage.getItem('filterSelection') !== null){
                    var filters = JSON.parse(localStorage.getItem('filterSelection'));
                    Communicator.mediator.trigger('analytics:set:filter', filters);
                    _.map(filters, function(value, key){
                        that.sp.active_brushes.push(key);
                        that.sp.brush_extents[key] = value;
                    });
                }

                // If filters from previous session load them
                if(localStorage.getItem('xAxisSelection') !== null){
                    that.sp.sel_x = JSON.parse(localStorage.getItem('xAxisSelection'));
                }
                // If filters from previous session load them
                if(localStorage.getItem('yAxisSelection') !== null){
                    that.sp.sel_y = JSON.parse(localStorage.getItem('yAxisSelection'));
                }

            }*/

            //$('#scatterdiv').append('<div id="nodatainfo">No data available for your current selection</div>');

            this.filterManager.on('filterChange', function(filters){
                localStorage.setItem('filterSelection', JSON.stringify(this.brushes));
                Communicator.mediator.trigger('analytics:set:filter', filters);

            });

            this.filterManager.on('removeFilter', function(filter){
                var index = that.selectedFilterList.indexOf(filter);
                if(index !== -1){
                    that.selectedFilterList.splice(index, 1);
                    // Check if filter was set
                    if (that.graph.filterManager.filters.hasOwnProperty(filter)){
                        delete that.graph.filterManager.filters[filter];
                        delete that.graph.filterManager.brushes[filter];
                    }
                    that.graph.filterManager._filtersChanged();
                    localStorage.setItem(
                        'selectedFilterList',
                        JSON.stringify(that.selectedFilterList)
                    );
                }
            });

            if(swarmdata && swarmdata.length>0){
                args.parsedData = swarmdata;
                that.sp.loadData(args);
            }
            return this;
        }, //onShow end

        connectDataEvents: function(){
            globals.swarm.on('change:data', this.reloadData.bind(this));
        },

        separateVector: function(key, previousKey, vectorChars, separator){
            if (this.sp.uom_set.hasOwnProperty(previousKey)){
                _.each(vectorChars, function(k){
                    this.sp.uom_set[key+separator+k] = 
                        $.extend({}, this.sp.uom_set[previousKey]);
                    this.sp.uom_set[key+separator+k].name = 
                        'Component of '+this.sp.uom_set[previousKey].name;
                }, this);
            }
            if (this.activeParameters.hasOwnProperty(previousKey)){
                _.each(vectorChars, function(k){
                    this.activeParameters[key+separator+k] = 
                        $.extend({}, this.activeParameters[previousKey]);
                    this.activeParameters[key+separator+k].name = 
                        'Component of '+this.activeParameters[previousKey].name;
                }, this);
                delete this.activeParameters[previousKey];
            }

        },

        createSubscript: function createSubscript(string){
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

        reloadUOM: function(){
            // Prepare to create list of available parameters
            var availableParameters = {};
            var activeParameters = {};
            this.sp = {
                uom_set: {}
            };
            globals.products.each(function(prod) {
                if(prod.get('download_parameters')){
                    var par = prod.get('download_parameters');
                    var newKeys = _.keys(par);
                    _.each(newKeys, function(key){
                        availableParameters[key] = par[key];
                        if(prod.get('visible')){
                            activeParameters[key] = par[key];
                        }
                    });
                    
                }
            });
            this.sp.uom_set = availableParameters;
            this.activeParameters = activeParameters;

            // Remove uom of time
            if(this.sp.uom_set.hasOwnProperty('Timestamp')){
                this.sp.uom_set['Timestamp'].uom = null;
                this.sp.uom_set['Timestamp'].scaleFormat = 'time';
            }else{
                this.sp.uom_set['Timestamp'] = {scaleFormat: 'time'};
            }
            // Remove uom of time
            if(this.sp.uom_set.hasOwnProperty('timestamp')){
                this.sp.uom_set['timestamp'].uom = null;
                this.sp.uom_set['timestamp'].scaleFormat = 'time';
            } else {
                this.sp.uom_set['timestamp'] = {scaleFormat: 'time'};
            }

            // Special cases for separeted vectors
            this.separateVector('B_error', 'B_error', ['X', 'Y', 'Z'], ',');
            this.separateVector('B', 'B_NEC', ['N', 'E', 'C'], '_');
            this.separateVector('B', 'B_NEC', ['N', 'E', 'C'], '_');
            this.separateVector('v_SC', 'v_SC', ['N', 'E', 'C'], '_');
            this.separateVector('B_VFM', 'B_VFM', ['X', 'Y', 'Z'], ',');
            this.separateVector('B', 'B_NEC_resAC',
                ['resAC_N', 'resAC_E', 'resAC_C'], '_'
            );
            this.separateVector('B', 'B_NEC_res_SIFM',
                ['N_res_SIFM', 'E_res_SIFM', 'C_res_SIFM'], '_'
            );
            this.separateVector('B', 'B_NEC_res_CHAOS-6-Combined',
                ['N_res_CHAOS-6-Combined',
                'E_res_CHAOS-6-Combined',
                'C_res_CHAOS-6-Combined'], '_'
            );
            this.separateVector('B', 'B_NEC_res_Custom_Model',
                ['N_res_Custom_Model',
                'E_res_Custom_Model',
                'C_res_Custom_Model'], '_'
            );
            this.sp.uom_set['MLT'] = {uom: null, name:'Magnetic Local Time'};
            this.sp.uom_set['QDLat'] = {uom: 'deg', name:'Quasi-Dipole Latitude'};
            this.sp.uom_set['QDLon'] = {uom: 'deg', name:'Quasi-Dipole Longitude'};
            this.sp.uom_set['Dst'] = {uom: null, name:'Disturbance storm time Index'};
            this.sp.uom_set['Kp'] = {uom: null, name:'Global geomagnetic storm Index'};

            globals.swarm.set('uom_set', this.sp.uom_set);
        },

        handleItemSelected: function handleItemSelected(evt){
            var selected = $('#addfilter').val();
            if(selected !== ''){
                this.selectedFilterList.push(selected);
                var setts = this.graph.filterManager.filterSettings;
                setts.visibleFilters = this.selectedFilterList;
                this.graph.filterManager.updateFilterSettings(setts);
                localStorage.setItem(
                    'selectedFilterList',
                    JSON.stringify(this.selectedFilterList)
                );
                this.renderFilterList();
            }
        },

        renderFilterList: function() {

            this.$el.find("#filterSelectDrop").empty();
            var filCon = this.$el.find("#filterSelectDrop");
            filCon.find('.w2ui-field').remove();

            var aUOM = {};
            // Clone object
            _.each(globals.swarm.get('uom_set'), function(obj, key){
                aUOM[key] = obj;
            });

            // Remove currently visible filters from list
            for (var i = 0; i < this.selectedFilterList.length; i++) {
              if(aUOM.hasOwnProperty(this.selectedFilterList[i])){
                delete aUOM[this.selectedFilterList[i]];
              }
            }

            // Show only filters for currently available data
            for (var key in aUOM) {
              if(this.currentKeys.indexOf(key) === -1){
                delete aUOM[key];
              }
            }


            // Remove unwanted parameters
            if(aUOM.hasOwnProperty('Timestamp')){delete aUOM.Timestamp;}
            if(aUOM.hasOwnProperty('timestamp')){delete aUOM.timestamp;}
            if(aUOM.hasOwnProperty('q_NEC_CRF')){delete aUOM.q_NEC_CRF;}
            if(aUOM.hasOwnProperty('GPS_Position')){delete aUOM.GPS_Position;}
            if(aUOM.hasOwnProperty('LEO_Position')){delete aUOM.LEO_Position;}
            if(aUOM.hasOwnProperty('Spacecraft')){delete aUOM.Spacecraft;}
            if(aUOM.hasOwnProperty('id')){delete aUOM.id;}

            $('#filterSelectDrop').append(
              '<div class="w2ui-field"> <input type="list" id="addfilter"> <button id="downloadAddFilter" type="button" class="btn btn-default dropdown-toggle">Add filter <span class="caret"></span></button> </div>'
            );

            $( "#downloadAddFilter" ).click(function(){
                $('.w2ui-field-helper input').css('text-indent', '0em');
                $("#addfilter").focus();
            });

            var that = this;
            $('#addfilter').off();

            $('#addfilter').w2field('list', { 
              items: _.keys(aUOM).sort(),
              renderDrop: function (item, options) {
                var html = '<b>'+that.createSubscript(item.id)+'</b>';
                if(aUOM[item.id].uom != null){
                  html += ' ['+aUOM[item.id].uom+']';
                }
                if(aUOM[item.id].name != null){
                  html+= ': '+aUOM[item.id].name;
                }
                return html;
              },
              compare: function(item){
                var userIn = $('.w2ui-field-helper input').val();
                //console.log(item, $('.w2ui-field-helper input').val());
                if (userIn.length === 0){
                    return true;
                } else {
                    userIn = userIn.toLowerCase();
                    var par = aUOM[item.id];
                    var inputInId = item.id.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
                        .includes(userIn.replace(/[^a-zA-Z0-9]/g, ''));
                    var inputInUOM = par.hasOwnProperty('uom') && 
                        par.uom !== null && 
                        par.uom.toLowerCase().includes(userIn);
                    var inputInName = par.hasOwnProperty('name') && 
                        par.name !== null && 
                        par.name.toLowerCase().includes(userIn);
                    if(inputInId || inputInUOM || inputInName){
                        return true;
                    } else {
                        return false;
                    }
                }
                
              }
            });

            $('.w2ui-field-helper input').attr('placeholder', 'Type to search');

            $('#addfilter').change(this.handleItemSelected.bind(this));

        },

        reloadData: function(model, data) {
            // If element already has plot rendering
            if( $(this.el).html()){
                var idKeys = Object.keys(data);
                this.currentKeys = idKeys;
                if(idKeys.length > 0){
                    $('#nodataavailable').hide();

                    var identifiers = [];
                    for (var key in globals.swarm.satellites) {
                        if(globals.swarm.satellites[key]){
                            identifiers.push(key);
                        }
                    }

                    this.graph.renderSettings.dataIdentifier = {
                        parameter: 'id',
                        identifiers: identifiers
                    };

                    //this.graph.renderSettings = this.renderSettings[idKeys[0]];
                    if(data[idKeys[0]].length < 4000){
                        this.graph.debounceActive = false;
                    }else{
                        this.graph.debounceActive = true;
                    }



                    if(this.prevParams === null){
                        // First time loading data we set previous to current data
                        this.prevParams = idKeys;
                    }



                    // If data parameters have changed
                    if (!_.isEqual(this.prevParams, idKeys)){
                        // Define which parameters should be selected defaultwise as filtering
                        var filterstouse = [
                            'n', 'T_elec', 'Bubble_Probability',
                            'Relative_STEC_RMS', 'Relative_STEC', 'Absolute_STEC',
                            'IRC', 'FAC',
                            'EEF'
                        ];

                        filterstouse = filterstouse.concat(['MLT']);
                        var residuals = _.filter(idKeys, function(item) {
                            return item.indexOf('_res_') !== -1;
                        });
                        // If new datasets contains residuals add those instead of normal components
                        if(residuals.length > 0){
                            filterstouse = filterstouse.concat(residuals);
                        }else{
                            if(filterstouse.indexOf('F') === -1){
                              filterstouse.push('F');
                            }
                            if(filterstouse.indexOf('F_error') === -1){
                                filterstouse.push('F_error');
                            }
                        }

                        for (var i = filterstouse.length - 1; i >= 0; i--) {
                            if(this.selectedFilterList.indexOf(filterstouse[i]) === -1){
                                this.selectedFilterList.push(filterstouse[i]);
                            }
                        }
                        var setts = this.graph.filterManager.filterSettings;
                        setts.visibleFilters = this.selectedFilterList;
                        this.graph.filterManager.updateFilterSettings(setts);
                        localStorage.setItem(
                            'selectedFilterList',
                            JSON.stringify(this.selectedFilterList)
                        );
                        this.renderFilterList();
                        //localStorage.setItem('selectedFilterList', JSON.stringify(filterstouse));

                        // Check if we want to change the y-selection
                        // If previous does not contain key data and new one
                        // does we add key parameter to selection in plot
                        var parasToCheck = [
                            'n', 'F', 'Bubble_Probability', 'Absolute_STEC', 'FAC', 'EEF'
                        ];


                        for (var i = this.graph.renderSettings.yAxis.length - 1; i >= 0; i--) {
                            if(idKeys.indexOf(this.graph.renderSettings.yAxis[i]) === -1){
                                this.graph.renderSettings.yAxis.splice(i, 1);
                                this.graph.renderSettings.colorAxis.splice(i, 1);
                            }
                        }

                        // Check if new data parameter has been added and is not
                        // part of previous parameters
                        for (var i = 0; i < parasToCheck.length; i++) {
                            if(idKeys.indexOf(parasToCheck[i]) !== -1 && 
                                this.prevParams.indexOf(parasToCheck[i])=== -1 ){
                                // New parameter is available and is not selected in 
                                // y Axis yet
                                if(this.graph.renderSettings.yAxis.indexOf(parasToCheck[i]) === -1){
                                    // If second y axis is free we can use it to render
                                    // newly added parameter

                                    /*if(this.graph.renderSettings.y2Axis.length === 0){
                                        // TODO: For now we add it to yAxis, when y2 axis working correctly
                                        // we will need to add it to y2 axis
                                        this.graph.renderSettings.y2Axis.push(parasToCheck[i]);
                                        this.graph.renderSettings.colorAxis.push(null);
                                    } else {
                                        // TODO: Decide based on extent where the parameter
                                        // fits best
                                    }*/
                                    this.graph.renderSettings.yAxis.push(parasToCheck[i]);
                                    this.graph.renderSettings.colorAxis.push(null);
                                    
                                }
                                
                            }
                        }

                        localStorage.setItem(
                            'yAxisSelection', 
                            JSON.stringify(this.graph.renderSettings.yAxis)
                        );

                        // Check if x selection still available in new parameters
                        if(idKeys.indexOf(this.graph.renderSettings.xAxis) === -1){
                            if(idKeys.indexOf('Latitude') !== -1){
                                this.graph.renderSettings.xAxis = 'Latitude';
                            } else if (idKeys.indexOf('latitude') !== -1){
                                this.graph.renderSettings.xAxis = 'latitude';
                            }
                            localStorage.setItem(
                                'xAxisSelection',
                                JSON.stringify(this.graph.renderSettings.xAxis))
                        }


                        localStorage.setItem('yAxisSelection', JSON.stringify(this.graph.renderSettings.yAxis));
                        localStorage.setItem('xAxisSelection', JSON.stringify(this.graph.renderSettings.xAxis));
                    } else {// End of IF to see if data parameters have changed
                        for (var i = this.graph.renderSettings.yAxis.length - 1; i >= 0; i--) {
                            // Check if there is some issue with the previously loaded params
                            if(idKeys.indexOf(this.graph.renderSettings.yAxis[i]) === -1){
                                this.graph.renderSettings.yAxis.splice(i, 1);
                                this.graph.renderSettings.colorAxis.splice(i, 1);
                            }
                        }
                        localStorage.setItem(
                            'yAxisSelection', 
                            JSON.stringify(this.graph.renderSettings.yAxis)
                        );

                        // Check if current brushes are valid for current data
                        for (var fKey in this.graph.filterManager.brushes){
                            if(idKeys.indexOf(fKey) === -1){
                                delete this.graph.filterManager.brushes[fKey];
                            }
                        }

                        for(var filKey in this.graph.filters){
                            if(idKeys.indexOf(filKey) === -1){
                                delete this.graph.filters[fKey];
                            }
                        }

                    }


                    this.prevParams = idKeys;
                    localStorage.setItem('prevParams', JSON.stringify(this.prevParams));

                    this.$('#filterSelectDrop').remove();
                    this.$('#filterDivContainer').append('<div id="filterSelectDrop"></div>');
                    



                    




                    this.graph.loadData(data);
                    this.filterManager.loadData(data);
                    this.renderFilterList();
                }


                /*$('#tmp_download_button').unbind( 'click' );
                $('#tmp_download_button').remove();

                if(data.length > 0){

                    // TODO: Hack to handle how analyticsviewer re-renders button, need to update analaytics viewer
                    d3.select(this.el).append('button')
                        .attr('type', 'button')
                        .attr('id', 'tmp_download_button')
                        .attr('class', 'btn btn-success')
                        .attr('style', 'position: absolute; right: 55px; top: 7px; z-index: 1000;')
                        .text('Download');

                    $('#tmp_download_button').click(function(){
                        Communicator.mediator.trigger('dialog:open:download:filter', true);
                    });

                    // If data parameters have changed
                    if (!_.isEqual(this.prevParams, _.keys(data[0]))){
                        // Define which parameters should be selected defaultwise as filtering
                        var filterstouse = this.sp.fieldsforfiltering.concat([
                            'n', 'T_elec', 'Bubble_Probability',
                            'Relative_STEC_RMS', 'Relative_STEC', 'Absolute_STEC',
                            'IRC', 'FAC',
                            'EEF'
                        ]);

                        filterstouse = filterstouse.concat(['MLT']);
                        var residuals = _.filter(_.keys(data[0]), function(item) {
                            return item.indexOf('_res_') !== -1;
                        });
                        // If new datasets contains residuals add those instead of normal components
                        if(residuals.length > 0){
                            filterstouse = filterstouse.concat(residuals);
                        }else{
                            if(filterstouse.indexOf('F') === -1){
                              filterstouse.push('F');
                            }
                            if(filterstouse.indexOf('F_error') === -1){
                                filterstouse.push('F_error');
                            }
                        }

                        this.sp.fieldsforfiltering = filterstouse;
                        localStorage.setItem('selectedFilterList', JSON.stringify(filterstouse));

                        // Check if we want to change the y-selection
                        // If previous does not contain key data and new one
                        // does we add key parameter to selection in plot
                        var parasToCheck = [
                            'n', 'F', 'n', 'Absolute_STEC', 'FAC', 'EEF'
                        ];

                        _.each(parasToCheck, function(p){
                            this.checkPrevious(
                                p, this.prevParams.indexOf(p), _.keys(data[0]).indexOf(p)
                            );
                        }, this);

                        // If previous does not contain a residual a new one does
                        // we switch the selection to residual value
                        var resIndex = residuals.indexOf(
                            _.find(_.keys(data[0]), function(item) {
                                return item.indexOf('F_res') !== -1;
                            })
                        );
                        if(resIndex !== -1){
                            var resPar = residuals[resIndex];
                            this.checkPrevious(
                                resPar, this.prevParams.indexOf(resPar),
                                _.keys(data[0]).indexOf(resPar),
                                true
                            );
                        }

                        localStorage.setItem('yAxisSelection', JSON.stringify(this.sp.sel_y));
                        localStorage.setItem('xAxisSelection', JSON.stringify(this.sp.sel_x));
                    } // End of IF to see if data parameters have changed


                    this.prevParams = _.keys(data[0]);
                    localStorage.setItem('prevParams', JSON.stringify(this.prevParams));

                    // Check for special case of only EEF selected
                    var onlyEEF = true;

                    globals.swarm.filtered_collection.each(function(layer){
                      if(layer.get('containerproduct')){
                        if(layer.get('id') !== 'EEF' && layer.get('visible')){
                          onlyEEF = false;
                        }
                      }
                    });

                    if(this.$('.d3canvas').length === 1){
                        $('#scatterdiv').empty();
                        $('#parallelsdiv').empty();
                        var args = {
                            selector: this.$('.d3canvas')[0],
                            parsedData: data
                        };
                        if(onlyEEF){
                            this.sp.toIgnore = ['id','active', 'Radius'];
                        }else{
                            this.sp.toIgnore = ['id','active', 'Spacecraft'];
                        }
                        this.sp.loadData(args);
                    }
                }else{ // Else for if data is greater 0
                    $('#scatterdiv').empty();
                    $('#parallelsdiv').empty();
                    $('#scatterdiv').append('<div id="nodatainfo">No data available for your current selection</div>');
                }*/
            }
        },

        onChangeAxisParameters: function (selection) {
            this.sp.sel_y=selection;
            this.sp.render();
        },

        close: function() {
            this.isClosed = true;
            this.$el.empty();
            this.triggerMethod('view:disconnect');
        }
    });
    return AVView;
});