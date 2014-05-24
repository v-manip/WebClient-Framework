define([
    'jquery'
], function($) {

    'use strict';

    function XTKViewer(opts) {
        dat.GUI.prototype.removeFolder = function(name) {
            if (this.__folders[name]) {
                this.__folders[name].close();
                // this.__ul.removeChild(this.__folders[name].li);
                //dom.removeClass(this.__folders[name].li, 'folder');
                this.__folders[name] = undefined;
                this.onResize();
            }
        };

        this.mainGUI = null;
        this.idx = 0;
        this.cameraPosition = opts.cameraPosition || [120, 80, 160];
        this.backgroundColor = opts.backgroundColor || [1, 1, 1];

        // create and initialize a 3D renderer
        var r = this.renderer = new X.renderer3D();
        r.container = opts.elem;
        r.bgColor = this.backgroundColor;
        r.init();

        this.volumes = {};
        this.meshes = {};

        // adjust the camera position a little bit, just for visualization purposes
        r.camera.position = this.cameraPosition;
    };

    XTKViewer.prototype.onResize = function() {
        this.renderer.resetBoundingBox();
        this.renderer.resetViewAndRender();
    };

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    // Takes (multiple) obj/mtl pairs with textures and adds them to the viewer.
    // NOTE: Currently only the first obj/mtl pair is displayed!
    XTKViewer.prototype.addMesh = function(opts) {
        var modelnames = Object.keys(opts.models[0]),
            modeldata = opts.models[0][modelnames[0]],
            mtldata = opts.mtls[0][modelnames[0]];

        console.log('[XTKViewer.addMesh] adding obj/mtl pair: ' + modelnames[0]);

        var obj = K3D.parse.fromOBJ(modeldata);

        console.log('OBJ (K3D) stats:');
        console.log(' * objects: ' + Object.keys(obj.groups).length);
        _.forEach(Object.keys(obj.groups), function(value, key) {
            var object = obj.groups[value];
            console.log(' * name:     ' + value);
            console.log(' * verts:     ' + (object.to - object.from));
            console.log(' * faces:     ' + (object.to - object.from) / 3);
        });

        var single_objs = K3D.parse.toIndividualOBJs(obj);
        var mtl = K3D.parse.fromMTL(mtldata);

        var root = new X.object();

        for (var idx = 0; idx < single_objs.length; idx++) {
            var obj = single_objs[idx].data,
                name = single_objs[idx].name,
                material = single_objs[idx].material,
                mesh = new X.mesh();
            opts.model_filename

            mesh.file = name + '.obj';
            mesh.filedata = K3D.parse._strToBuff(obj);

            if (material && mtl[material]) {
                var tex_name = mtl[material].map_Kd;
                // mesh.texture.file = 'data/curtain-obj/159be6d2-2913-40eb-8a7f-d8807d7d3bd1.png';
                mesh.texture._image = new Image();
                // // Make sure that the image data is loaded before the mesh tries to generate the WebGL texture:
                // mesh.texture._image.addEventListener("load", function() {
                // }, false);
                mesh.texture.flipY = true;
                mesh.texture._image.src = K3D.convertToPNGURI(opts.textures[tex_name]);
            }

            mesh.color = [0, 1, 0];
            root.children.push(mesh);
        };

        var label = opts.label || 'Curtain';

        // Cache the mesh for later removal:
        var entries = this.meshes[mesh.file],
            meshes_to_add = [];

        if (!entries) {
            this.meshes[opts.filename] = [];
            entries = this.meshes[opts.filename];
            label += ' ' + (entries.length + 1);
        } else {
            entries = this.meshes[opts.filename];
            label += ' ' + (entries.length + 1);
        }

        var mesh_info = {
            label: label,
            mesh: root
        };
        entries.push(mesh_info);
        meshes_to_add.push(mesh_info);

        // The onShowtime method gets executed after all files were fully loaded and
        // just before the first rendering attempt. To ensure that the callback gets called
        // when volumes are added the internal '_onShowtime' flag is set to 'false' here
        // so that the callback gets called on the next render tick.
        this.renderer._onShowtime = false;

        this.renderer.onShowtime = function() {
            if (!this.baseInitDone) {
                var gui = this.mainGUI = new dat.GUI({
                    autoPlace: true
                });
                this.renderer.container.appendChild(gui.domElement);
                this.baseInitDone = true;
            }

            _.forEach(this.meshes, function(value, key) {
                this.addMeshToGUI(value[0].label, value[0].mesh);
            }.bind(this));
        }.bind(this);

        this.renderer.add(root);
        this.renderer.render();
    };

    XTKViewer.prototype.addVolume = function(opts) {
        // FIXXME: define an array with supported mimetypes to not have to hardcode
        // the mimetypes here and below!
        var volumes = null;
        if (opts.data['application/x-nifti']) {
            volumes = opts.data['application/x-nifti'];
        } else { // For loading testdata from a local file 'octet-stream' is the correct mimetype:
            volumes = opts.data['application/octet-stream'];
        }

        if (!volumes) {
            console.log('[XTKViewer::addVolume] AoI contains no volume data, skipping...');
            return;
        }

        var num_volumes = Object.keys(volumes).length,
            volumes_to_add = [];

        for (var idx = 0; idx < num_volumes; idx++) {
            var volume_item = volumes[idx],
                volume_info = Object.keys(volume_item);

            var volume = new X.volume();

            // FIXXME: hack to satisfy xtk, which obviously determines the format of the volume data by the ending of the url it gets.
            // I appended a dummy file here, so xtk gets the format, the backend W3DS server will simply discard the extra parameter...
            volume.file = opts.filename + '&dummy.nii';

            var data = volume_item[volume_info[0]];
            if (typeof data === 'string') {
                volume.filedata = str2ab(volume_item[volume_info[0]]);
            } else {
                volume.filedata = volume_item[volume_info[0]];
            }

            volume.volumeRendering = opts.volumeRendering || undefined;
            volume.opacity = opts.opacity || undefined;
            volume.minColor = opts.minColor || undefined;
            volume.maxColor = opts.maxColor || undefined;
            volume.reslicing = opts.reslicing || undefined;

            var label = opts.label || 'Volume';

            // Cache the volume for later removal:
            var entries = this.volumes[opts.filename];
            if (!entries) {
                this.volumes[opts.filename] = [];
                entries = this.volumes[opts.filename];
                label += ' ' + (entries.length + 1);
            } else {
                entries = this.volumes[opts.filename];
                label += ' ' + (entries.length + 1);
            }

            var volume_info = {
                label: label,
                volume: volume
            };
            entries.push(volume_info);
            volumes_to_add.push(volume_info);

            this.renderer.add(volume);
        }

        // The onShowtime method gets executed after all files were fully loaded and
        // just before the first rendering attempt. To ensure that the callback gets called
        // when volumes are added the internal '_onShowtime' flag is set to 'false' here
        // so that the callback gets called on the next render tick.
        this.renderer._onShowtime = false;

        this.renderer.onShowtime = function(entries) {
            if (!this.mainGUI) {
                var gui = this.mainGUI = new dat.GUI({
                    autoPlace: true
                });
                this.renderer.container.appendChild(gui.domElement);
                this.baseInitDone = true;
            }

            // Note: we need to create the GUI during onShowtime(..) since we do not know the
            // volume dimensions before the loading was completed
            for (var idx = 0; idx < volumes_to_add.length; idx++) {
                var volume_info = volumes_to_add[idx];
                var gui = this.addVolumeToGUI(volume_info.label, volume_info.volume);
                volume_info['gui'] = gui;
            }
        }.bind(this, entries);

        // NOTE: This triggers the loading of the volume and executes
        // r.onShowtime() once done. Be sure to call render AFTER you
        // added a volume. Otherwise values on the volume like min, max.
        // range are not yet calculated!
        this.renderer.render();
    };

    XTKViewer.prototype.removeObject = function(layer_name) {
        var volume_set = this.volumes[layer_name];

        if (volume_set) {
            _.forEach(volume_set, function(info) {
                this.renderer.remove(info.volume);
                if (info.gui) {
                    this.removeGui(info.gui);
                }
            }.bind(this));

            delete this.volumes[layer_name];

            // Recenter the view after all volumes are removed:
            if (Object.keys(this.volumes).length === 0) {
                this.onResize();
                if (this.mainGUI) {
                    this.removeGui(this.mainGUI);
                    this.mainGUI = null;
                }
            }
        }
    };

    XTKViewer.prototype.addVolumeToGUI = function(label, volume) {
        // this.mainGUI.removeFolder(label);

        // the following configures the gui for interacting with the X.volume
        var volumegui = this.mainGUI.addFolder(label);
        // now we can configure controllers which..
        // .. switch between slicing and volume rendering
        var vrController = volumegui.add(volume, 'volumeRendering');
        // the min and max color which define the linear gradient mapping
        var minColorController = volumegui.addColor(volume, 'minColor');
        var maxColorController = volumegui.addColor(volume, 'maxColor');
        // .. configure the volume rendering opacity
        var opacityController = volumegui.add(volume, 'opacity', 0, 1).listen();
        // .. and the threshold in the min..max range
        var lowerThresholdController = volumegui.add(volume, 'lowerThreshold', volume.min, volume.max + 0.0001);
        var upperThresholdController = volumegui.add(volume, 'upperThreshold', volume.min, volume.max + 0.0001);
        var lowerWindowController = volumegui.add(volume, 'windowLow', volume.min, volume.max);
        var upperWindowController = volumegui.add(volume, 'windowHigh', volume.min, volume.max);
        // the indexX,Y,Z are the currently displayed slice indices in the range
        // 0..dimensions-1

        var sliceXController = volumegui.add(volume, 'indexX', 0, volume.range[0] - 1);
        var sliceYController = volumegui.add(volume, 'indexY', 0, volume.range[1] - 1);
        var sliceZController = volumegui.add(volume, 'indexZ', 0, Math.round(volume.range[2] - 1));

        volumegui.open();

        return volumegui;
    };

    XTKViewer.prototype.addMeshToGUI = function(label, mesh) {
        var meshgui = this.mainGUI.addFolder(label + this.idx++);
        var meshVisibleController = meshgui.add(mesh, 'visible');
        //var meshColorController = meshgui.addColor(mesh, 'color');
        meshgui.open();
    };

    XTKViewer.prototype.reset = function() {
        this.renderer.destroy();
        if (this.mainGUI) {
            this.removeGui(this.mainGUI);
        }
    };

    XTKViewer.prototype.removeGui = function(gui) {
        var el = gui.domElement;
        el.parentNode.removeChild(el);
    }

    return XTKViewer;
});