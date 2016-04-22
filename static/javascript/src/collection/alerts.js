define(["backbone", "jquery", "underscore", "utils", "config"],
       function(B, $, _, $u, config) {
           var AlertsCollection = B.Collection.extend({
               initialize: function() {
                   B.Collection.prototype.initialize.apply(this, arguments);

                   // Record the ids of the MBTA.ninja alerts
                   this._ninjaIds = {};
               },

               updateWithMBTAAlerts: function(alerts) {
                   var stamp = $u.stamp();

                   this.add($u.keep(
                       alerts,
                       function(alert_info) {

                           _.extend(alert_info, {
                               id: alert_info.alert_id,
                               name: alert_info.header.join("")
                           });
                       }));
               },

               pullUpdates: function() {
                   var self = this;

                   $.getJSON(config.alertsURL)
                       .done(function(response) {
                           self.updateWithMBTAAlerts(response.data);
                       });
               },

               // Removes alerts that are no longer applicable
               cleanupStaleMBTAAlerts: function(stamp) {
                   stamp = stamp || $u.stamp();
                   this.remove(this.models.filter(function(alert) {
                       var end = alert.get("end");

                       return end && end < stamp;
                   }));
               },

               updateWithNinjaAlerts: function(alerts) {
                   var self = this,
                       remIds = this._ninjaIds,
                       ninjaIds = {};

                   this._ninjaIds = ninjaIds;

                   this.add($u.keep(
                       alerts,
                       function(alert_info) {
                           var stop_id =
                                   alert_info.stop_id ||
                                   config.ninjaStopIds[alert_info.location],
                               route_id =
                                   alert_info.route_id ||
                                   self.getRouteIdFromNinjaName(
                                       alert_info.line);

                           if (!stop_id || !route_id)
                               return null;

                           // This alert id is still live
                           delete remIds[alert_info._id];
                           ninjaIds[alert_info._id] = true;

                           return _.extend(alert_info, {
                               id: alert_info._id,
                               route_ids: null,
                               type: "ninja",
                               stop_ids: [stop_id]
                           });

                           if (!_.isEmpty(remIds))
                               self.remove(_.keys(remIds));
                       }));
               },

               pullNinjaUpdates: function() {
                   clearInterval(this._ninjaTimeout);

                   var self = this;

                   $.getJSON(config.mbtaNinjaAlertsURL)
                       .done(function(response) {
                           self.updateWithNinjaAlerts(response.data);

                           self.scheduleNinjaTimeout();
                       });
               },

               scheduleNinjaTimeout: function() {
                   var self = this;
                   this._ninjaTimeout = setTimeout(function() {
                       self.pullNinjaUpdates();
                   }, config.ninjaPollInterval);
               },

               generateNinjaAlert: function() {
                   return {
                       _id: $u.randInt(1000, 0),
                       name: "Delayed train",
                       location: $u.chooseRandom(["Alewife",
                                                  "Davis Square",
                                                  "Porter Square",
                                                  "Harvard Square",
                                                  "South Station",
                                                  "Broadway",
                                                  "Ashmont"]),
                       votes: $u.randInt(10),
                       clears: 0,
                       weight: $u.randInt(15,5)
                   };
               },

               startTest: function() {
                   
               },

               start: function() {
                   this.pullNinjaUpdates();
               }
           });

           return AlertsCollection;
       });
