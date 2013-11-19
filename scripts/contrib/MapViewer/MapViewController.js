define(["backbone.marionette","app","communicator","./MapView"],function(a,b,c,d){"use strict";var e=Backbone.Marionette.Controller.extend({initialize:function(a){this.id=a.id,this.startPosition=a.startPosition,this.tileManager=new OpenLayers.TileManager,this.mapView=new d({startPosition:a.startPosition,tileManager:this.tileManager}),this.connectToView()},getView:function(){return this.mapView},centerAndZoom:function(a,b,c){this.mapView.centerMap({x:a,y:b,l:c})},connectToView:function(){this.listenTo(c.mediator,"map:center",_.bind(this.mapView.centerMap,this.mapView)),this.listenTo(c.mediator,"map:layer:change",_.bind(this.mapView.changeLayer,this.mapView)),this.listenTo(c.mediator,"productCollection:sortUpdated",_.bind(this.mapView.onSortProducts,this.mapView)),this.listenTo(c.mediator,"productCollection:updateOpacity",_.bind(this.mapView.onUpdateOpacity,this.mapView)),this.listenTo(c.mediator,"selection:activated",_.bind(this.mapView.onSelectionActivated,this.mapView)),this.listenTo(c.mediator,"map:load:geojson",_.bind(this.mapView.onLoadGeoJSON,this.mapView)),this.listenTo(c.mediator,"map:export:geojson",_.bind(this.mapView.onExportGeoJSON,this.mapView)),this.listenTo(c.mediator,"time:change",_.bind(this.mapView.onTimeChange,this.mapView)),c.reqres.setHandler("get:selection:json",_.bind(this.mapView.onGetGeoJSON,this.mapView)),this.mapView.listenTo(this.mapView.model,"change",function(a){c.mediator.trigger("map:center",{x:a.get("center")[0],y:a.get("center")[1],l:a.get("zoom")})})},getStartPosition:function(){return this.startPosition},isActive:function(){return!this.mapView.isClosed}});return e});