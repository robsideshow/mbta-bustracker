/**
 * 
 */
define(["underscore", "backbone", "route-model", "config"],
       function(_, B, Route, config) {
           var colors = ["blue", "orange", "purple", "maroon",
                         "steelblue", "gray"];

           /**
            * @param {Object[]} models
            * @param {Object} [options]
            * @param {AppState} [options.app] Reference to the shared app
            */
           var RoutesCollection = B.Collection.extend({
               model: Route,
               _routeCount: 0,
               initialize: function(models, options) {
                   B.Collection.prototype.initialize.call(this, models, options);

                   this.app = options.app;
               },

               getRoute: function(route_id) {
                   var route = this.get(route_id);

                   if (route)
                       return route;

                   var style = _.extend({
                       color: config.colors[(this._routeCount++)%10]
                   },
                                        config.defaultRouteStyle,
                                        config.routeStyles[route_id]);

                   route = new Route({style: style,
                                      id: route_id},
                                     {app: this.app});
                   this.add(route);

                   return route;
               },

               getAndLoadRoute: function(route_id) {
                   return this.getRoute(route_id).loadInfo();
               }
           });

           return RoutesCollection;
       });
