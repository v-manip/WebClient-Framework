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
 
define(['./Utils', './SceneGraphOverlayLayer', './GeoTiling'], 
	function(Utils, SceneGraphOverlayLayer, GeoTiling) {

/**************************************************************************************************************/


/** @export
	@constructor
	W3DSLayer constructor
 */
var W3DSLayer = function( options )
{
	SceneGraphOverlayLayer.prototype.constructor.call( this, options );
	
	this.baseUrl = options['baseUrl'];
	this.tilePixelSize = options['tilePixelSize'] || 256;
	this.tiling = new GeoTiling( 4, 2 );
	this.numberOfLevels = options['numberOfLevels'] || 21;
	this.startLevel = options['startLevel'] || 1;
	
	// Build the base GetTile URL
	var url = this.baseUrl;
	if ( url.indexOf('?',0) == -1 )
	{
		url += '?service=W3DS';
	}
	else
	{
		url += 'service=W3DS';
	}
	url += "&request=GetTile";
	url += "&version="
	// FIXXME: should be 0.4.0. At the moment the W3DS server requires version 1.0.0
	url += options['version'] || '0.4.0';
	// url += options['version'] || '1.0.0';
	url += "&crs=";
	url += options.hasOwnProperty('crs') ? options['crs'] : 'EPSG:4326';	
	url += "&layer=" + options['layer'];
	if ( options['style'] )
	{
		url += "&style=" + options.style;
	}	
	url += "&format=";
	url += options['format'] || 'image/png';
	if ( options['time'] )
	{
		url += "&time=" + options.time;
	}
	
	this.getTileBaseUrl = url;
}

/**************************************************************************************************************/

Utils.inherits(SceneGraphOverlayLayer,W3DSLayer);

/**************************************************************************************************************/

/**
	Get an url for the given tile
 */
W3DSLayer.prototype.getUrl = function(tile)
{
	var url = this.getTileBaseUrl;
	url += "&tileLevel=";
	url += tile.level + this.startLevel;
	url += "&tilecol=" + tile.x;
	url += "&tilerow=" + tile.y;

	return url;
}

/**************************************************************************************************************/

return W3DSLayer;

});

