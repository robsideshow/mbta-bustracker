define(["jquery", "backbone", "underscore", "config", "leaflet", "path-utils",
        "utils"],
       function($, B, _, config, L, $p, $u) {
           var RouteModel = B.Model.extend({
               initialize: function(attrs, options) {
                   B.Model.prototype.initialize.call(this, attrs, options);
               },

               getApp: function() {
                   return this.collection.app;
               },

               getColor: function() {
                   var style = this.get("style");

                   return style && style.color;
               },

               getName: function() {
                   return this.get("routename") || "";
               },

               getShortName: function() {
                   return config.routeNicknames[this.id] ||
                       this.getName();
               },

               getMode: function() {
                   return config.getRouteMode(this.id);
               },

               getActiveShapes: function() {
                   return this.getApp().shapes.where(
                       {route_id: this.id, active: true});
               },

               getActiveBounds: function() {
                   var shapes = this.getActiveShapes();
                   if (!shapes.length) return null;

                   return shapes.reduce(function(bounds, shape) {
                       return bounds.extend(shape.getBounds());
                   }, L.latLngBounds([]));
               },

               getBounds: function() {
                   if (!this._bounds)
                       this._bounds = L.latLngBounds(this.get("paths"));

                   return this._bounds;
               },

               /**
                * Calculates a non-overlapping array of paths from the active
                * shapes.
                */
               getActivePaths: function() {
                   var shapes = this.getActiveShapes(),
                       pairSet = {},
                       pairList = [];

                   _.each(shapes, function(shape) {
                       var pairs = $p.makePairs(shape.get("path"));
                       pairList = pairList.concat(
                           $p.newPairs(pairSet, pairs));
                   });

                   return $p.joinPairs(pairList, shapes[0].get("path"));
               }
           });

           return RouteModel;
       });
