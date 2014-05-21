/*
 * Selection:
 *
 * Stores a single selection represented by a group of Points.
 *
 * Author: Martin Hecher <martin.hecher@fraunhofer.at>
 *
 * License: TBD
 */

define(['./Point',
	'virtualglobeviewer/GlobWeb'
], function(Point, GlobWeb) {

	function Selection(layer, base_altitude) {
		this._points = [];
		this._feature = null;
		this._layer = layer;
		this._baseAltitude = base_altitude || 5000;
		this._height = 0;
	};

	Selection.prototype.add = function(point) {
		this._points.push(point);
	};

	Selection.prototype.clear = function(point) {
		if (this._feature) {
			this._layer.removeFeature(this._feature);
		}
		this._points = [];
	};

	Selection.prototype.setHeight = function(height) {
		this._height = height;
	};

	Selection.prototype.getNumPoints = function() {
		return this._points.length;
	};

	Selection.prototype.render = function(height) {
		// if (this._feature) {
		// 	this._layer.removeFeature(this._feature);
		// }

		// var type = "2D";
		// if (height) {
		// 	this.setHeight(height); // TODO: debug only!
		// 	type = "3D"
		// }
		var coords = this._projectOnSurface(0);

		this._feature = {
			"geometry": {
				"type": "Polygon",
				"coordinates": coords
			}//,
			// "properties": {
			// 	"style": this._defaultStyle
			// }
		};

		// this._feature = {
		// 	"geometry": {
		// 		"type": "Polygon",
		// 		"area": type,
		// 		"coordinates": coords
		// 	},
		// 	"properties": {
		// 		"style": this._defaultStyle
		// 	}
		// };

		this._layer.addFeature(this._feature);
	};

	Selection.prototype.getStartPoint = function() {
		return this._points[0];
	};

	Selection.prototype._projectOnSurface = function(grid_resolution) {
		var coords = [];

		if (grid_resolution === 0) {
			// return this.toArray();
			return convertToGeoJSON(this._points, 30000);
		} else {
			console.log("[SelectionTool::projectOnSurface] NIY");

			// FIXXME: not ready for primetime yet:

			// 	var tl = _points[0];
			// 	var tr = _points[1];
			// 	var br = _points[2];
			// 	var bl = _points[3];

			// 	var grid = [tl];

			// 	for (var t = 0; t <= 1; t = t + 0.1) {
			// 		grid.push(Point.interpolate(tl, tr, t));
			// 	}

			// 	for (var t = 0; t <= 1; t = t + 0.1) {
			// 		grid.push(Point.interpolate(br, bl, t));
			// 	}

			// 	grid.push(tl);

			// 	var coords = [];
			// 	for (var idx in grid) {
			// 		var p = grid[idx];
			// 		coords.push([p.x, p.y]);
			// 		console.log("added point: (" + p.x + ", " + p.y + ")");
			// 	}
		}

		return coords;
	};

	var convertToGeoJSON = function(verts, altitude) {
		var coordinates = [];
		for (var idx = 0; idx < verts.length; ++idx) {
			var p = [];

			p.push(verts[idx].x);
			p.push(verts[idx].y);
			p.push(altitude);

			coordinates.push(p);
		}
		var p = [];

		p.push(verts[0].x);
		p.push(verts[0].y);
		p.push(altitude);
		coordinates.push(p);

		return coordinates;
	};

	Selection.prototype.toArray = function() {
		if (this._points.length === 0) {
			return;
		}

		var coords = [];

		if (this._height === 0) { // 2D selection
			for (var idx in this._points) {
				var p = this._points[idx];
				coords.push([p.x, p.y, this._baseAltitude]); // FIXXME: extend point class with altitude!
			}
			coords.push([this._points[0].x, this._points[0].y, this._baseAltitude]);
		} else { // 3D selection
			var tl = this._points[0];
			var tr = this._points[1];
			var bl = this._points[2];
			var br = this._points[3];

			var h = this._height;

			// coords.push([br.x, br.y, h]); // v0
			// coords.push([bl.x, bl.y, h]); // v1
			// coords.push([bl.x, bl.y, 0]); // v2
			// coords.push([br.x, br.y, 0]); // v3

			// coords.push([tr.x, tr.y, 0]); // v4
			// coords.push([br.x, br.y, h]); // v5
			// coords.push([tl.x, tl.y, h]); // v6
			// coords.push([tl.x, tl.y, 0]); // v7

			coords.push([bl.x, bl.y, h]); // v0
			coords.push([br.x, br.y, h]); // v1
			coords.push([br.x, br.y, 0]); // v2
			coords.push([bl.x, bl.y, 0]); // v3

			coords.push([bl.x, bl.y, h]); // v0
			coords.push([bl.x, bl.y, 0]); // v3
			coords.push([tr.x, tr.y, 0]); // v4
			coords.push([tr.x, tr.y, h]); // v5

			coords.push([bl.x, bl.y, h]); // v0
			coords.push([tr.x, tr.y, h]); // v5
			coords.push([tl.x, tl.y, h]); // v6
			coords.push([br.x, br.y, h]); // v1

			coords.push([br.x, br.y, h]); // v1
			coords.push([tl.x, tl.y, h]); // v6
			coords.push([tl.x, tl.y, 0]); // v7
			coords.push([br.x, br.y, 0]); // v2

			coords.push([tl.x, tl.y, 0]); // v7
			coords.push([tr.x, tr.y, 0]); // v4
			coords.push([bl.x, bl.y, 0]); // v3
			coords.push([br.x, br.y, 0]); // v2

			coords.push([tr.x, tr.y, 0]); // v4
			coords.push([tl.x, tl.y, 0]); // v7
			coords.push([tl.x, tl.y, h]); // v6
			coords.push([tr.x, tr.y, h]); // v5
		}

		return coords;
	};

	Selection.prototype.toJSON = function() {
		return this._feature;
	};

	Selection.prototype._defaultStyle = new GlobWeb.FeatureStyle({
		fillColor: [1, 0.5, 0.1, 0.5],
		strokeColor: [1, 0.5, 0.1, 1],
		extrude: true,
		fill: true
	});

	return Selection;

}); // end module definition