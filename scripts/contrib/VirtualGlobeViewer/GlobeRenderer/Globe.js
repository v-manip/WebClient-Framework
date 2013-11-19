define(["virtualglobeviewer/GlobWeb","openlayers"],function(a){"use strict";function b(b){return this.canvas=$(b.canvas),this.canvas?(this.globe=new a.Globe({canvas:b.canvas,lighting:!1,tileErrorTreshold:3,continuousRendering:!1,backgroundColor:[0,0,0,0],shadersPath:"../bower_components/virtualglobeviewer/shaders/"}),this.aoiLayer=void 0,this.navigation=new a.Navigation(this.globe,{inertia:!0}),void 0):(alert("[Globe::constructor] Please define a canvas element!. Aborting Globe construction..."),void 0)}var c=function(a,b){for(var c=a.getVertices(),d=[],e=0;e<c.length;++e){var f=[];f.push(c[e].x),f.push(c[e].y),f.push(b),d.push(f)}var f=[];return f.push(c[0].x),f.push(c[0].y),f.push(b),d.push(f),d};return b.prototype.addAreaOfInterest=function(b){if(this.aoiLayer||(this.aoiLayer=new a.VectorLayer({style:d,opacity:1}),this.globe.addLayer(this.aoiLayer)),b){var d=new a.FeatureStyle({fillColor:[1,.5,.1,.5],strokeColor:[1,.5,.1,1],extrude:!0,fill:!0}),e=3e4,f=c(b,e),g={geometry:{type:"Polygon",coordinates:f},properties:{style:d}};this.aoiLayer.addFeature(g)}},b.prototype.selectProduct=function(b,c){if("WMTS"===b.get("view").protocol)var d=new a.WMTSLayer({baseUrl:b.get("view").urls[0],style:b.get("view").style,layer:b.get("view").id,format:b.get("view").format,matrixSet:b.get("view").matrixSet});else if("WMS"===b.get("view").protocol)var d=new a.WMSLayer({baseUrl:b.get("view").urls[0],layers:b.get("view").id});c?this.globe.setBaseImagery(d):this.globe.addLayer(d)},b.prototype.updateViewport=function(){this.globe.renderContext.canvas.width=this.canvas.width(),this.globe.renderContext.canvas.height=this.canvas.height(),this.globe.renderContext.updateViewDependentProperties(),this.globe.refresh()},b.prototype.zoomTo=function(a){this.navigation.zoomTo(a.center,a.distance,a.duration,a.tilt)},b});