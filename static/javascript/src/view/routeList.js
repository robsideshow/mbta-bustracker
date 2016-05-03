define(["backbone", "underscore", "templates", "utils"],
       function(B, _, $t, $u) {
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
                   "change .toggle": "onChange",
                   "click .all-on": "turnOnAllRoutes"
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

               turnOnAllRoutes: function(e) {
                   var app = this.app,
                       filter = this.filter;
                   this.app.routes.getFullList().done(function(routes) {
                       app.addRoutes($u.keep(routes, function(pair) {
                           if (filter(pair[0], pair[1]))
                               return pair[0];
                           return null;
                       }));
                   });

                   e.preventDefault();
               },

               render: function() {
                   var $el = this.$el,
                       routes = this.app.routes,
                       filter = this.filter;

                   routes.getFullList().done(function(names) {
                       var routes = [];
                       _.each(names, function(pair) {
                           var route_id = pair[0],
                               name = pair[1];
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
