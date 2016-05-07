define(["leaflet", "underscore"],
       function(L, _) {
           var LABEL_ZOOM = 18;

           return L.FeatureGroup.extend({
               initialize: function(stop, app, scale) {
                   L.FeatureGroup.prototype.initialize.apply(this, []);
                   this.stop = stop;
                   this.setScale(scale);
                   this.on("click", function() {
                       app.selectStop(stop.id);
                   });
                   this.on("mouseover", _.bind(this.onMouseover, this))
                       .on("mouseout", _.bind(this.onMouseout, this));
               },

               // TODO: Set the z-index so that the stop marker is on top.
               onMouseover: function() {
                   this.showLabel(this.stop.getName());
               },

               onMouseout: function() {
                   if (this.scale < LABEL_ZOOM)
                       this.hideLabel();
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

               showLabel: function(name) {
                   var icon = L.divIcon({
                       className: "stop-label",
                       iconSize: L.point(0, 0),
                       html: "<div class='stop-label-text'>" +
                           _.escape(name) + "</div>"
                   });
                   if (this.labelMarker)
                       this.labelMarker.setIcon(icon);
                   else
                       this.labelMarker =
                       L.marker(this.stop.getLatLng(),
                                {icon: icon}).addTo(this);
               },

               hideLabel: function() {
                   if (this.labelMarker) {
                       this.removeLayer(this.labelMarker);
                       delete this.labelMarker;
                   }
               },

               setScale: function(scale) {
                   if (this.scale === scale) return;

                   this.scale = scale;
                   if (this.marker) {
                       this.marker.setIcon(this.makeIcon());
                   } else {
                       this.marker = L.marker(this.stop.getLatLng(),
                                              {icon: this.makeIcon()})
                           .addTo(this);
                   }

                   if (scale == LABEL_ZOOM) {
                       this.showLabel(this.stop.getName());
                   } else if (this.labelMarker) {
                       this.removeLayer(this.labelMarker);
                       delete this.labelMarker;
                   }
               }
           });
       });
