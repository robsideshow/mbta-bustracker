define(["utils", "underscore", "jquery"], function($u, _, $) {
    var defaultOptions = {
        tickInterval: 100,
        idleInterval: 2000
    };

    /**
     * @param {Object} [options]
     * @param {number} options.tickInterval The delay between updates
     */
    function Animation(options) {
        if (!(this instanceof Animation) )
            return new Animation(options);

        this.options = _.extend(defaultOptions, options);
        this.objects = [];

        return this;
    }

    _.extend(Animation.prototype, {
        addObject: function(object) {
            this.objects.push(object);
        },

        removeObject: function(object) {
            var idx = this.objects.indexOf(object);

            if (idx > -1) {
                this.objects.splice(idx, 1);
            }
        },

        _lastRun: 0,
        _ticks: 0,

        runTick: function() {
            var now = new Date().getTime(),
                dt = (now - this._lastRun)/1000;
            _.each(this.objects, function(thing) {
                // Run tick on each object... dt = delta t, not datetime
                thing.tick(dt, now);
            });
            this._lastRun = now;
            this._ticks++;
        },

        /**
         * Update less frequently when the application is in the background:
         */
        onVisibilityChange: function() {
            clearInterval(this._interval);

            if (document.visibilityState === "hidden") {
                // Put this condition first, so that browsers that don't support
                // the page visibility API will use the standard tick interval:
                this._currentInterval = this.options.idleInterval;
            } else {
                this._currentInterval = this.options.tickInterval;
            }

            this._interval = setInterval(_.bind(this.runTick, this),
                                         this._currentInterval);
        },

        start: function() {
            this._lastRun = new Date().getTime();

            $(document).on("visibilitychange",
                           _.bind(this.onVisibilityChange, this));
            this.onVisibilityChange();
        },

        stop: function() {
            return clearInterval(this._interval);
        }
    });

    return Animation;
});
