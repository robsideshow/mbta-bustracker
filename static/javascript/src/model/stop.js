define(["backbone", "leaflet"],
       function(B, L) {
           var StopModel = B.Model.extend({
               idAttribute: "stop_id",

               getLatLng: function() {
                   return L.latLng(this.get("lat"), this.get("lon"));
               }
           });

           return StopModel;
       });
