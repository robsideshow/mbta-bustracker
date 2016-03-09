define(["backbone"],
       function(B) {
           var VehicleCollection = B.Collection.extend({
               initialize: function(models, options) {
                   B.Collection.initialize.call(this, models, options);

                   this.app = options.app;
               }
           });

           return VehicleCollection;
       });
