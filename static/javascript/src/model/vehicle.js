define(["backbone", "utils", "leaflet"],
       function(B, $u, L) {
           var VehicleModel = B.Model.extend({
               defaults: {
                   _selected: false
               },

               getRoute: function() {
                   var route_id = this.get("route_id");
                   return this.collection.app.routes.get(route_id);
               },

               getLatLng: function() {
                   return L.latLng(this.get("lat"), this.get("lon"));
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
