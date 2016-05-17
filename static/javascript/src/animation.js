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
        this.runTick = _.bind(this.runTick, this);

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

        runTick: function(_now) {
            var now = Date.now(),
                dt = (now - this._lastRun)/1000;

            for (var i = 0, l = this.objects.length; i < l; i++) {
                this.objects[i].tick(dt, now);
            }

            this._lastRun = now;
            this._ticks++;

            this._requestId = requestAnimationFrame(this.runTick);
        },

        start: function() {
            if (!this._lastRun)
                this._lastRun = Date.now();
            this._requestId = requestAnimationFrame(this.runTick);
        },

        pause: function() {
            return this.stop(true);
        },

        stop: function(pause) {
            if (!pause)
                this._lastRun = null;

            cancelAnimationFrame(this._requestId);
        }
    });

    return Animation;
});
