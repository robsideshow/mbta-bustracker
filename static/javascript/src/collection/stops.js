define(["backbone", "stop-model"],
       function(B, StopModel) {
           var StopsCollection = B.Collection.extend({
               model: StopModel,

               initialize: function() {
                   B.Collection.prototype.initialize.apply(this, arguments);
                   this.listenTo(this, "add", this.onAdd)
                       .listenTo(this, "remove", this.onRemove);
               },

               onAdd: function(stop) {
                   var parent_id = stop.get("parent");

                   if (!parent_id) return;

                   var parent = this.get(parent_id);

                   if (!parent) {
                       parent = new StopModel({stop_id: parent_id,
                                               lat: stop.get("lat"),
                                               lon: stop.get("lon"),
                                               is_parent: true});
                       parent.children = {};
                       this.add(parent);
                   }

                   parent.addChild(stop);
               },

               onRemove: function(stop) {
                   var parent = stop.getParent();

                   if (parent) {
                       delete parent.children[stop.id];
                       if (_.isEmpty(parent.children)) {
                           delete parent.children;
                           this.remove(parent);
                       }
                   }
               }
           });

           return StopsCollection;
       });
