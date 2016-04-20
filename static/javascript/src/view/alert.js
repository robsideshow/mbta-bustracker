define(["backbone", "templates"],
       function(B, $t) {
           var AlertView = B.View.extend({
               initialize: function() {
                   B.View.prototype.initialize.apply(this, arguments);

                   this.listenTo(this.model, "change", this.render);
               },

               render: function() {
                   var $el = this.$el;
                   $t.render("alert", this.model.attributes)
                       .done(function(html) {
                           $el.html(html);
                       });
               }
           });

           return AlertView;
       });
