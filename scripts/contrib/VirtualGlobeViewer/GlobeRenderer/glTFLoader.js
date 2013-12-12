define(["virtualglobeviewer/SceneGraph/SceneGraph","./helpers/resource-manager","./glTF-parser","./helpers/glMatrix"],function(a,b,c){function d(a){switch(a){case 5123:return"UNSIGNED_SHORT";case 5126:return"FLOAT";case 35664:return"FLOAT_VEC2";case 35665:return"FLOAT_VEC3";case 35666:return"FLOAT_VEC4";case 35675:return"FLOAT_MAT3";case 35676:return"FLOAT_MAT4";case 35678:return"SAMPLER_2D"}}function e(a){switch(a){case"FLOAT":case"UNSIGNED_BYTE":case"UNSIGNED_SHORT":return 1;case"FLOAT_VEC2":return 2;case"FLOAT_VEC3":return 3;case"FLOAT_VEC4":return 4;default:return null}}function f(a){this.totalAttributes=0,this.loadedAttributes=0,this.geometry=a}var g=function(a,b,c){this.entryID=a,this.object=b,this.description=c},h=function(){this._entries={},this.binaryManager=Object.create(b),this.binaryManager.init(this),this.binaryManager.maxConcurrentRequests=4,this.binaryManager.bytesLimit=1048576};h.prototype.setEntry=function(a,b,c){return a?(this._entries[a]&&console.warn("entry["+a+"] is being overwritten"),this._entries[a]=new g(a,b,c),void 0):(console.error("No EntryID provided, cannot store",c),void 0)},h.prototype.getEntry=function(a){return this._entries[a]},h.prototype.clearEntries=function(){this._entries={}},f.prototype.setMesh=function(a){this.geometry.mesh=a},f.prototype.setMaterial=function(a){this.geometry.material=a},f.prototype.checkFinished=function(){var a=this.geometry.mesh;return a.indexArray&&a.vertexArray&&this.totalAttributes===this.loadedAttributes?(a.isLoaded=!0,!0):!1},f.prototype.setIndexArray=function(a){var b=this.geometry.mesh;for(b.indexArray=a,b.indices=[],i=0,l=a.length;l>i;i+=1)b.indices.push(a[i]);b.numElements=3},f.prototype.setVertexArray=function(a){var b=this.geometry.mesh;for(b.vertexArray=a,b.vertices=[],i=0,l=a.length;l>i;++i)b.vertices.push(a[i])},f.prototype.setNormalArray=function(a){var b=this.geometry.mesh;b.normalArray=a},f.prototype.setTexCoordArray=function(a){var b=this.geometry.mesh;b.texCoordArray=a};var j=function(){};j.prototype.handleError=function(a,b){console.log("ERROR(IndicesDelegate):"+a+":"+b)},j.prototype.convert=function(a,b){return new Uint16Array(a,0,b.indices.count)},j.prototype.resourceAvailable=function(a,b){var c=b.geoLoaderProxy;return c.setIndexArray(a,!0),c.checkFinished(),!0};var k=new j,m=function(a,b){this.indices=a,this.geoLoaderProxy=b},n=function(){};n.prototype.handleError=function(a,b){console.log("ERROR(VertexAttributeDelegate):"+a+":"+b)},n.prototype.convert=function(a){return a},n.prototype.resourceAvailable=function(a,b){var c,f=b.geoLoaderProxy,g=b.attribute,h=b.semantic,i=d(g.type);if(!i)throw Error();var j=0;return"POSITION"==h?(c=new Float32Array(a,j,g.count*e(i)),f.setVertexArray(c)):"NORMAL"==h?(c=new Float32Array(a,j,g.count*e(i)),f.setNormalArray(c)):("TEXCOORD_0"==h||"TEXCOORD"==h)&&(c=new Float32Array(a,j,g.count*e(i)),f.setTexCoordArray(c)),f.loadedAttributes++,f.checkFinished(),!0};var o=new n,p=function(a,b,c){this.attribute=a,this.semantic=b,this.geoLoaderProxy=c},q=Object.create(c,{load:{enumerable:!0,value:function(a,b){return this.globWebResources=new h,c.load.call(this,a,b),c.handleLoadCompleted=b,a.rootObj}},globWebResources:{value:null,writable:!0},handleBuffer:{value:function(a,b){return this.globWebResources.setEntry(a,null,b),b.type="ArrayBuffer",!0}},handleBufferView:{value:function(a,b){this.globWebResources.setEntry(a,null,b);var c=this.globWebResources.getEntry(b.buffer);b.type="ArrayBufferView";var d=this.globWebResources.getEntry(a);return d.buffer=c,!0}},handleShader:{value:function(){return!0}},handleTechnique:{value:function(){return!0}},handleImage:{value:function(a,b){return this.globWebResources.setEntry(a,null,b),!0}},handleTexture:{value:function(a,b){return this.globWebResources.setEntry(a,null,b),!0}},handleMaterial:{value:function(b,c){var d=null;if(!c.instanceTechnique)return console.log("No instanceTechnique for material: "+b),void 0;var e=c.instanceTechnique,f=e.values.diffuse;if("string"==typeof f){var g=this.globWebResources.getEntry(f);if(g){var h=g.description.source,i=this.globWebResources.getEntry(h);d=i.description.path}}var j=d?null:e.values.diffuse;e.values.transparency?e.values.transparency.value:1;var k=new a.Material;return j&&(k.diffuse=j),d&&(k.texture=new a.Texture(d,!1)),this.globWebResources.setEntry(b,k,c),!0}},handleIndices:{value:function(a,b){return this.globWebResources.setEntry(a,null,b),!0}},handleAttribute:{value:function(a,b){return this.globWebResources.setEntry(a,null,b),!0}},handleLight:{value:function(){return!0}},handleMesh:{value:function(b,c){var d=new a.Geometry;this.globWebResources.setEntry(b,d,c);var e=new f(d),g=c.primitives;if(!g)return console.log("MISSING_PRIMITIVES for mesh:"+b),!1;for(var h=0;h<g.length;h++){var i=g[h];if(4===i.primitive){var j=new a.Mesh,l=this.globWebResources.getEntry(i.material);d.mesh=j,d.material=l.object;var n=i.indices,q=this.globWebResources.getEntry(n);q=q.description,q.id=n;var r=new m(q,e);this.globWebResources.binaryManager.getResource(q,k,r);var s=Object.keys(i.attributes);s.forEach(function(a){e.totalAttributes++;var b=i.attributes[a];attributeEntry=this.globWebResources.getEntry(b).description,attributeEntry.id=b;var c=new p(attributeEntry,a,e);this.globWebResources.binaryManager.getResource(attributeEntry,o,c)},this)}}return!0}},handleCamera:{value:function(){return!0}},handleNode:{value:function(b,c){var d=new a.Node;d.name=c.name,this.globWebResources.setEntry(b,d,c);var e=c.matrix;e&&(d.matrix=mat4.create([e[0],e[4],e[8],e[12],e[1],e[5],e[9],e[13],e[2],e[6],e[10],e[14],e[3],e[7],e[11],e[15]]));var f;return c.mesh&&(f=this.globWebResources.getEntry(c.mesh),d.geometries.push(f.object)),c.meshes&&c.meshes.forEach(function(a){f=this.globWebResources.getEntry(a),d.geometries.push(f.object)},this),!0}},buildNodeHierachy:{value:function(a,b){var c=this.globWebResources.getEntry(a),d=c.object;b.children.push(d);var e=c.description.children;return e&&e.forEach(function(a){this.buildNodeHierachy(a,d)},this),d}},handleScene:{value:function(a,b,c){return b.nodes?(b.nodes.forEach(function(a){this.buildNodeHierachy(a,c.rootObj)},this),!0):(console.log("ERROR: invalid file required nodes property is missing from scene"),!1)}}});return q});