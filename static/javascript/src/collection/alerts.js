define(["backbone", "jquery", "underscore", "alert-model", "utils", "config"],
       function(B, $, _, AlertModel, $u, config) {
           var AlertsCollection = B.Collection.extend({
               model: AlertModel,
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
                               name: alert_info.header.join(""),
                               route_ids: $u.asKeys(alert_info.route_ids, true),
                               stop_ids: $u.asKeys(alert_info.stop_id, true),
                               created_at: new Date(
                                   alert_info.start_time*1000)
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

               getRouteIdFromNinjaName: function(name) {
                   if (name.match(/^(Red|Orange|Blue|SL.)/))
                       return name.split(" ")[0];
                   var m = name.match(/^Green Line ([BCDE])/);
                   if (m) return "Green-" + m[1];
                   return null;
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
                               created_at: new Date(alert_info.createdAt),
                               route_ids: $u.asKeys([route_id], true),
                               type: "ninja",
                               stop_ids: $u.asKeys([stop_id], true)
                           });
                       }));

                   if (!_.isEmpty(remIds))
                       self.remove(_.keys(remIds));
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

               start: function() {
                   this.pullNinjaUpdates();
               }
           });

           return AlertsCollection;
       });
