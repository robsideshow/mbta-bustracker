define(["leaflet", "jquery", "underscore", "utils"],
       function(L, $, _, $u) {
           function samePoint(tp1, tp2) {
               return tp1.lat == tp2.lat &&
                   tp1.lon == tp2.lon;
           }

           /**
            * Based on an array of timepoints (where a timepoint has lat, lon,
            * and time keys) and a timestamp (seconds since the epoch),
            * calculate the position at that time.
            *
            * @param {Object[]} timepoints
            * @param {number} [stamp]
            */
           function calculateTimepointPosition(timepoints, stamp) {
               // We can't calculate a meaningful position without the
               // timepoints.
               if (!timepoints) return null;

               if (!stamp) stamp = $u.stamp();

               var timepoint, lastTimepoint, i = 0;
               while ((timepoint = timepoints[i++])) {
                   if (timepoint.time > stamp)
                       break;
                   else
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

           function totalDist(start, timepoints) {
               var total = 0, last = start;
               for (var i = 0, l = timepoints.length; i < l; i++) {
                   var timepoint = timepoints[i];
                   total += Math.sqrt(Math.pow(timepoint.lat - start.lat, 2) +
                                      Math.pow(timepoint.lon - start.lon, 2));

                   last = timepoint;
               }
               return total;
           }

           return L.FeatureGroup.extend({
               /**
                * @param {Backbone.Model} bus
                *
                * @param {Object} [options]
                */
               initialize: function(bus, options) {
                   L.FeatureGroup.prototype.initialize.apply(this, []);
                   this.bus = bus;
                   this.options = options || {};
                   this._lastTimestamp = 0;

                   var self = this;
                   this.on("click", function(e) {
                       if (e.originalEvent.shiftKey) {
                           var pathMarkers = 
                                   $.map(this.bus.timepoints,
                                         function(timepoint) {
                                             return L.circle(
                                                 [timepoint.lat, timepoint.lon], 1)
                                                 .addTo(self);
                                         });
                       }
                   });

                   bus.on("change", this.update, this);
               },

               // Returns the bus as a dictionary of attributes.
               getBus: function() {
                   return this.bus && this.bus.attributes;
               },

               makeIcon: function(bus, rot) {
                   var route = this.bus.getRoute(),
                       routeName = route.getName(),
                       color = route.getColor();

                   if (routeName.indexOf("Green-") > -1) {
                       routeName = routeName.slice(routeName.indexOf("-")+1);
                   } else if (routeName == "Blue Line" || 
                              routeName == "Orange Line" || 
                              routeName == "Red Line") {
                       routeName = "T";
                   } else if (routeName == "Mattapan Trolley") {
                       routeName = "MT";
                   } else if (routeName == "Silver Line Waterfront") {
                       routeName = "SLW";
                   }

                   var html = "<div class='bus-marker' style='transform: rotate(" + rot +
                           "rad); border-color: " + color + "; color: " + color + "'>" +
                           routeName + "</div>";

                   return L.divIcon({
                       className: "bus-marker-container",
                       html: html
                   });
               },

               updateIcon: function(bus, rot) {
                   var busDiv = this.busMarker._icon.firstElementChild,
                       color = this.bus.getRoute().getColor();

                   busDiv.style = "transform: rotate(" + rot +
                       "rad); border-color: " + color + "; color: " +
                       color + ";";
               },

               // Called by Leaflet when the marker is added to the map.
               onAdd: function(map) {
                   var bus = this.getBus();
                   this._map = map;
                   this._update(bus);
                   this.busMarker = L.marker(
                       this._position,
                       {
                           icon: this.makeIcon(bus, -this._busTheta)
                       }).addTo(this);
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

               update: function(bus) {
                   // Check if the new bus's LRP is newer than the old bus's
                   // LRP; if not, ignore it.
                   if (bus.get("timestamp") <= this._lastTimestamp)
                       return;

                   this._update(bus.attributes);
               },

               _update: function(bus) {
                   this._lastTimestamp = bus.timestamp;
                   if (!this._position) {
                       this._position =
                           calculateTimepointPosition(
                               bus.timepoints, $u.stamp()) ||
                           L.latLng(bus.lat, bus.lon);
                   }
                   if (!this._busTheta) {
                       var degs = (360-(bus.heading-90))%360;
                       this._busTheta = degs/180 * Math.PI;
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
                   if (this._findNextTimePoint(bus))
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
               _findNextTimePoint: function(bus) {
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
                                   L.latLng(bus.lat, bus.lon),
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

                   var bus = this.getBus(),
                       point = this._findNextTimePoint(bus);

                   // Time points exhausted!
                   if (!point)
                       this._wantsUpdate = false;

                   var oldLL = this._position;
                   this._position = L.latLng(oldLL.lat+this._latSpeed*dt,
                                             oldLL.lng+this._lngSpeed*dt);
                   this.busMarker.setLatLng(this._position);
                   this.updateIcon(bus, -this._busTheta);
               }
           });
       });
