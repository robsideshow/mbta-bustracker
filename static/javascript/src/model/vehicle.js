define(["backbone", "utils"],
       function(B, $u) {
           var VehicleModel = B.Model.extend({
               getRoute: function() {
                   var route_id = this.get("route_id");
                   return this.collection.app.routes.get(route_id);
               },

               summary: function() {
                   var vehicle = this.attributes;

                   return ["vehicle id: ", vehicle.id, "<br/> ",
                           vehicle.type == "subway" ? vehicle.route :
                           ((vehicle.direction == "1" ? "Inbound " : "Outbound ") + "Route " + vehicle.route),
                           vehicle.type,
                           "heading",
                           $u.readableHeading(vehicle.heading),
                           "toward",
                           vehicle.destination
                          ].join(" ");
               }
           });

           return VehicleModel;
       });
