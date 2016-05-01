define(["jquery", "leaflet", "animation", "map", "legend", "config",
        "app-state", "app", "utils", "route-list-view", "underscore"],
function($, L, Animation, Map, Legend, config, AppState, _app, $u, RouteList, _) {
           return {
               init: function() {
                   var app = new AppState(),
                       animation = new Animation({tickInterval: 20}),
                       map = new Map("#map", app, animation);

                   window.map = map;
                   window.app = app;
                   window.$u = $u;

                   app.start();
                   animation.start();

                   // Pause the animation while the map is zooming:
                   map.map.on("zoomstart", function() {
                       animation.pause();
                   })
                       .on("zoomend", function() {
                           animation.start();
                       });

                   new RouteList({
                       app: app,
                       el: "#route-selector",
                       filter: _.negate(app.routes.isSubwayRoute)
                   }).render();

                   new RouteList({
                       app: app,
                       el: "#metro-selector",
                       filter: app.routes.isSubwayRoute
                   }).render();

                   new Legend({
                       el: "#legend",
                       app: app
                   });

                   // Geolocation
                   $("#locate-me").click(function() {
                       map.toggleLocationWatch();
                   });

                   app.on("geolocating", function(on) {
                       $("#locate-me").html(on ? "Stop Geolocation" :
                                           "Locate Me!");
                   });

                   $(document).on("click", ".size-to-fit",
                                  function() {
                                      map.fitRouteBounds();
                                      return false;
                                  });
               }
           };
       });
