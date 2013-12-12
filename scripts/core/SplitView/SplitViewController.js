define(["backbone.marionette","app","communicator","./SplitView","./WindowView"],function(a,b,c,d,e){"use strict";var f=a.Controller.extend({initialize:function(){this.view=new d,this.connectToView(),this.windowViews={tl:new e,tr:new e,bl:new e,br:new e},this.view.registerViews(this.windowViews)},getView:function(){return this.view},registerViews:function(a){this.view.registerViews(a)},connectToView:function(){this.listenTo(c.mediator,"layout:switch:singleview",this.setSinglescreen),this.listenTo(c.mediator,"layout:switch:splitview",this.setSplitscreen),this.listenTo(c.mediator,"layout:switch:quadview",this.setQuadscreen),this.listenTo(c.mediator,"window:view:change",this.onChangeView)},showViewInRegion:function(){},setSinglescreen:function(){this.view.showViewInRegion("tl","view1"),this.view.setFullscreen("view1"),this.windowViews.tl.showView(b.module("MapViewer").createController().getView())},setSplitscreen:function(){this.view.showViewInRegion("tl","view1"),this.view.showViewInRegion("tr","view2"),this.view.setSplitscreen(),this.windowViews.tl.showView(b.module("MapViewer").createController().getView()),this.windowViews.tr.showView(b.module("VirtualGlobeViewer").createController().getView())},setQuadscreen:function(){this.view.showViewInRegion("tl","view1"),this.view.showViewInRegion("tr","view2"),this.view.showViewInRegion("bl","view3"),this.view.showViewInRegion("br","view4"),this.view.setQuadscreen(),this.windowViews.tl.showView(b.module("MapViewer").createController().getView()),this.windowViews.tr.showView(b.module("VirtualGlobeViewer").createController().getView()),this.windowViews.br.showView(b.module("AnalyticsViewer").createController().getView()),this.windowViews.bl.showView(b.module("SliceViewer").createController().getView())},onChangeView:function(a){_.each(this.windowViews,function(c){c===a.window&&c.showView(b.module(a.viewer).createController().getView())},this)}});return f});