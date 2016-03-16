define(["backbone", "shape-model"],
       function(B, Shape) {
           var ShapesCollection = B.Collection.extend({
               model: Shape,

               initialize: function(options) {
                   B.Collection.prototype.initialize.apply(this, arguments);
                   this.app = options && options.app;
               }
           });

           return ShapesCollection;
       });
