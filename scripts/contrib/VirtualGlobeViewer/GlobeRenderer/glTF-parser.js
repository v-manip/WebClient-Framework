var global=window;!function(a,b){"object"==typeof exports?b(module.exports):"function"==typeof define&&define.amd?define([],function(){return b(a)}):b(a)}(this,function(a){"use strict";var b=["buffers","bufferViews","images","videos","samplers","textures","shaders","programs","techniques","materials","indices","attributes","meshes","cameras","lights","skins","nodes","scenes","animations"],c=Object.create(Object.prototype,{_rootDescription:{value:null,writable:!0},rootDescription:{set:function(a){this._rootDescription=a},get:function(){return this._rootDescription}},baseURL:{value:null,writable:!0},_isAbsolutePath:{value:function(a){var b=new RegExp("^"+window.location.protocol,"i");return a.match(b)?!0:!1}},resolvePathIfNeeded:{value:function(a){if(this._isAbsolutePath(a))return a;var b=a.split("/");return b.pop(),this.baseURL+a}},_resolvePathsForCategories:{value:function(a){a.forEach(function(a){var b=this.json[a];if(b){var c=Object.keys(b);c.forEach(function(a){var c=b[a];c.path=this.resolvePathIfNeeded(c.path)},this)}},this)}},_json:{value:null,writable:!0},json:{enumerable:!0,get:function(){return this._json},set:function(a){this._json!==a&&(this._json=a,this._resolvePathsForCategories(["buffers","shaders","images","videos"]))}},_path:{value:null,writable:!0},getEntryDescription:{value:function(a,b){var c=null,d=b;return c=this.rootDescription[d],c?c?c[a]:null:(console.log("ERROR:CANNOT find expected category named:"+d),null)}},_stepToNextCategory:{value:function(){return this._state.categoryIndex=this.getNextCategoryIndex(this._state.categoryIndex+1),-1!==this._state.categoryIndex?(this._state.categoryState.index=0,!0):!1}},_stepToNextDescription:{enumerable:!1,value:function(){var a=this._state.categoryState,b=a.keys;return b?(a.index++,a.keys=null,a.index>=b.length?this._stepToNextCategory():!1):(console.log("INCONSISTENCY ERROR"),!1)}},hasCategory:{value:function(a){return this.rootDescription[a]?!0:!1}},_handleState:{value:function(){for(var a={buffers:this.handleBuffer,bufferViews:this.handleBufferView,shaders:this.handleShader,programs:this.handleProgram,techniques:this.handleTechnique,materials:this.handleMaterial,meshes:this.handleMesh,cameras:this.handleCamera,lights:this.handleLight,nodes:this.handleNode,scenes:this.handleScene,images:this.handleImage,animations:this.handleAnimation,indices:this.handleIndices,attributes:this.handleAttribute,skins:this.handleSkin,samplers:this.handleSampler,textures:this.handleTexture,videos:this.handleVideo},c=!0;-1!==this._state.categoryIndex;){var d=b[this._state.categoryIndex],e=this._state.categoryState,f=e.keys;if(f||(e.keys=f=Object.keys(this.rootDescription[d]),!f||0!=f.length)){var g=d,h=f[e.index],i=this.getEntryDescription(h,g);if(i){if("undefined"==typeof i.type&&(i.type=g),a[g]&&a[g].call(this,h,i,this._state.userInfo)===!1){c=!1;break}this._stepToNextDescription()}else if(this.handleError){this.handleError("INCONSISTENCY ERROR: no description found for entry "+h),c=!1;break}}else this._stepToNextDescription()}this.handleLoadCompleted&&this.handleLoadCompleted(c,this._state.userInfo.rootObj)}},_loadJSONIfNeeded:{enumerable:!0,value:function(a){var b=this;if(this._json)a&&a(this.json);else{var c=this._path,d=c.lastIndexOf("/");this.baseURL=0!==d?c.substring(0,d+1):"";var e=new XMLHttpRequest;e.open("GET",c,!0),e.onreadystatechange=function(){4==e.readyState&&200==e.status&&(b.json=JSON.parse(e.responseText),a&&a(b.json))},e.send(null)}}},_buildLoader:{value:function(a){function b(b){c.rootDescription=b,a&&a(this)}var c=this;this._loadJSONIfNeeded(b)}},_state:{value:null,writable:!0},_getEntryType:{value:function(){for(var a=b,c=0;c<a.length;c++){var d=this.rootDescription[a[c]];if(d)return a[c]}return null}},getNextCategoryIndex:{value:function(a){for(var c=a;c<b.length;c++)if(this.hasCategory(b[c]))return c;return-1}},load:{enumerable:!0,value:function(a,b){var c=this;this._buildLoader(function(){var d=c.getNextCategoryIndex.call(c,0);-1!==d&&(c._state={userInfo:a,options:b,categoryIndex:d,categoryState:{index:"0"}},"function"==typeof b&&(c.handleLoadCompleted=b),c._handleState())})}},initWithPath:{value:function(a){return this._path=a,this._json=null,this}},_knownURLs:{writable:!0,value:{}},loaderContext:{value:function(){return"undefined"==typeof this._knownURLs[this._path]&&(this._knownURLs[this._path]=Object.keys(this._knownURLs).length),"__"+this._knownURLs[this._path]}},initWithJSON:{value:function(a,b){return this.json=a,this.baseURL=b,b||console.log("WARNING: no base URL passed to Reader:initWithJSON"),this}}});return a&&(a.glTFParser=c),c});