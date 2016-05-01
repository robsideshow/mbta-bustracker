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

               makeIcon: function() {
                   var scale = this.scale,
                       w, h, typeClass, sizeClass;

                   if (scale >= 17) {
                       w = 24;
                       h = 36;
                       sizeClass = "normal";
                   } else if (scale >= 15) {
                       w = 12;
                       h = 18;
                       sizeClass = "mini";
                   } else {
                       w = h = 5;
                       sizeClass = "micro";
                   }

                   if (this.stop.type() == "bus")
                       typeClass = "bus";
                   else
                       typeClass = "metro";

                   return L.divIcon({
                       className: "stop-wrapper",
                       iconSize: L.point(w, h),
                       html: ("<div class='" + sizeClass + " stop-marker " +
                              typeClass + "'></div>")
                   });
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
