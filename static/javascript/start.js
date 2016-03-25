define(["jquery", "leaflet", "animation", "map", "legend", "infobox", "config",
        "app-state", "app", "utils", "route-list-view"],
       function($, L, Animation, Map, Legend, InfoBox, config, AppState, _, $u, RouteList) {
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
                       el: "#route-selector"
                   }).render();

                   new Legend({
                       el: "#legend",
                       app: app
                   });
               }
           };
       });
