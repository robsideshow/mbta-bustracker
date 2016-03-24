define(["backbone", "underscore", "utils", "config"],
       function(B, _, $u, config) {
           var StopVehiclesView = B.View.extend({
               initialize: function(options) {
                   options = options || {};
                   B.View.prototype.initialize.call(this, options);
                   this.popup = options.popup;
                   this.app = options.app;

                   this.lastStamp = 0;

                   // Map of mode -> "0"/"1"
                   this.modeDirections = {bus: "1", subway: "1"};

                   this.popup.setContent(this.el);
               },

               className: "vehicle-etas",

               events: {
                   "click .route-toggles a": "showRoute",
                   "click a.all-on": "allOn",
                   "click a.swatch": "hideRoute",
                   "click a.change-dir": "changeDirection"
               },

               // TODO: Cache information about vehicle predictions, so that it
               // doesn't have to be recalculated once per sec.
               _updatePreds: function() {

               },

               // Redraw the view using the last stamp
               rerender: function() {
                   this.render(this.lastStamp);
               },

               render: function(stamp) {
                   if (!stamp) stamp = $u.stamp();

                   var stop = this.model,
                       dirs = this.modeDirections,
                       html = ["<div class='popup-header'><div class='stop-name'>",
                               _.escape(stop.getName()), "</div>"],
                       vehicles = this.app.vehicles,
                       routes = this.app.routes,
                       // Keep track of the disabled routes for which we have
                       // predictions available:
                       off = {},
                       preds;

                   this.lastStamp = stamp;

                   if (stop.isParent()) {
                       preds = $u.mapcat(stop.getChildren(),
                                         function(stop) {
                                             return stop.get("preds") || [];
                                         });
                   } else {
                       preds = stop.get("preds");
                   }

                   var groupedPreds = {
                       bus: [],
                       subway: []
                   },
                       groupNames = {bus: "Bus Routes",
                                     subway: "Subway Routes"},
                       // Ignore predictions more than 30 minutes in the future:
                       threshold = stamp + 1800000,
                       // Limit number of predictions shown:
                       max = Infinity,
                       cmp = function(predA, predB) {
                           var diff = predA.arr_time - predB.arr_time;

                           return diff < 0 ? -1 : diff > 0 ? 1 : 0;
                       };

                   _.each(preds, function(pred) {
                       var route_id = pred.route_id;
 
                       if (pred.arr_time > threshold) return;
                       // Ignore disabled routes:
                       if (!routes.get(route_id)) {
                           off[route_id] = true;
                           return;
                       }
                       var subway = config.subwayPattern.exec(route_id),
                           key = subway ? "subway" : "bus";

                       // Ignore vehicles traveing in the wrong direction:
                       if (dirs[key] !== pred.direction) return;

                       $u.insertSorted(groupedPreds[key], pred, cmp);
                   });

                   _.each(groupedPreds, function(group, gk) {
                       if (!group.length) return;

                       html.push("<div class='mode-head'>",
                                 groupNames[gk],
                                 "<a href='#' class='material-icons change-dir' ",
                                 "data-mode='", gk, "'>",
                                 (dirs[gk] === "0" ?
                                  "arrow_downward" : "arrow_upward"),
                                 "</a></div>");

                       _.each(group, function(pred) {
                           var route_id = pred.route_id,
                               dt = pred.arr_time - stamp;

                           var route = routes.get(route_id),
                               color = route ? route.getColor() : "#aaa",
                               name = routes.getRouteShortName(route_id);

                           html.push(
                               "<div class='vehicle-pred' data-route='",
                               route_id, "'><a class='swatch' ",
                               "style='background-color:",
                               color, "'>&times;</a> ", name,
                               " &rarr; <span class='route-name'>",
                               _.escape(pred.destination),
                               "</span> <div class='pred-time'>",
                               $u.briefRelTime(dt), "</div>");
                       });
                   });

                   if (!_.isEmpty(off)) {
                       var route_ids = _.keys(off);
                       html.push("<div class='route-toggles popup-content'>");
                       // Show links to toggle routes on:
                       _.each(route_ids, function(route_id) {
                           html.push("<a href='#' data-route='",
                                     route_id, "'>",
                                     _.escape(routes.getRouteShortName(route_id)),
                                     "</a>");
                       });
                       html.push("</div>");

                       if (route_ids.length > 1) {
                           html.push("<a href='#' data-routes='",
                                     route_ids.join(","), "' class='all-on'>",
                                     "All", "</a>");
                       }
                   }

                   this.$el.html(html.join(""));

                   return this;
               },

               changeDirection: function(e) {
                   var mode = $(e.target).data("mode"),
                       dir = this.modeDirections[mode];

                   this.modeDirections[mode] = dir == "1" ? "0" : "1";
                   this.rerender();
                   e.preventDefault();
               },

               showRoute: function(e) {
                   var route_id = $(e.target).data("route");
                   this.app.addRoute(route_id);
                   // Since the route information won't be instantly
                   // available, don't bother re-rendering right away.
                   e.preventDefault();
               },

               hideRoute: function(e) {
                   var route_id = $(e.target).data("route");

                   if (route_id) {
                       this.app.toggleRoute(route_id);
                       this.rerender();
                   }

                   e.preventDefault();
               },

               allOn: function(e) {
                   var ids = $(e.target).data("routes").split(","),
                       app = this.app;

                   _.each(ids, function(id) {
                       app.addRoute(id);
                   });
                   e.preventDefault();
               }
           });

           return StopVehiclesView;
       });
