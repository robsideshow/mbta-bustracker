define(["backbone"],
       function(B) {
           var StopModel = B.Model.extend({
               idAttribute: "stop_id"
           });

           return StopModel;
       });
