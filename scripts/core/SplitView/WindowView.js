define(["backbone.marionette","hbs!tmpl/Window","communicator"],function(a,b,c){"use strict";var d=a.Layout.extend({className:"windowview",template:{type:"handlebars",template:b},regions:{viewport:".viewport"},events:{"click .mapview-btn":function(){var a={window:this,viewer:"MapViewer"};c.mediator.trigger("window:view:change",a)},"click .globeview-btn":function(){var a={window:this,viewer:"VirtualGlobeViewer"};c.mediator.trigger("window:view:change",a)},"click .boxview-btn":function(){},"click .analyticsview-btn":function(){}},initialize:function(){},showView:function(a){this.viewport.show(a)}});return d});