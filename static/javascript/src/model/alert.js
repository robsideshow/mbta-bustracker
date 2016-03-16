define(["backbone"],
       function(B) {
           var AlertModel = B.Model.extend({
               idAttribute: "_id"
           });

           return AlertModel;
       });
