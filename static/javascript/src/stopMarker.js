define(["leaflet", "underscore"],
       function(L, _) {
           return L.FeatureGroup.extend({
               initialize: function(stop, app, scale) {
                   L.FeatureGroup.prototype.initialize.apply(this, []);
                   this.stop = stop;
                   this.setScale(scale);
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
                   var scale = this.scale;

                   if (scale >= 17) {
                       return L.divIcon({
                           className: "stop-wrapper",
                           iconSize: L.point(24, 36),
                           html: '<div class="normal stop-marker"></div>'
                       });
                   } else if (scale >= 15) {
                       return L.divIcon({
                           className: "stop-wrapper",
                           iconSize: L.point(12, 18),
                           html: '<div class="mini stop-marker"></div>'
                       });
                   } else {
                       return L.divIcon({
                           className: "stop-wrapper",
                           iconSize: L.point(5, 5),
                           html: "<div class='micro-stop-marker'></div>"
                       });
                   }
               },

               setScale: function(scale) {
                   this.scale = scale;
                   if (this.marker) {
                       this.marker.setIcon(this.makeIcon());
                   } else {
                       this.marker = L.marker(this.stop.getLatLng(),
                                              {icon: this.makeIcon()})
                           .addTo(this);
                   }
               }
           });
       });
