define(["underscore"], function(_) {
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
            return ["vehicle id: ", vehicle.id, "<br/> ",
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

        /**
         * Returns the complement of a boolean function.
         *
         * @param {Function} fn
         */
        not: function(fn) {
            return function() {
                return !fn.apply(this, arguments);
            };
        },

        stamp: function() {
            return new Date().valueOf()/1000;
        },

        /**
         * A line segment from point A to point B is equivalent to a segment
         * from B to A. Always perform a typographic sort on the stringified
         * points so that this is true.
         */
        pairString: function(pointA, pointB) {
            var aStr = pointA.toString(),
                bStr = pointB.toString();

            if (aStr < bStr)
                return aStr + "_" + bStr;
            else
                return bStr + "_" + aStr;
        },

        newPairs: function(pairSet, pairs, newSet) {
            var newList = [];

            if (!newSet) newSet = {};

            for (var i = 0, l = pairs.length; i < l; i++) {
                var pair = pairs[i],
                    pStr = $u.pairString(pair);

                if (!pairSet[pStr] && !newSet[pStr]) {
                    newSet[pStr] = pair;
                    newList.push(pair);
                }

                return newList;
            }
        },

        partition: function(path, size) {
            var out = [];

            if (!size) size = 2;

            for (var i = 0, l = path.length-size+1; i < l; i++)
                out.push(path.slice(i, i+size));

            return out;
        },

        /**
         * Given an array of pairs, create an array of paths.
         */
        joinPairs: function(pairs) {
            var ends = {},
                paths = {},
                nextIndex = 0;

            _.each(pairs, function(pair) {
                var a = pairs[0],
                    b = pairs[1], 
                    pathrefA = ends[a],
                    pathrefB = ends[b],
                    idx, idxB, pathA, pathB;

                if (pathrefA) {
                    idx = pathrefA[0];
                    pathA = paths[idx];

                    if (pathrefB) {
                        // They're both endpoints, so this segment joins the
                        // existing paths.
                        idxB = pathrefB[0];
                        pathB = paths[idxB];
                        var newPath, newA, newB;

                        if (pathrefA[1]) {
                            newB = pathA[pathA.length-1];
                            // Join the front of path A...
                            if (pathrefB[1]) {
                                newA = pathB[pathB.length-1];
                                // .. to the front of path B:
                                newPath = pathB.reverse().concat(pathA);
                            } else {
                                newA = pathB[0];
                                // .. to the back of path B:
                                newPath = pathB.concat(pathA);
                            }
                        } else {
                            newA = pathA[0];
                            // Join the back of path A...
                            if (pathrefB[1]) {
                                newB = pathB[pathB.length-1];
                                // ... to the front of path B:
                                newPath = pathA.concat(pathB);
                            } else {
                                newB = pathB[0];
                                // ... to the end of path B:
                                newPath = pathA.concat(pathB.reverse());
                            }
                        }

                        delete ends[a];
                        delete ends[b];
                        ends[newA] = [idx, true];
                        ends[newB] = [idx, false];
                        delete paths[idxB];
                    } else {
                        if (pathrefA[1])
                            pathA.unshift(b);
                        else
                            pathA.push(a);
                        ends[b] = pathrefA;
                        delete ends[a];
                    }
                } else {
                    if (pathrefB) {
                        pathB = paths[pathrefB[0]];

                        // True if the point should be inserted at the front:
                        if (pathrefB[1])
                            pathB.unshift(a);
                        else
                            pathB.push(a);

                        ends[a] = pathrefB;
                        // B is no longer an end
                        delete ends[b];
                    } else {
                        // Both ends are new:
                        idx = nextIndex++;
                        ends[a] = [idx, true];
                        ends[b] = [idx, false];
                        paths[idx] = [a, b];
                    }
                }
            });

            return _.values(paths);
            return paths;
        }
    };

    return $u;
});
