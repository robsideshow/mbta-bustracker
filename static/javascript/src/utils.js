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

        makeTransformFn: null,

        bind: function(fn, context) {
            return function() {
                return fn.apply(context, arguments);
            };
        },

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

        prettyRelativeTime: function(delta) {
            var r = $u.relativeTime(delta),
                p = function(x) { return x == 1 ? "" : "s"; },
                pieces = [];

            if (r.hours > 0)
                pieces.push(r.hours + " hour" + p(r.hours));
            if (r.minutes > 0)
                pieces.push(r.minutes + " minute" + p(r.minutes));
            if (r.seconds > 0)
                pieces.push(r.seconds + " second" + p(r.seconds));

            return pieces.join(", ") + (r.future ? " from now" : " ago");
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

        getLocation: function() {
            var promise = $.Deferred();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    promise.resolve(position.coords);
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
         * Creates a new object with keys mapped to values. If values is an
         * array, maps keys to the corresponding value in the values array. If
         * values is a non-array, the values will all be set to the same thing.
         *
         * @param {String[]} keys
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
        }
    };

    return $u;
});
