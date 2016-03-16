define(["backbone", "jquery"],
       function(B, $) {
           var LegendView = B.View.extend({
               initialize: function(options) {
                   console.assert(options.app,
                                  "LegendView requires an AppState instance");
                   this.app = options.app;

                   var vehicles = this.app.vehicles;
                   this.listenTo(vehicles , "add", this.deferRender)
                       .listenTo(vehicles, "remove", this.deferRender)
                       .listenTo(vehicles, "change:direction", this.deferRender)
                       .listenTo(vehicles, "change:route_id", this.deferRender);
               },

               events: {
                   "click .route-name": "onClick"
               },

               deferRender: function() {
                   clearTimeout(this._deferred);

                   var self = this;
                   this._deferred = setTimeout(function() {
                       self.render();
                   }, 0);
               },

               render: function() {
                   var $el = this.$el,
                       $content = $el.find("tbody");
                   if (!this.app.route_ids.length) {
                       $content.html("");
                       $el.hide();
                       return;
                   }

                   var routes = this.app.routes,
                       routeInfo = _.reduce(this.app.route_ids,
                                            function(m, route_id) {
                                                m[route_id] = {inbound: 0,
                                                               outbound: 0};
                                                return m;
                                            }, {});

                   this.app.vehicles.each(
                       function(vehicle) {
                           var route_id = vehicle.get("route_id");
                           try {
                               routeInfo[route_id][vehicle.get("direction") == "1" ?
                                                   "inbound" : "outbound"] += 1;
                           } catch (err) {
                               // Only count vehicles that have route_id values
                               // in the route_ids array.
                           }
                       });

                   $content.html("");

                   _.each(routeInfo, function(info, route_id) {
                       var route = routes.get(route_id);
                       $content.append(
                           "<tr class='route'>" +
                               "<td class='route-name' data-route-id='" +
                               route_id + "''>" +
                               "<div class='swatch' style='background-color:" +
                               route.getColor() + "'>" +
                               "</div> " + _.escape(route.getName()) +
                               "</td>" +
                               "<td>" + info.inbound + "</td>" +
                               "<td>" + info.outbound + "</td>" +
                               "</tr>"
                       );
                   });

                   $el.show();
               },

               onClick: function(e) {
                   var route_id = $(e.target).data("route-id");
                   if (route_id) {
                       this.app.trigger("focusRoute", route_id);
                       return false;
                   }

                   return true;
               }
           });

           return LegendView;
       });
