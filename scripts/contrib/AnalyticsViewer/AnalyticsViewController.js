define(["backbone.marionette","app","communicator","./AnalyticsView"],function(a,b,c,d){"use strict";var e=Backbone.Marionette.Controller.extend({initialize:function(a){this.id=a.id,this.analyticsView=new d({}),this.connectToView()},getView:function(){return this.analyticsView},connectToView:function(){this.listenTo(c.mediator,"map:layer:change",_.bind(this.analyticsView.changeLayer,this.analyticsView)),this.listenTo(c.mediator,"productCollection:sortUpdated",_.bind(this.analyticsView.onSortProducts,this.analyticsView)),this.listenTo(c.mediator,"selection:changed",_.bind(this.analyticsView.onSelectionChanged,this.analyticsView)),this.listenTo(c.mediator,"time:change",_.bind(this.analyticsView.onTimeChange,this.analyticsView))},isActive:function(){return!this.analyticsView.isClosed}});return e});