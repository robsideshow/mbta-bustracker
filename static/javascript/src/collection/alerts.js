define(["backbone", "jquery"],
       function(B, $) {
           var AlertsCollection = B.Collection.extend({
               url: "http://www.mbta.ninja/api/reports",

               start: function() {
                   var self = this;

                   this._interval = setInterval(function() {
                       self.fetch();
                   }, 60000);
               }
           });

           return AlertsCollection;
       });
