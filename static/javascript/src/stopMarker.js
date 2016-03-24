define(["leaflet", "underscore"],
       function(L, _) {
           return L.FeatureGroup.extend({
               initialize: function(stop, app) {
                   L.FeatureGroup.prototype.initialize.apply(this, []);
                   this.stop = stop;
                   this.marker = L.marker(stop.getLatLng(),
                                          {icon: this.makeIcon()})
                       .addTo(this);
                   this.on("click", function() {
                       app.selectStop(stop.id);
                   });
               },

               onPopup: function(e) {
                   var html, stop = this.stop,
                       stopAttrs = stop.attributes;
                   if (stop.isParent()) {
                       var childStops = stop.getChildren();

                       if (childStops.length > 1) {
                           html = ["Stops:"];
                           _.each(childStops, function(stop) {
                               html.push("<br/>Name: " + stop.getName());
                           });
                           e.popup.setContent(html.join(""));
                           return;
                       }
                   }

                   html = ["Stop id: ", this.stop.id,
                           "<br/> Stop Name:", this.stop.getName()].join("");
                   e.popup.setContent(html);
               },

               onPopupClose: function(e) {
               },

               makeIcon: function() {
                var html = '<div class="stop-marker"></div>';

                return L.divIcon({
                  className: "stop-wrapper",
                  html: html
                });
               }
           });
       });
