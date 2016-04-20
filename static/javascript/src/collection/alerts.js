define(["backbone", "jquery", "underscore", "config"],
       function(B, $, _, config) {
           var AlertsCollection = B.Collection.extend({
               pullUpdates: function() {
                   var self = this;

                   $.getJSON(config.alertsURL)
                       .done(function(response) {
                           self.add(_.map(
                               response.data,
                               function(alert_info) {
                                   _.extend(alert_info, {
                                       id: alert_info.alert_id,
                                       name: alert_info.header.join("")
                                   };
                               }));
                       });
               },

               pullNinjaUpdates: function() {
                   clearInterval(this._ninjaTimeout);

                   var self = this;

                   $.getJSON(config.mbtaNinjaAlertsURL)
                       .done(function(response) {
                           self.add(_.map(
                               response.data,
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

                                   return _.extend(alert_info, {
                                       id: alert_info._id,
                                       route_ids: null,
                                       type: "ninja",
                                       stop_ids: [stop_id]
                                   });
                               }));

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
