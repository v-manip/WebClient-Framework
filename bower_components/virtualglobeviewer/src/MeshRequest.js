/***************************************
 * Copyright 2011, 2012 GlobWeb contributors.
 *
 * This file is part of GlobWeb.
 *
 * GlobWeb is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, version 3 of the License, or
 * (at your option) any later version.
 *
 * GlobWeb is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with GlobWeb. If not, see <http://www.gnu.org/licenses/>.
 ***************************************/

define(['./Mesh'], function(Mesh) {

	/** 
	 *	@constructor
	 *	MeshRequest constructor
	 */
	var MeshRequest = function(options) {
		this.successCallback = options.successCallback;
		this.failCallback = options.failCallback;
		this.abortCallback = options.abortCallback;

		this.renderContext = options.renderContext;
		this.meshCache = options.meshCache;
	}

	/**************************************************************************************************************/

	/**
	 *	Send image request
	 */
	MeshRequest.prototype.send = function(url) {
		// Let the meshCache handle the request:
		this.meshCache.request(url, this);

		// this.image = new Image();
		// this.image.crossOrigin = '';
		// this.image.dataType = "byte";

		// var self = this;
		// this.image.onload = function(){
		// 	var isComplete = self.image.naturalWidth != 0 && self.image.complete;
		// 	if ( isComplete )
		// 	{
		// 		self.successCallback.call(self);
		// 	}
		// } 
		// this.image.onerror = this.failCallback.bind(this);
		// this.image.onabort = this.abortCallback.bind(this);
		// this.image.src = url;
	}

	/**************************************************************************************************************/

	/**
	 *	Abort image request
	 */
	MeshRequest.prototype.abort = function() {
		this.image.src = '';
	}

	/**************************************************************************************************************/

	return MeshRequest;

});