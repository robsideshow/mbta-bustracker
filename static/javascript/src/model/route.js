define(["jquery", "backbone", "underscore", "config"],
       function($, B, _, config) {
           var RouteModel = B.Model.extend({
               initialize: function(model, options) {
                   B.Model.initialize.call(this, model, options);
                   this.app = options.app;
               },

               loadInfo: function(cacheOnly) {
                   var promise = $.Deferred();

                   if (this.get("_loaded")) {
                       promise.resolve(self);
                   } else if (cacheOnly) {
                       promise.reject("Route info not in cache.");
                   } else {
                       var self = this,
                           stops = this.app && this.app.stops;

                       $.get("/api/routeinfo", {route: this.id})
                           .done(function(info) {
                               info._loaded = true;
                               delete info.stops;
                               self.set(info);
                               promise.resolve(self);
                               if (!stops) return;

                               stops.add(_.map(info.stops,
                                               function(stop) {
                                                   stop.route_id = self.id;
                                                   return stop;
                                               }));
                           });
                   }

                   return promise;
               },

               getColor: function() {
                   var style = this.get("style");

                   return style && style.color;
               }
           });

           return RouteModel;
       });
