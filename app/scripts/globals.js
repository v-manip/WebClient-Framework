
// globals
define(['backbone', 'objectStore'], function(Backbone, ObjectStore) {
	return {
		version: "0.2.0dev0",
		objects: new ObjectStore(),
		selections: new ObjectStore(),
		baseLayers: new Backbone.Collection(),
		products: new Backbone.Collection(),
		overlays: new Backbone.Collection()
	}
});
