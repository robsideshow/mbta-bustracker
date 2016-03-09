define(["backbone", "stop-model"],
       function(B, StopModel) {
           var StopsCollection = B.Collection.extend({
               model: StopModel
           });

           return StopsCollection;
       });
