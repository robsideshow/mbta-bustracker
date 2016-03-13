define(["backbone", "utils", "underscore"],
       function(B, $u, _) {
           var InfoBox = B.View.extend({
               initialize: function(options) {
                   console.assert(options.app,
                                  "InfoView requires an AppState instance.");
                   this.app = options.app;
                   this.showCount = options.predictionCount || 3;
                   this.listenTo(this.app, "vehicleSelected",
                                 this.onVehicleSelected)
                       .listenTo(this.app, "vehicleUnselected",
                                 this.onVehicleUnselected);
                   this._nextTick = 0;
               },

               onVehicleSelected: function(id, vehicle) {
                   // For now, just track a single vehicle
                   this._vehicle = vehicle;
                   this._recalculatePredictions();
                   this.listenTo(vehicle, "change", this.onVehicleChanged);
                   this.$el.show();
               },

               onVehicleUnselected: function(id, vehicle) {
                   this.stopListening(vehicle, "change");

                   if (this._vehicle && this._vehicle.id == id) {
                       delete this._vehicle;
                       this.$el.hide();
                   }
               },

               onVehicleChanged: function(vehicle) {
                   this._recalculatePredictions();
               },

               _recalculatePredictions: function() {
                   var vehicle = this._vehicle,
                       nextStop, preds;

                   if (vehicle) {
                       var stamp = $u.stamp();
                       preds = $u.dropWhile(function(pred) {
                           return pred.arr_time < stamp;
                       }, vehicle.get("preds")).slice(0, 3);
                       nextStop = preds[0];
                   }

                   if (nextStop) {
                       this._nextStamp = nextStop.arr_time;
                       this._preds = preds;
                   } else {
                       this._preds = this._nextStamp = null;
                   }
               },

               tick: function(dt, stamp) {
                   // Don't re-render too frequently.
                   if (stamp < this._nextTick) return;

                   if (!this._nextStamp || this._nextStamp <= stamp)
                       this._recalculatePredictions();

                   this.render(stamp);
                   this._nextTick = stamp + 1000;
               },

               render: function(stamp) {
                   if (!this._vehicle) return;

                   // predictions are in seconds since the epoch
                   stamp /= 1000;

                   var preds = this._preds,
                       html = _.map(preds,
                                    function(pred, i) {
                                        return (
                                            "<div>" +
                                                pred.stop_name + " " +
                                                $u.briefRelativeTime(pred.arr_time - stamp) +
                                                "</div>"
                                        );
                                    });
                   this.$(".vehicle-predictions").html(html);

                   if (this._vehicle.id !== this._lastVehicleId) {
                       this.$(".vehicle-description").html(
                           this._vehicle.summary());
                       this._lastVehicleId = this._vehicle.id;
                   }
               }
           });

           return InfoBox;
       });
