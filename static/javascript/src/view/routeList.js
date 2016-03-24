define(["backbone", "underscore"],
       function(B) {
           var RouteListView = B.View.extend({
               initialize: function(options) {
                   if (!options.app)
                       throw new Error("Missing required keyword: app");
                   B.View.prototype.initialize.call(this, options);
                   this.app = options.app;

                   this.listenTo(this.app, "routeSelected",
                                 this.onRouteSelected)
                       .listenTo(this.app, "routeUnselected",
                                 this.onRouteUnselected);
               },

               events: {
                   "change .toggle": "onChange"
               },

               onChange: function(e) {
                   var route_id = e.target.value,
                       checked = e.target.checked;

                   this.app.toggleRoute(route_id, checked);
               },

               onRouteSelected: function(id, route) {
                   this.$("#check_" + id).prop("checked", true);
               },

               onRouteUnselected: function(id, route) {
                   this.$("#check_" + id).prop("checked", false);
               },

               render: function() {
                   var $el = this.$el,
                       html = [];

                   this.app.routes.getFullList().done(function(names) {
                       _.each(names, function(name, route_id) {
                           var dom_id = "check_" + route_id;
                           html.push(
                               "<input type='checkbox' id='",
                               dom_id, "' class='toggle left' ",
                               "value='", route_id, "'/>",
                               "<label for='", dom_id, "'>",
                               _.escape(name), "</label>");
                       });

                       $el.html(html.join(""));
                   });

                   return this;
               }
           });

           return RouteListView;
       });
