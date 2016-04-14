define(["backbone", "underscore", "templates"],
       function(B, _, $t) {
           var RouteListView = B.View.extend({
               initialize: function(options) {
                   if (!options.app)
                       throw new Error("Missing required keyword: app");
                   B.View.prototype.initialize.call(this, options);
                   this.app = options.app;
                   this.filter = options.filter;

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
                       routes = this.app.routes,
                       filter = this.filter;

                   routes.getFullList().done(function(names) {
                       var routes = [];
                       _.each(names, function(name, route_id) {
                           if (filter(route_id, name))
                               routes.push({id: route_id, name: name});
                       });

                       $t.templateHtml($el, "routeList", {routes: routes});
                   });

                   return this;
               }
           });

           return RouteListView;
       });
