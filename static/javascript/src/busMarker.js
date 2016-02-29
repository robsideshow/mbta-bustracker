define(["leaflet", "jquery", "utils"],
       function(L, $, $u) {
           function samePoint(tp1, tp2) {
               return tp1.lat == tp2.lat &&
                   tp1.lon == tp2.lon;
           }

           function calculateTimepointPosition(timepoints, stamp) {
               var timepoint, lastTimepoint;
               for (var i = 0, l = timepoints.length; i < l; i++) {
                   timepoint = timepoints[i];
                   if (timepoint.time > stamp)
                       break;

                   lastTimepoint = timepoint;
               }

               if (lastTimepoint) {
                   if (timepoint) {
                       // Calculate the progress along the segment between
                       // lastTimepoint and timepoint:
                       var progress = (stamp - lastTimepoint.time)/
                               (timepoint.time - lastTimepoint.time),
                           dLat = timepoint.lat - lastTimepoint.lat,
                           dLng = timepoint.lon - lastTimepoint.lon;

                       return L.latLng(
                           lastTimepoint.lat + dLat*progress,
                           lastTimepoint.lon + dLng*progress);
                   } else {
                       // We don't have any more information about the vehicle's
                       // next position, so use the coordinates of its last
                       // timepoint.
                       return L.latLng(lastTimepoint.lat, lastTimepoint.lon);
                   }
               }

               return null;
           }

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
                   this.update(bus);

                   this.options = options || {
                       busLength: 10,
                       busWidth: 3
                   };

                   this.bindPopup("popup!");

                   var self = this;
                   this.on("click", function(e) {
                       console.log(this.bus);
                       if (e.originalEvent.shiftKey) {
                           var pathMarkers = 
                           $.map(this.bus.timepoints,
                                  function(timepoint) {
                                      return L.circle(
                                          [timepoint.lat, timepoint.lon], 1)
                                          .addTo(self);
                                  });
                           this.once("popupclose", function() {
                               $.each(pathMarkers,
                                      function(i, m) {
                                          self.removeLayer(m);
                                      });
                           });
                       }
                       })
                       .on("popupopen", this.onPopupOpen);
               },

               makeIcon: function(bus, rot) {
                   var html = [
                       "<div class='bus-marker' ",
                       "style='transform: rotate(", rot, "rad)'>",
                       "</div>"
                   ].join("");

                   return L.divIcon({
                       className: "bus-marker-container",
                       html: html
                   });
               },

               // Called by Leaflet when the marker is added to the map.
               onAdd: function(map) {
                   this._map = map;

                   var html = "<div class='bus-marker'></div>";

                   this.busMarker = L.marker(
                       this.busLatLng(), {icon: this.makeIcon(null, 0)})
                        .addTo(this);

                   // this.busCircle = L.circle(this.busLatLng(), 10, {
                   //     color: "black",
                   //     weight: 1,
                   //     fill: true,
                   //     fillColor: "orange",
                   //     fillOpacity: 1
                   // }).addTo(this);

                   // this.busShape = L.polygon(this._busPoints(),
                   //                           {
                   //                               color: "#000",
                   //                               weight: 2,
                   //                               fill: true,
                   //                               fillColor: "white",
                   //                               fillOpacity: 0.9

                   //                           })
                   //     .addTo(this);
                   // this.arrowShape =
                   //     L.polyline(this._arrowPoints(), {color: "#ff0000",
                   //                                      weight: 3})
                   //      .addTo(this);
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
                * @return {Function} A function that takes an array [x, y] and
                * returns a L.LatLng instance.
                */
               makeTransform: function() {
                   var cached = this._cachedTransform,
                       rads = this._busTheta;

                   if (cached && rads == cached.theta) {
                       return cached.transform;
                   }

                   var bus = this.bus,
                       centerPoint = this._pixelPosition,
                       // cached valued for calculation:
                       cx = centerPoint.x,
                       cy = centerPoint.y,
                       sinRads = Math.sin(-rads),
                       cosRads = Math.cos(-rads);

                   var transform = function(point) {
                       var x = point[0] * cosRads - point[1] * sinRads,
                           y = point[0] * sinRads + point[1] * cosRads;

                       return L.CRS.EPSG3857.pointToLatLng(L.point(cx+x, cy+y), 15);
                   };

                   this._cachedTransform = {
                       transform: transform,
                       theta: rads
                   };

                   return transform;
               },

               busLatLng: function() {
                   return this._position;
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
                   // Check if the new bus's LRP is newer than the old bus's
                   // LRP; if not, ignore it.
                   if (this.bus && bus.timestamp <= this.bus.timestamp)
                       return;
                   console.log("bus updated!");

                   this.bus = bus;
                   if (!this._position) {
                       this._position =
                           calculateTimepointPosition(
                               bus.timepoints, $u.stamp()) ||
                           L.latLg(bus.lat, bus.lon);
                   }

                   var lastNextPoint = this._nextPoint,
                       timepoints = bus.timepoints;

                   // If there is already a next point set, slice the new
                   // timepoint array up until that point.
                   if (lastNextPoint) {
                       timepoints = $u.dropWhile(function(pt) {
                           return !samePoint(pt, lastNextPoint);
                       }, bus.timepoints);
                   }
                   this._pathCache = timepoints;

                   this._nextPoint = null;
                   if (this._findNextTimePoint())
                       this._wantsUpdate = true;
               },

               /**
                * @private
                * Destructively traverses the cached array of timepoints stored
                * in _pathCache until the next point (in time) is found.  If
                * there is already a non-obsolete stored in _nextPoint, simply
                * returns that.  If there is no _nextPoint, or if it is
                * obsolete, caches several values, advances _nextPoint, and
                * returns the timepoint.
                */
               _findNextTimePoint: function() {
                   var now = new Date().valueOf()/1000;
                   if (this._nextPoint) {
                       if (this._nextPoint.time > now)
                           return this._nextPoint;
                       this._nextPoint = null;
                   }
                   if (this._pathCache) {
                       var timepoint;
                       while ((timepoint = this._pathCache.shift())) {
                           if (timepoint.time > now)
                               break;
                       }
                       this._nextPoint = timepoint;
                       if (timepoint) {
                           var ll = L.latLng(timepoint.lat, timepoint.lon),
                               busLL = this._position ||
                                   L.latLng(this.bus.lat, this.bus.lon),
                               dt = timepoint.time - now,
                               dLat = ll.lat - busLL.lat,
                               dLng = ll.lng - busLL.lng;

                           this._latSpeed = dLat/dt;
                           this._lngSpeed = dLng/dt;
                           this._position = busLL;
                           this._busTheta = Math.atan2(dLat, dLng);
                           return this._nextPoint;
                       }
                   }

                   return null;
               },

               tick: function(dt, now) {
                   if (!this._wantsUpdate) return;

                   var point = this._findNextTimePoint();

                   // Time points exhausted!
                   if (!point)
                       this._wantsUpdate = false;

                   var oldLL = this._position,
                       newLL = L.latLng(oldLL.lat+this._latSpeed*dt,
                                        oldLL.lng+this._lngSpeed*dt);
                   this._position = newLL;

                   // this.busShape.setLatLngs(this._busPoints());
                   // this.arrowShape.setLatLngs(this._arrowPoints());
                   //this.busCircle.setLatLng(newLL);
                   this.busMarker.setLatLng(newLL);
                   this.busMarker.setIcon(
                       this.makeIcon(this.bus, -this._busTheta));
               }
           });
       });
