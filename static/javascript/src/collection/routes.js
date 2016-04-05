define(["jquery", "underscore", "backbone", "route-model", "stop-model", "config", "utils",
        "path-utils"],
       function($, _, B, Route, Stop, config, $u, $p) {
           var colors = ["blue", "orange", "purple", "maroon",
                         "steelblue", "gray"];

           /**
            * @param {Object[]} models
            * @param {Object} [options]
            * @param {AppState} [options.app] Reference to the shared app
            */
           var RoutesCollection = B.Collection.extend({
               model: Route,
               initialize: function(models, options) {
                   B.Collection.prototype.initialize.call(this, models, options);

                   this.app = options.app;
                   // Save colors even when routes are removed from view:
                   this.savedColors = {};
                   // Used to assign colors:
                   this._colorCount = 0;
                   // Used to prevent path overlaps:
                   this._segMap = {};
               },

               getFullList: function() {
                   if (this._routeNames) {
                       return $.Deferred().resolve(this._routeNames);
                   }

                   var self = this;
                   return $.getJSON("/api/routes")
                       .then(function(response) {
                           return self._routeNames = response.route_names;
                       });
               },

               loadRoutes: function(ids) {
                   var self = this,
                       stops = this.app.stops,
                       shapes = this.app.shapes;

                   // Only fetch routes that have not already been loaded from
                   // the server:
                   ids = _.filter(ids, function(id) {
                       var r = self.get(id);
                       return !r || r.get("_loaded");
                   });

                   return $.get("/api/routeinfo", {routes: ids.join(",")})
                       .then(function(resp) {
                           var routes = resp.routes,
                               models = [];
                           _.each(routes, function(info, route_id) {
                               // If the query returned no information for this
                               // route, don't add it!
                               if (!info) return;

                               info.id = route_id;
                               info._loaded = true;

                               var style = _.extend({},
                                                    config.defaultRouteStyle,
                                                    config.routeStyles[route_id]);
                               if (self.savedColors[route_id])
                                   style.color = this.savedColors[route_id];
                               else if (!style.color) {
                                   var n = config.colors.length;
                                   style.color = config.colors[(self._colorCount++)%n];
                               }

                               info.style = style;

                               // Add parent stops:
                               var all_children = [];
                               stops.add(_.map(
                                   info.parent_stops,
                                   function(parent) {
                                       var child_ids = parent.children;
                                       delete parent.children;
                                       _.extend(parent, {
                                           is_parent: true,
                                           route_ids: $u.asKeys(parent.route_ids)
                                       });
                                       var parentStop = new Stop(parent),
                                           children = {};

                                       // Record the ids of stops that share a
                                       // parent stop with the current route but
                                       // are not themselves on the route.
                                       _.each(child_ids, function(id) {
                                           var stop = {
                                               stop_id: id,
                                               route_ids: {},
                                               parent: parent.stop_id,
                                               lat: parent.lat,
                                               lon: parent.lon,
                                               stop_name: parent.stop_name
                                           };
                                           all_children.push(stop);
                                           children[id] = stop;
                                       });

                                       parentStop.children = children;

                                       return parentStop;
                                   }));
                               delete info.parent_stops;

                               stops.add(all_children);

                               _.each(info.stops,
                                      function(stop_info) {
                                          var stop = stops.add(stop_info);
                                          stop.addRoute(route_id);
                                      });

                               delete info.stops;

                               // Add shapes:
                               shapes.add(_.map(info.shape2path,
                                                function(path, id) {
                                                    return {
                                                        id: id,
                                                        path: path,
                                                        route_id: route_id
                                                    };
                                                }));
                               delete info.shape2path;

                               models.push(info);
                           });

                           return self.add(models);
                       });

               },
               getRouteName: function(route_id) {
                   return (this._routeNames && this._routeNames[route_id]) ||
                       route_id;
               },

               getRouteShortName: function(route_id) {
                   return config.routeNicknames[route_id] ||
                       (this._routeNames && this._routeNames[route_id]) ||
                       route_id;
               },

               getAndLoadRoute: function(route_id) {
                   return this.getRoute(route_id).loadInfo();
               }
           });

           return RoutesCollection;
       });
