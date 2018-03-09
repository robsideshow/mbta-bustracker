define(["underscore", "leaflet", "utils", "config"],
       function(_, L, $u, config) {
           var $p, paths;
           $p = paths = {
               /**
                * A line segment from point A to point B is equivalent to a segment
                * from B to A. Always perform a typographic sort on the stringified
                * points so that this is true.
                *
                * @param {Number[]} pointA A [lat, long] point
                * @param {Number[]} pointB A [lat, long] point
                *
                * @returns {String} 
                */
               pairString: function(pointA, pointB) {
                   var aStr = pointA.toString(),
                       bStr = pointB.toString();

                   if (aStr < bStr)
                       return aStr + "_" + bStr;
                   else
                       return bStr + "_" + aStr;
               },

               /**
                * Creates a 'pair set' that can be used to test if a pair of
                * points has already been encountered.
                *
                * @param {Number[][]} path An array of [lat, long] points
                * representing a path.
                * @param {Object} [init={}] If provided, the init object will be
                * extended and returned, rather than a newly created object
                *
                * @returns {Object} An object with keys corresponding to each
                * pair of points in the path
                */
               pairSet: function(path, init) {
                   var pairs = $u.step(path, paths.pairString, 2, 1);
                   return _.reduce(pairs,
                                   function(ps, pairstring) {
                                       ps[pairstring] = true;
                                       return ps;
                                   }, init || {});
               },

               makePairs: function(path) {
                   return $u.partition(path, 2, 1);
               },

               /**
                * Given a pairSet (an object with pairs as keys and boolean true
                * values) and an array of pairs
                *
                * @param {Object} pairSet An object with pair strings as keys and
                * truthy values representing the seen pairs. This object will be
                * modified in place.
                * @param {number[][][]} pairs An array of [[latA, longA], [latB,
                * longB]] pairs
                */
               newPairs: function(pairSet, pairs) {
                   var newList = [];

                   for (var i = 0, l = pairs.length; i < l; i++) {
                       var pair = pairs[i],
                           pStr = paths.pairString(pair[0], pair[1]);

                       if (!pairSet[pStr]) {
                           pairSet[pStr] = pair;
                           newList.push(pair);
                       }
                   }

                   return newList;
               },


               /**
                * Given an array of pairs, create an array of paths from those
                * pairs.
                *
                * @param {Number[][][]} pairs An array of unique point pairs
                * [pointA, pointB], where each point is a 2-tuple (array) of
                * lat, long.
                * @param {Number[][]} [seedPath] If provided, this specifies the
                * initial path to use.
                */
               joinPairs: function(pairs, seedPath) {
                   // ends: keeps track of end points; keys are stringified
                   // points, values are arrays of [pathIndex, front]
                   var ends = {},
                       paths = {},
                       pairSet = {},
                       nextIndex = 0;

                   if (seedPath) {
                       var seedPairs = $u.partition(seedPath, 2, 1);

                       // Add all the seed pairs to the pairSet.
                       _.each(seedPairs, function(pair) {
                           pairSet[$p.pairString(pair[0], pair[1])] = pair;
                       });

                       // Add the ends:
                       var start = seedPath[0],
                           end = seedPath[seedPath.length-1];
                       paths[0] = seedPath;
                       ends[start] = [0, true];
                       ends[end] = [0, false];
                       nextIndex = 1;
                   }

                   _.each(pairs, function(pair) {
                       var a = pair[0],
                           b = pair[1], 
                           pathrefA = ends[a],
                           pathrefB = ends[b],
                           ps = $p.pairString(a, b),
                           idx, idxB, pathA, pathB;

                       if (pairSet[ps]) return;

                       pairSet[ps] = pair;

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
                               paths[pathrefA[0]] = newPath;
                           } else {
                               if (pathrefA[1])
                                   pathA.unshift(b);
                               else
                                   pathA.push(b);
                               ends[b] = pathrefA;
                               delete ends[a];
                           }
                       } else if (pathrefB) {
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
                   });

                   return _.values(paths);
               },

               /**
                * For any timepoints at the front of the array that are in the
                * past, recalculates the estimated arrival time based on the
                * estimated arrival time of the first timepoint that's in the
                * future.
                *
                * @param {Number} stamp
                * @param {Number} start.lat
                * @param {Number} start.lon
                * @param {Object[]} timepoints
                *
                * @returns {Object[]} A copy of the timepoints array, with some
                * points' time modified
                */
               fastTimepoints: function(stamp, start, timepoints) {
                   var newPath = [],
                       idx = $u.findIndex(function(timepoint) {
                           return timepoint.time > stamp;
                       });

                   // If the first timepoint is in the future, or if there is no
                   // matching timepoint, don't do anything.
                   if (idx > 0) {
                       var target = timepoints[idx],
                           lastPoint = start, totalDist, i = 0, point;

                       while (i < idx && (point = timepoints[i++])) {
                           var dist = Math.sqrt(
                               Math.pow(point.lat - lastPoint.lat, 2) +
                                   Math.pow(point.lon - lastPoint.lon, 2));
                           point.dist = dist;
                           totalDist += dist;
                           lastPoint = point;
                       }

                       i = 0;

                       var deltaT = target.time - stamp;

                       while(i < idx && (point = timepoints[i++])) {
                           var newTime = stamp + (deltaT * point.dist/totalDist);
                           newPath.push({lat: point.lat,
                                         lon: point.lon,
                                         time: newTime});
                       }
                   }

                   return newPath.concat(timepoints.slice(idx));
               },

               /**
                * Based on an array of timepoints (where a timepoint has lat, lon,
                * and time keys) and a timestamp (seconds since the epoch),
                * calculate the position at that time.
                *
                * @param {Object[]} timepoints
                * @param {number} [stamp]
                *
                * @returns {L.LatLng|null}
                */
               calculateTimepointPosition: function(timepoints, stamp) {
                   // We can't calculate a meaningful position without the
                   // timepoints.
                   if (!timepoints) return null;

                   if (!stamp) stamp = $u.stamp();

                   var timepoint, lastTimepoint, i = -1;
                   while ((timepoint = timepoints[++i])) {
                       if (timepoint.time > stamp)
                           break;
                       else
                           lastTimepoint = timepoint;
                   }

                   if (lastTimepoint) {
                       var rads, dLat, dLng;
                       if (timepoint) {
                           // Calculate the progress along the segment between
                           // lastTimepoint and timepoint:
                           var progress = (stamp - lastTimepoint.time)/
                                   (timepoint.time - lastTimepoint.time);
                           dLat = timepoint.lat - lastTimepoint.lat;
                           dLng = timepoint.lon - lastTimepoint.lon;

                           return [L.latLng(lastTimepoint.lat + dLat*progress,
                                            lastTimepoint.lon + dLng*progress),
                                   $p.llRads(dLat, dLng)];
                       } else {
                           // We don't have any more information about the vehicle's
                           // next position, so use the coordinates of its last
                           // timepoint and the heading from the penultimate
                           // timepoint to the last timepoint.
                           var penTimepoint = timepoints[i-2];

                           if (penTimepoint) {
                               dLat = lastTimepoint.lat - penTimepoint.lat;
                               dLng = lastTimepoint.lon - penTimepoint.lon;
                               rads = $p.llRads(dLat, dLng);
                           }

                           return [L.latLng(lastTimepoint.lat,
                                            lastTimepoint.lon), rads];
                       }
                   }

                   return null;
               },

               normalMaker: function(pair, normal, scaler) {
                   var a = pair[0],
                       b = pair[1],
                       vec = (normal || paths.normal)(a, b),
                       xnorm = vec[0],
                       ynorm = vec[1],
                       xa = a[0],
                       ya = a[1],
                       xb = b[0],
                       yb = b[1],
                       adjustedPair = pair;

                   if (!scaler)
                       scaler = function(i) { return Math.pow(-1, i)*i; };

                   return function(i) {
                       // The normal vector vec * scale is added to the
                       // last adjustedPair to give the next adjusted
                       // pair.
                       var scale = scaler(i);
                       // calculate the adjusted pair:
                       return [[xa+(xnorm*scale),
                                ya+(ynorm*scale)],
                               [xb+(xnorm*scale),
                                yb+(ynorm*scale)],
                              scale];
                   };
               },

               /**
                * Calculate a new path from the given path that will eliminate
                * overlaps with existing paths. For each line segment in the
                * path, and for each candidate translation of the line segment,
                * a key is generated. That key is used to determine whether the
                * path segment is occupied or not. The values in segMap are
                * arrays of ids, where the first id is the "winner".
                *
                * @param {Object} segMap - an object that is used to determine
                * if a path segment has already been encountered.
                * @param {Number[][]} path - an array of points representing a
                * path
                * @param {} id - a unique identifier
                * @param {Function} normal - a function of two points that
                * returns a normal vector
                *
                * @returns {Number[][]}
                */
               placePath: function(segMap, path, id, normal) {
                   // Break the path into line segments: 2-tuples of 2-tuples
                   var segments = $u.partition(path, 2, 1),
                       outPath = [],
                       lastPair = null,
                       lastPoint = null,
                       scaler = null;

                   _.each(segments, function(pair, i) {
                       // For each pair of points...

                       // Create a unique string from the pair:
                       var k = paths.pairString(pair[0], pair[1]),
                           adjustedPair = pair;

                       if (segMap[k]) {
                           // The pair has already been used! Find a new one.
                           segMap[k].push(id);

                           // a vector normal to the segment
                           var offsetPair = paths.normalMaker(pair, normal, scaler),
                               j = 1;        // the loop counter

                           do {
                               adjustedPair = offsetPair(j++);
                               k = paths.pairString(adjustedPair[0],
                                                    adjustedPair[1]);
                           } while(segMap[k]);

                           if (!scaler) {
                               scaler = adjustedPair[2] > 0 ?
                                   function(i) { return i; } : function(i) { return -i; };
                           }

                           // We should now have an unused segment!
                       }

                       segMap[k] = [id];

                       if (lastPair && (lastPair[2] || adjustedPair[2])) {
                           var point = paths.intersection(
                               lastPair[0][1], lastPair[0][0],
                               lastPair[1][1], lastPair[1][0],
                               adjustedPair[0][1], adjustedPair[0][0],
                               adjustedPair[1][1], adjustedPair[1][0]);
                           if (point) {
                               outPath.pop();
                               outPath.push([point[1], point[0]], adjustedPair[1]);
                           } else {
                               outPath.push(adjustedPair[0],
                                            adjustedPair[1]);
                           }
                       } else {
                           // Don't push duplicate points.
                           if (!_.isEqual(lastPoint, adjustedPair[0]))
                               outPath.push(adjustedPair[0]);
                           outPath.push(adjustedPair[1]);
                       }

                       lastPair = adjustedPair;
                   });

                   return outPath;
               },

               /**
                * Removes the line segments in path from the segment map.
                *
                * @param {Object} segMap - See paths.placePath
                * @param {Number[][]} path - an array of points
                * @param id - an identifier used to determine if the path placed
                *    in a certain position 'matches'
                *
                * @returns {Object} a map of ids to counts, where the count is the number
                * of line segments belonging to an id that can be replaced now
                * that path is removed
                */
               removePath: function(segMap, path, id) {
                   var segments = $u.partition(path, 2, 1),
                       replacePaths = {};

                   _.each(segments, function(pair, i) {
                       var k = paths.pairString(pair[0], pair[1]),
                           ids = segments[k],
                           adjustedPair = pair;

                       if (!ids) return;

                       if (ids[0] !== id) {
                           var offsetPair = paths.normalMaker(pair,
                                                              paths.llNormal),
                               j = 1;

                           do {
                               adjustedPair = offsetPair(j++);
                               k = paths.pairString(adjustedPair[0],
                                                    adjustedPair[1]);
                               ids = segments[k];
                           } while (ids && ids[0] !== id);

                           // A matching segment was not found in the segMap
                           if (!ids) return;
                       }

                       if (ids.length === 1) {
                           delete segMap[k];
                       } else {
                           // Since we're not (yet) moving the other
                           // segments when a segment is removed, null out
                           // the position that this segment previously
                           // occupied.
                           ids[0] = null;
                       }
                   });

                   return replacePaths;
               },

               // Like llNormal, but without conversion to lat/long
               normal: function(mag, point1, point2) {
                   var dx = point2[1] - point1[1],
                       dy = point2[0] - point1[0],
                       rads = Math.atan2(dy, dx)+(Math.PI/2);

                   return [mag * Math.cos(rads),
                           mag * Math.sin(rads)];
               },

               /**
                * Create a vector perpendicular to the line segment bounded demarked by
                * ll1 and ll2.
                *
                */
               llNormal: function(ll1, ll2) {
                   var xUnit = 2, yUnit = 0;

                   var rads = $p.llRads(ll2[1] - ll1[1], ll2[0] - ll1[0]) + Math.PI/2,
                       sinRads = Math.sin(rads),
                       cosRads = Math.cos(rads),
                       dxNorm = xUnit * cosRads - yUnit * sinRads,
                       dyNorm = xUnit * sinRads + yUnit * cosRads,
                       dlatNorm = dyNorm/82600,
                       dlongNorm = dxNorm/111120;

                   return [dlatNorm, dlongNorm];
               },

               llRads: function(dLat, dLng) {
                   var dx = config.longMeters*dLat,
                       dy = config.latMeters*dLng;

                   return Math.atan2(dy, dx);
               },

               /**
                * finds an intersection point for two line segments, if one
                * exists that lies "in bounds". if the line segments lie on
                * parallel lines, there is no intersection. the intersection is
                * considered "in bounds" if the vector from the start point of
                * seg1 to the intersection is a positive scalar multiple of the
                * vector from the start to end point of seg1 and the vector from
                * the end point of seg2 to the intersection is a positive scalar
                * multiple of the vector from the end point of seg2 to the start
                * point.
                *
                * @returns {Number[]}
                */
               intersection: function(start1_x, start1_y, end1_x, end1_y,
                                      start2_x, start2_y, end2_x, end2_y) {
                   var dy1 = end1_y - start1_y,
                       dx1 = end1_x - start1_x,
                       dx2 = end2_x - start2_x,
                       m = dy1/dx1,
                       n = (end2_y - start2_y)/dx2,
                       denom = m - n;

                   if (denom === 0) return null;

                   var intercept1 = start1_y - m*start1_x,
                       intercept2 = start2_y - n*start2_x,
                       x = (intercept2 - intercept1)/denom,
                       y = m*x + intercept1,
                       pos1 = (x-start1_x)/dx1,
                       pos2 = (end2_x-x)/dx2;

                   if (pos1 >= 0 && pos2 >= 0)
                       return [x, y];

                   return null;
               }
           };

           return paths;
       });
