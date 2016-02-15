define(["leaflet", "utils"],
       function(L, $u) {
           return L.FeatureGroup.extend({
               /**
                * @param {Object} bus Object representing the state of a bus
                * @param {number} bus.lat
                * @param {number} bus.lon
                * @param {number} bus.heading
                *
                * @param {Object} [options]
                * @param {number} [options.busLength=10] Length in pixels of the bus
                * shape at level 15 zoom
                * @param {number} [options.busWidth=3]
                */
               initialize: function(bus, options) {
                   L.FeatureGroup.prototype.initialize.apply(this, []);
                   this.bus = bus;

                   this.options = options || {
                       busLength: 10,
                       busWidth: 3
                   };

                   this.bindPopup("popup!");

                   this.on("click", function(e) {
                       console.log(this.bus);
                   })
                       .on("popupopen", this.onPopupOpen);
               },

               onAdd: function(map) {
                   this._map = map;

                   this.busShape = L.polygon(this._busPoints(),
                                             {
                                                 color: "#000",
                                                 weight: 2,
                                                 fill: true,
                                                 fillColor: "white",
                                                 fillOpacity: 0.9

                                             })
                       .addTo(this);
                   this.arrowShape =
                       L.polyline(this._arrowPoints(), {color: "#ff0000",
                                                        weight: 3})
                        .addTo(this);
               },

               onPopupOpen: function(e) {
                   e.popup.setContent($u.vehicleSummary(this.bus));
               },

               getCenter: function() {
                   return L.latLng(+this.bus.lat, +this.bus.lon);
               },

               /**
                * Create and return a function for transforming a point from the
                * coordinate system of the bus to latitude and longitude.
                *
                * @param {L.CRS} [crs=L.CRS.EPSG3857]
                * @return {Function} A function that takes an array [x, y] and
                * returns a L.LatLng instance.
                */
               makeTransform: function(crs) {
                   crs = crs || L.CRS.EPSG3857;
                   var cached = this._cachedTransform;
                   if (cached && cached.crs == crs.code &&
                       cached.heading == this.bus.heading) {
                       return cached.transform;
                   }

                   var bus = this.bus,
                       degs = (360-(bus.heading-90))%360,
                       rads = degs/180 * Math.PI,
                       busLatLng = L.latLng(+bus.lat, +bus.lon),
                       centerPoint = crs.latLngToPoint(busLatLng, 15),
                       // cached valued for calculation:
                       cx = centerPoint.x,
                       cy = centerPoint.y,
                       sinRads = Math.sin(-rads),
                       cosRads = Math.cos(-rads);

                   var transform = function(point) {
                       var x = point[0] * cosRads - point[1] * sinRads,
                           y = point[0] * sinRads + point[1] * cosRads;

                       return crs.pointToLatLng(L.point(cx+x, cy+y), 15);
                   };

                   this._cachedTransform = {
                       crs: crs.code,
                       transform: transform,
                       heading: bus.heading
                   };

                   return transform;
               },

               _busPoints: function() {
                   var transform = this.makeTransform(),
                       hl = this.options.busLength/2,
                       hw = this.options.busWidth/2,
                       polyPoints = [[-hl, hw], [hl, hw],
                                     [hl, -hw], [-hl, -hw]];

                   return polyPoints.map(transform);
               },

               _arrowPoints: function() {
                   var transform = this.makeTransform(),
                       points = [[5, 0], [10, 0], [8, 2], [10, 0], [8, -2]];

                   return points.map(transform);
               },

               update: function(bus) {
                   this.bus = bus;

                   this.busShape.setLatLngs(this._busPoints());
                   this.arrowShape.setLatLngs(this._arrowPoints());
               }
           });
       });
