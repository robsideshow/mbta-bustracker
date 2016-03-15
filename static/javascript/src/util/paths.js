define(["underscore", "utils"],
       function(_) {
           var paths = {
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

               /**
                * Given a pairSet (an object with pairs as keys and boolean true
                * values) and an array of pairs
                *
                * @param {Object} pairSet An object with pair strings as keys and
                * boolean true values representing the seen pairs
                * @param {number[][]} pairs An array of [lat, long] pairs
                * @param {Object} [newSet] A pair set whose keys S - N, where S is the
                * set of keys in pairSet and N is set(pairs)
                */
               newPairs: function(pairSet, pairs, newSet) {
                   var newList = [];

                   if (!newSet) newSet = {};

                   for (var i = 0, l = pairs.length; i < l; i++) {
                       var pair = pairs[i],
                           pStr = paths.pairString(pair);

                       if (!pairSet[pStr] && !newSet[pStr]) {
                           newSet[pStr] = pair;
                           newList.push(pair);
                       }
                   }

                   return newList;
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
               }
           };

           return paths;
       });
