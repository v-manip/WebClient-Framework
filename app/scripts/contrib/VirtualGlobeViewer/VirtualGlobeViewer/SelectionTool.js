/*
 * Selection widget:
 *
 * Responsible for providing 2D and 3D selection tools for the virtual globe.
 *
 * Author: Martin Hecher <martin.hecher@fraunhofer.at>
 *
 * License: TBD
 */

define(['./Point',
 './Selection'], function(Point, Selection) {

    SelectionTool = function(globe, navigation, aoiLayer) {
        this._globe = globe;
        this._navigation = navigation;
        this._selections = [];
        this._mouseButtonDown = false;
        this._mode = "polygonal";
        this._curSelection = null;
        this._onSelectionCallback = null;
        this._shiftKey = false;
        this._inRectangular = false; // FIXXME: quick hack for the moment...
        this._aoiLayer = aoiLayer;

        window.onkeydown = function(evt) {
            if (evt.ctrlKey) {
                this.start();

                if (this._mode === "rectangular") {
                    this._navigation.stop();
                }
            }

            if (evt.shiftKey) {
                this._shiftKey = true;
            } else {
                this._shiftKey = false;
            }
        }.bind(this);

        window.onkeyup = function() {
            this.stop();

            if (this._mode === "rectangular") {
                this._navigation.start();
            }
        }.bind(this);

        this.render = function() {
        	if (this._shiftKey) {
        		this._curSelection.render(30000);
        	} else {
        		this._curSelection.render();
        	}
        };

        var _storePoint = function(evt) {
            var pos = this._globe.renderContext.getXYRelativeToCanvas(evt);
            var lonlat = this._globe.getLonLatFromPixel(pos[0], pos[1]);
            this._curSelection.add(new Point(lonlat));
        }.bind(this);

        this._getLatLngPoint = function(evt) {
            var pos = this._globe.renderContext.getXYRelativeToCanvas(evt);
            var lonlat = this._globe.getLonLatFromPixel(pos[0], pos[1]);

            return new Point(lonlat);
        };

        var _handleOnMouseDown = function(evt) {
            this._mouseButtonDown = true;

            if (!this._curSelection) {
                var pos = this._globe.renderContext.getXYRelativeToCanvas(evt);
                var lonlat = this._globe.getLonLatFromPixel(pos[0], pos[1]);

                var selection = new Selection(this._aoiLayer);
                this._selections.push(selection);

                this._curSelection = selection;
            }

            this._curSelection.add(this._getLatLngPoint(evt));

            if (this._curSelection.getNumPoints() > 1) {
                this._inRectangular = true;
            }

            // if (this._mode === "rectangular") {
            // 	_storePoint(evt);
            // 	this._navigation.stop();
            // }
        }.bind(this);

        var _handleOnMouseMove = function(evt) {
            if (this._mouseButtonDown && !this._inRectangular) {

                this._navigation.stop();
                this._mode = "rectangular";

                var start_point = this._curSelection.getStartPoint().clone();
                var cur_point = this._getLatLngPoint(evt);

                this._curSelection.clear();
                this._curSelection.add(start_point);
                this._curSelection.add(new Point([cur_point.x, start_point.y]));
                this._curSelection.add(cur_point);
                this._curSelection.add(new Point([start_point.x, cur_point.y]));

                this.render();
                // this._inSelection();
            }
        }.bind(this);

        var _handleOnMouseUp = function(evt) {
            this._mouseButtonDown = false;

            if (this._mode === "rectangular") {
                var start_point = this._curSelection.getStartPoint().clone();
                var cur_point = this._getLatLngPoint(evt);

                this._curSelection.clear();
                this._curSelection.add(start_point);
                this._curSelection.add(new Point([cur_point.x, start_point.y]));
                this._curSelection.add(cur_point);
                this._curSelection.add(new Point([start_point.x, cur_point.y]));

                this.render();
                this._endSelection();

                this._navigation.start();
                this._mode = "polygonal";
            } else {
                if (evt.button === 0) { // left button
                    this._curSelection.add(this._getLatLngPoint(evt));
                    this._curSelection.render();
                } else if (evt.button === 2) { // right button
                    this._endSelection();
                }
            }

            this._inRectangular = false;
        }.bind(this);

        this._endSelection = function() {
            if (this._curSelection && this._onSelectionCallback) {
                this._onSelectionCallback(this._curSelection);
            }
            this._curSelection = null;
        }

        this._inSelection = function() {
            this._inSelectionCallback(this._curSelection);
        }

        var _handleOnContextMenu = function(evt) {
            evt.preventDefault();
        };

        this.start = function() {
            var canvas = this._globe.renderContext.canvas;

            canvas.addEventListener("mousedown", _handleOnMouseDown);
            canvas.addEventListener("mousemove", _handleOnMouseMove);
            canvas.addEventListener("mouseup", _handleOnMouseUp);

            canvas.addEventListener("contextmenu", _handleOnContextMenu);

            console.debug("[SelectionTool::start] called");
        };

        this.stop = function() {
            this._endSelection();

            var canvas = this._globe.renderContext.canvas;

            canvas.removeEventListener("mousedown", _handleOnMouseDown);
            canvas.removeEventListener("mousemove", _handleOnMouseMove);
            canvas.removeEventListener("mouseup", _handleOnMouseUp);

            canvas.removeEventListener("contextmenu", _handleOnContextMenu);

            console.debug("[SelectionTool::stop] called");
        }

        this.setOnSelectionCallback = function(cb) {
            this._onSelectionCallback = cb;
        }

        this.setInSelectionCallback = function(cb) {
            this._inSelectionCallback = cb;
        }
    };
    return SelectionTool;
});