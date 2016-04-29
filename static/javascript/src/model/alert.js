define(["backbone", "utils", "underscore"],
       function(B, $u, _) {
           var AlertModel = B.Model.extend({
               defaults: function() {
                   return {
                       stop_ids: {},
                       route_ids: {}
                   };
               },

               hasStopId: function(stop_id) {
                   return this.get("stop_ids")[stop_id];
               },

               /**
                * Returns true if this alert applies to any of the stop ids.
                *
                * @param {Number[]} stop_ids
                *
                * @returns {Boolean}
                */
               hasStopIds: function(stop_ids) {
                   return $u.hasAny(this.get("stop_ids"), stop_ids);
               },

               hasRouteId: function(route_id) {
                   return this.get("route_ids")[route_id];
               },

               getStopIds: function() {
                   return _.keys(this.get("stop_ids"));
               }
           });

           return AlertModel;
       });
