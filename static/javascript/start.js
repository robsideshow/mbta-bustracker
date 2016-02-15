define(["jquery", "leaflet", "bus-marker", "config"],
       function($, L, BusMarker, config) {
           return {
               init: function() {
                   var map = L.map("map", {
                       center: [42.36564700281194, -71.06386184692381],
                       zoom: 15
                   }),
                       routes = config.defaultRoutes;

                   L.tileLayer("http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png")
                       .addTo(map);

                   var lastTick = 0,
                       busMarkers = {},
                       routeLayer = L.layerGroup().addTo(map),
                       busLayer = L.layerGroup().addTo(map);

                   window.routeLayer = routeLayer;

                   $.each(routes, function(i, route) {
                       var style = $.extend({color: config.colors[i]},
                                            config.defaultRouteStyle,
                                            config.routeStyles[route]);
                       $.get("/api/routeinfo", {route: route})
                           .then(function(info) {
                               var routeGroup = L.layerGroup().addTo(routeLayer);
                               $.each(info.paths, function(i, path) {
                                   L.polyline(path, style)
                                       .addTo(routeGroup)
                                       .bringToBack();
                               });
                           });
                   });

                   function tick(){
                       $.get("/api/bus_updates", {routes: routes.join(","),
                                                  since: lastTick}).
                           then(function(update) {
                               $.each(update.buses, function(idx, bus) {
                                   if (!busMarkers[bus.id]) {
                                       busMarkers[bus.id] =
                                           new BusMarker(bus)
                                           .addTo(busLayer);
                                   } else {
                                       busMarkers[bus.id].update(bus);
                                   }
                                   lastTick = update.stamp;
                               });

                               setTimeout(tick, 10000);
                           });
                   }

                   tick();

                   window.busMarkers = busMarkers;
               }
           };
       });
