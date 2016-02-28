define([], function() {
    var $u = {
        directions: ["north", "northeast", "east", "southeast",
                     "south", "southwest", "west", "northwest",
                     "north"],
        directionsShort: ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"],
        
        readableHeading: function(heading) {
            return this.directions[Math.round(heading%360/45)];
        },

        readableHeadingShort: function(heading) {
            return this.directionsShort[Math.round(heading%360/45)];
        },

        makeTransformFn: null,

        vehicleSummary: function(vehicle) {
            return [
                vehicle.type == "subway" ? vehicle.route :
                    ((vehicle.direction == "1" ? "Inbound " : "Outbound ") + "Route " + vehicle.route),
                vehicle.type,
                "heading",
                $u.readableHeading(vehicle.heading),
                "toward",
                vehicle.destination
            ].join(" ");
        },

        bind: function(fn, context) {
            return function() {
                return fn.apply(context, arguments);
            };
        },

        dropWhile: function(fn, coll) {
            var i = 0, l = coll.length;
            while (i < l && fn(coll[i])) i++;
            return coll.slice(i);
        },

        not: function(fn) {
            return function() {
                return !fn.apply(this, arguments);
            };
        }
    };

    return $u;
});
