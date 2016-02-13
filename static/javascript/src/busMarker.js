define(["leaflet"], function(L) {
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

            this.busShape = L.polygon(this._calculatePoints(),
                                      {
                                          color: "#000",
                                          weight: 2,
                                          fill: true,
                                          fillColor: "white"
                                      })
                .addTo(this);
            this.centerPoint = L.circle(this.getCenter(), 2).addTo(this);
        },

        onPopupOpen: function(e) {
            e.popup.setContent("Heading: " + this.bus.heading + "<br>" +
                               "Rotation: " + (360-(this.bus.heading-90))%360 + "<br>" +
                               "ID: " + this.bus.id + "<br>" +
                               "dirTag: " + this.bus.dirTag);
        },

        getCenter: function() {
            return L.latLng(+this.bus.lat, +this.bus.lon);
        },

        _calculatePoints: function() {
            var bus = this.bus,
                degs = (360-(bus.heading-90))%360,
                rads = degs/180 * Math.PI,
                crs = L.CRS.EPSG3857,
                busLatLng = L.latLng(+bus.lat, +bus.lon),
                centerPoint = crs.latLngToPoint(busLatLng, 15),
                // cached valued for calculation:
                cx = centerPoint.x,
                cy = centerPoint.y,
                hl = this.options.busLength/2,
                hw = this.options.busWidth/2,
                polyPoints = [[-hl, hw], [hl, hw], [hl, -hw], [-hl, -hw]],
                sinRads = Math.sin(-rads),
                cosRads = Math.cos(-rads);

            return polyPoints.map(function(point) {
                var x = point[0] * cosRads - point[1] * sinRads,
                    y = point[0] * sinRads + point[1] * cosRads;

                return crs.pointToLatLng(L.point(cx+x, cy+y), 15);
            });



            function convert(rads, lat, lng, d) {
                var newLat = Math.asin(Math.sin(lat)*Math.cos(d) +
                                       Math.cos(lat)*Math.sin(d) * Math.cos(rads)),
                    newLng = (lng -
                              Math.asin(rads*Math.sin(d)/Math.cos(lat))+Math.PI) % 2*Math.PI - Math.PI;
                return [newLat, newLng];
            }

            return [[]];
        },

        update: function(bus) {
            this.bus = bus;

            var points = this._calculatePoints();
            this.busShape.setLatLngs(points);
            this.centerPoint.setLatLng(this.getCenter());
        }
    });
});
