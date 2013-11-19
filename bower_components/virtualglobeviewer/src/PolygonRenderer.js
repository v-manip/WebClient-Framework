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
 
define( ['./CoordinateSystem','./VectorRendererManager','./FeatureStyle','./Program','./Triangulator'], 
	function(CoordinateSystem,VectorRendererManager,FeatureStyle,Program,Triangulator) {

/**************************************************************************************************************/

/** @constructor
 *	Basic renderer for polygon
 */

var PolygonRenderer = function(tileManager)
{
	this.renderContext = tileManager.renderContext;
	
	this.renderables = [];
		
	this.vertexShader = "\
	attribute vec3 vertex;\n\
	uniform mat4 mvp;\n\
	void main(void) \n\
	{\n\
		gl_Position = mvp * vec4(vertex, 1.0);\n\
	}\n\
	";

	var fragmentShader = "\
	precision lowp float; \n\
	uniform vec4 u_color;\n\
	void main(void)\n\
	{\n\
		gl_FragColor = u_color;\n\
	}\n\
	";
	
	this.program = new Program(this.renderContext);
	this.program.createFromSource(this.vertexShader, fragmentShader);
}

/**************************************************************************************************************/

/**
 * Subdivide given coordinates and scale them to the earth's surface.
 */
PolygonRenderer.prototype.subdividePolygon = function(coords, subdiv_steps) {
	var curved_coords = [];

	for (var i = 0; i < coords.length-1; i++) {
		var p0_cart = CoordinateSystem.fromGeoTo3D(coords[i]);
		var p1_cart = CoordinateSystem.fromGeoTo3D(coords[i+1]);

		var v0 = vec3.createFrom(p0_cart[0], p0_cart[1], p0_cart[2]);
		var v1 = vec3.createFrom(p1_cart[0], p1_cart[1], p1_cart[2]);

		var dist = vec3.dist(v1, v0);
		var delta = dist/subdiv_steps;	

		var center = vec3.create(0,0,0);
		for (var idx = 0; idx < subdiv_steps-1; idx++) {	
			var dir = vec3.create();
			vec3.subtract(v1, v0, dir);
			vec3.normalize(dir, dir);

			vec3.scale(dir, delta*idx, dir);
			
			var np = vec3.create();
			vec3.add(v0, dir, np);
			vec3.normalize(np, np);		

			var tmp = [np[0], np[1], np[2]];
			var res = CoordinateSystem.from3DToGeo(tmp);
			curved_coords.push([res[0], res[1], coords[i][2]]);
		}
	}

	// A bit hacky way to ensure that the last calculated vertex is the same
	// as the given one (necessary due to rounding errors).
	// FIXXME: the order of incoming coords does seem to change. This has to
	// be taken into account here!
	//curved_coords.push(coords[0]);

	return curved_coords;
};

/**
 *	Add polygon to renderer
 */
PolygonRenderer.prototype.addGeometry = function(geometry, layer, style){
	
	var gl = this.renderContext.gl;
	
	// Create renderable
	var renderable = {
		geometry : geometry,
		style : style,
		layer: layer,
		matrix: mat4.create(),
		vertexBuffer : gl.createBuffer(),
		indexBuffer : gl.createBuffer(),
	};
		
	// Create vertex buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
	
	// FIXXME: derive subdivision steps from distance
	var coords = this.subdividePolygon(geometry['coordinates'], 30);

	var vertices = new Float32Array( style.extrude ? coords.length * 6 : coords.length * 3 );
	
	var origin = vec3.create();
	CoordinateSystem.fromGeoTo3D(coords[0], origin);
	
	// For polygons only
	for ( var i=0; i < coords.length; i++)
	{
		var pos3d = [];
		CoordinateSystem.fromGeoTo3D(coords[i], pos3d);
		vertices[i*3] = pos3d[0] - origin[0];
		vertices[i*3+1] = pos3d[1] - origin[1];
		vertices[i*3+2] = pos3d[2] - origin[2];
	}
	
	if ( style.extrude )
	{
		var offset = coords.length * 3;
		for ( var i=0; i < coords.length; i++)
		{
			var pos3d = [];
			var coordAtZero = [ coords[i][0], coords[i][1], 0.0 ];
			CoordinateSystem.fromGeoTo3D( coordAtZero, pos3d);
			vertices[offset] = pos3d[0] - origin[0];
			vertices[offset+1] = pos3d[1] - origin[1];
			vertices[offset+2] = pos3d[2] - origin[2];
			offset += 3;
		}
	}

	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	// Create index buffer(make shared ?)
	var indices = [];
	indices = Triangulator.process( coords );
	
	if ( indices == null )
	{
		console.error("Triangulation error ! Check if your GeoJSON geometry is valid");
		return false;
	}
	
	
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, upOffset + 1, lowOffset );
			indices.push( upOffset + 1, lowOffset + 1, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	renderable.numTriIndices = indices.length;
	
	var offset = 0;
	for ( var i = 0; i < coords.length-1; i++ )
	{
		indices.push( offset, offset + 1 );
		offset += 1;
	}
	if ( style.extrude )
	{
		var upOffset = 0;
		var lowOffset = coords.length;
		for ( var i = 0; i < coords.length-1; i++ )
		{
			indices.push( upOffset, lowOffset );
			
			upOffset += 1;
			lowOffset += 1;
		}
	}
	
	renderable.numLineIndices = indices.length - renderable.numTriIndices;

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
	
	mat4.identity(renderable.matrix);
	mat4.translate(renderable.matrix,origin);

	this.renderables.push(renderable);

}

/**************************************************************************************************************/

/**
 * 	Remove polygon from renderer
 */
PolygonRenderer.prototype.removeGeometry = function(geometry,style){
	
	for ( var i = 0; i<this.renderables.length; i++ )
	{
		var currentRenderable = this.renderables[i];
		if ( currentRenderable.geometry == geometry){

			// Dispose resources
			var gl = this.renderContext.gl;
	
			if ( currentRenderable.indexBuffer )
				gl.deleteBuffer(currentRenderable.indexBuffer);
			if ( currentRenderable.vertexBuffer )
				gl.deleteBuffer(currentRenderable.vertexBuffer);

			currentRenderable.indexBuffer = null;
			currentRenderable.vertexBuffer = null;

			// Remove from array
			this.renderables.splice(i, 1);
			break;
		}
	}
}

/**************************************************************************************************************/

/**
 * 	Render all the polygons
 */
PolygonRenderer.prototype.render = function()
{
	var renderContext = this.renderContext;
	var gl = renderContext.gl;
	
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.depthFunc(gl.LEQUAL);
	//gl.enable(gl.POLYGON_OFFSET_FILL);
	//gl.polygonOffset(-2.0,-2.0);
	//gl.disable(gl.DEPTH_TEST);
	
	this.program.apply();
	
	// Compute the viewProj matrix
	var viewProjMatrix = mat4.create();
	mat4.multiply(renderContext.projectionMatrix, renderContext.viewMatrix, viewProjMatrix);
	
	var modelViewProjMatrix = mat4.create();

	
	for ( var n = 0; n < this.renderables.length; n++ )
	{
		var renderable = this.renderables[n];
		
		if ( !renderable.layer._visible
			|| renderable.layer._opacity <= 0.0 )
			continue;
			
		mat4.multiply(viewProjMatrix,renderable.matrix,modelViewProjMatrix);
		gl.uniformMatrix4fv(this.program.uniforms["mvp"], false, modelViewProjMatrix);
			
		var style = renderable.style;
		gl.uniform4f(this.program.uniforms["u_color"], style.fillColor[0], style.fillColor[1], style.fillColor[2], 
				style.fillColor[3] * renderable.layer._opacity);  // use fillColor
				
		gl.bindBuffer(gl.ARRAY_BUFFER, renderable.vertexBuffer);
		gl.vertexAttribPointer(this.program.attributes['vertex'], 3, gl.FLOAT, false, 0, 0);
		
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderable.indexBuffer);
		
		gl.drawElements( gl.TRIANGLES, renderable.numTriIndices, gl.UNSIGNED_SHORT, 0);
		if ( renderable.numLineIndices > 0 )
		{
			gl.uniform4f(this.program.uniforms["u_color"], style.strokeColor[0], style.strokeColor[1], style.strokeColor[2], style.strokeColor[3] * renderable.layer._opacity);  
			gl.drawElements( gl.LINES, renderable.numLineIndices, gl.UNSIGNED_SHORT, renderable.numTriIndices * 2);
		}
	}
	
	//gl.enable(gl.DEPTH_TEST);
	//gl.disable(gl.POLYGON_OFFSET_FILL);
	gl.depthFunc(gl.LESS);
	gl.disable(gl.BLEND);
}

/**************************************************************************************************************/

// Register the renderer
VectorRendererManager.registerRenderer({
	creator: function(globe) { 
			return new PolygonRenderer(globe.tileManager);
		},
	canApply: function(type,style) {return (type == "Polygon") && style.fill; }
});

});