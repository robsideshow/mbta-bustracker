define(["jquery", "underscore", "backbone", "route-model", "config"],
       function($, _, B, Route, config) {
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

               getRoute: function(route_id) {
                   var route = this.get(route_id);

                   if (route)
                       return route;

                   var style = _.extend({},
                                        config.defaultRouteStyle,
                                        config.routeStyles[route_id]);
                   if (this.savedColors[route_id])
                       style.color = this.savedColors[route_id];
                   else if (!style.color) {
                       var n = config.colors.length;
                       style.color = config.colors[(this._colorCount++)%n];
                       this.savedColors[route_id] = style.color;
                   }

                   route = new Route({style: style,
                                      id: route_id},
                                     {app: this.app});
                   this.add(route);

                   return route;
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
