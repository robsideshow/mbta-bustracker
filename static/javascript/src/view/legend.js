define(["backbone"],
       function(B) {
           var LegendView = B.View.extend({
               initialize: function(options) {
                   console.assert(options.app,
                                  "LegendView requires an AppState instance");
                   this.app = options.app;
                   this.listenTo(this.app, "routeSelected", this.render)
                       .listenTo(this.app, "routeUnselected", this.render);
               },

               render: function() {
                   var $el = this.$el,
                       routes = this.app.getSelectedRoutes();

                   $el.html("");

                   if (!routes.length) {
                       $el.hide();
                       return;
                   }

                   _.each(routes, function(route) {
                       $el.append(
                           "<div class='route'>" +
                               "<div class='swatch' style='background-color:" +
                               route.getColor() + "'>" +
                               "</div> " + _.escape(route.getName()) +
                            "</div>"
                       );
                   });

                   $el.show();
               }
           });

           return LegendView;
       });
