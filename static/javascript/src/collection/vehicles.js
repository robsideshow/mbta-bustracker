define(["backbone", "vehicle-model"],
       function(B, Vehicle) {
           var VehicleCollection = B.Collection.extend({
               model: Vehicle,

               initialize: function(models, options) {
                   B.Collection.prototype.initialize.call(this, models, options);

                   this.app = options.app;
               }
           });

           return VehicleCollection;
       });
