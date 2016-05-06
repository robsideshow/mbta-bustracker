define(["jquery", "leaflet", "animation", "map", "legend", "config",
        "app-state", "app", "utils", "route-list-view", "underscore", "ga-stub"],
       function($, L, Animation, Map, Legend, config, AppState, _app, $u, RouteList, _, gaStub) {
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

                   var modeControl = {bus: "#route-selector",
                                      subway: "#metro-selector"};

                   _.each(config.modes, function(mode) {
                       new RouteList({
                           app: app,
                           el: modeControl[mode.mode],
                           filter: function(route_id) {
                               return config.getRouteMode(route_id) == mode.mode;
                           }
                       }).render();
                   });

                   new Legend({
                       el: "#legend",
                       app: app
                   });

                   // Geolocation
                   $("#locate-me").click(function() {
                       map.toggleLocationWatch();
                   });

                   $("#click-to-zoom").click(function() {
                       map.captureLocation();
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

                   window.ga = gaStub;
                   if (config.gAnalyticsID) {
                    (function(i,s,o,g,r,a,m){i["GoogleAnalyticsObject"]=r;i[r]=i[r]||function(){
                        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                                                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
                                            })(window,document,"script","https://www.google-analytics.com/analytics.js",'ga');

                    ga("create", config.gAnalyticsID, "auto");
                    ga("send", "pageview");
                   }
               }
           };
       });
