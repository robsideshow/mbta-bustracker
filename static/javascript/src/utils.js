define(["jquery", "underscore"], function($, _) {
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

        log: console ? console.log : _.noop,

        makeTransformFn: null,

        dropWhile: function(fn, coll, n) {
            coll = _.toArray(coll);
            var i = 0, l = coll.length;
            while (i < l && fn(coll[i])) i++;
            return coll.slice(i, n || l);
        },

        findIndex: function(fn, coll) {
            coll = _.toArray(coll);
            var i = -1, l = coll.length;
            while ((++i) < l)
                if (fn(coll[i])) return i;
            return -1;
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
         * @param {Number} delta The (positive or negative) time difference in
         * seconds.
         */
        relativeTime: function(delta) {
            return {
                future: delta > 0,
                delta: Math.abs(delta),
                hours: Math.floor(delta / 3600),
                minutes: Math.floor((delta % 3600) / 60),
                seconds: Math.floor(delta % 60)
            };
        },

        /**
         * @param {Number} delta A time difference in seconds
         */
        briefRelativeTime: function(delta) {
            var r = $u.relativeTime(delta),
                pieces = r.hours ? [r.hours] : [];
            pieces.push($u.rpad(r.minutes, 2, "0"),
                        $u.rpad(r.seconds, 2, "0"));
            var timestr = pieces.join(":");

            return timestr + (r.future ? " from now" : " ago");
        },

        briefRelTime: function(delta) {
            var r = $u.relativeTime(delta),
                pieces = [];

            if (r.hours)
                pieces.push(r.hours + "h");
            if (r.minutes)
                pieces.push(r.minutes + "m");
            if (!r.hours && r.seconds)
                pieces.push(r.seconds + "s");

            return pieces.join(", ");
        },

        /**
         * Pad string s to a length of n by prepending the character c.
         */
        rpad: function(s, n, c) {
           if (!c) c = " ";
            else c = c[0];

            var i = n - (""+s).length;

            while (i-- > 0) s = c + s;

            return s;
        },

        randInt: function(max, min) {
            if (min === undefined)
                min = 0;

            return Math.floor(Math.random()*(max-min))+min;
        },

        chooseRandom: function(coll) {
            var idx = this.randInt(coll.length);

            return coll[idx];
        },

        /**
         * Find the shared prefix of two strings, or the empty string if there
         * is none.
         *
         * @param {string} s1
         * @param {string} s2
         *
         * @returns {string}
         */
        commonPrefix: function(s1, s2) {
            var l = Math.min(s1.length, s2.length);
            for (var i = 0; i < l; ++i) {
                if (s1[i] !== s2[i]) break;
            }

            return s1.substr(0, i);
        },

        getLocation: function() {
            var promise = $.Deferred();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        promise.resolve(position.coords);
                    },
                    function() {
                        promise.reject("Nope");
                    });
            } else {
                promise.reject("Geolocation not available");
            }

            return promise;
        },

        /**
         * Breaks up an array into subarrays of length size, advancing the head
         * of each subarray by step, then calls fn on each subarray.
         *
         * @param {} list
         * @param {Function} fn The function to be called on each subarray
         * @param {Number} size The size of each subarray
         * @param {Number} step The number of places to advance the head of the
         * subarray at each step
         * @param {Object} ctx
         *
         * @returns {Array} An array 
         */
        step: function(list, fn, size, step, ctx) {
            var out = [];
            ctx = ctx || this;

            if (!size) size = 2;
            if (!step) step = size;

            for (var i = 0, l = list.length-size+1; i < l; i+=step)
                out.push(fn.apply(ctx, list.slice(i, i+size)));

            return out;
        },

        partition: function(list, size, step) {
            return $u.step(list, Array, size, step);
        },

        /**
         * Maps iteratee fn over list, concatenating the returned functions.
         *
         * @param {[]} list
         * @param {Function|String} fn
         */
        mapcat: function(list, fn) {
            fn = _.iteratee(fn);
            return _.reduce(list, function(l, item) {
                return l.concat(fn(item));
            }, []);
        },

        /**
         * Like map, but discards null or undefined values.
         */
        keep: function(list, fn, ctx) {
            var l = list.length, out = [];

            for (var i = 0; i < l; i++) {
                var v = fn(l[i]);
                if (!(v === undefined || v === null))
                    out.push(v);
            }

            return out;
        },

        times: function(n, fn) {
            var out = [];

            while (n-- > 0)
                out.push(fn());

            return out;
        },

        /**
         * Creates a new object with keys mapped to values. If values is an
         * array, maps keys to the corresponding value in the values array. If
         * values is a non-array, the values will all be set to the same thing.
         *
         * @param {string[]} keys
         * @param {}
         */
        asKeys: function(keys, vals) {
            if (vals === undefined) vals = null;

            var valfn = _.isArray(vals) ?
                    function(i) { return vals[i]; }
                : function(i) { return vals; };

            return _.reduce(keys, function(m, k, i) {
                m[k] = valfn(i);
                return m;
            }, {});
        },

        /**
         * Given a sorted list and a value, insert val into the list at the
         * correct position. Modifies the list in place.
         *
         * @param {Array.} l The sorted list where val is to be inserted
         * @param {} val The value to be inserted
         * @param {Function|String} [cmp] Can be a comparison function that
         * takes two arguments and returns -1, 0, or 1; or a string specifying
         * the attribute to be retrieved on 
         */
        insertSorted: function(l, val, cmp) {
            if (!cmp)
                cmp = function(a, b) { return a > b ? 1 : a < b ? -1 : 0; };
            else if (!_.isFunction(cmp)) {
                var fn = _.iteratee(cmp),
                    // Since val is always the first argument, just compute its
                    // comparision value once:
                    aval = fn(val);

                cmp = function(_a, b) {
                    var bval = fn(b);
                    return aval > bval ? 1 : aval < bval ? -1 : 0;
                };
            }

            if (!l) l = [];

            var from = 0, to = l.length, cursor = 0, place, oval;

            while (true) {
                if (from === to) break;

                cursor = from + Math.floor((to-from)/2);

                // Compare val to the midpoint:
                place = cmp(val, l[cursor]);

                if (place === 0) break;

                if (place === -1) {
                    if (to - cursor < 1)
                        break;
                    to = cursor;
                } else {
                    if (cursor - from < 1) {
                        cursor++;
                        break;
                    }

                    from = cursor;
                }
            }

            l.splice(cursor, 0, val);

            return l;
        },
    };

    return $u;
});
