define(["backbone", "leaflet"],
       function(B, L) {
           var ShapeModel = B.Model.extend({
               getBounds: function() {
                   if (!this._cachedBounds)
                       this._cachedBounds = L.latLngBounds(this.get("path"));

                   return this._cachedBounds;
               }
           });

           return ShapeModel;
       });
