define(["jquery", "leaflet", "bus-marker", "routes", "config"],
       function($, L, BusMarker, Routes, config) {
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

                   var RoutesLoader = new Routes(routeLayer);

                   window.routeLayer = routeLayer;

                   RoutesLoader.showRoutes(routes);

                   // TODO: Rewrite
                   $("fieldset.select-route")
                       .on("change", "input", function() {
                           var route = this.id,
                               checked = this.checked;

                           if (checked) {
                               if (routes.indexOf(route) == -1) {
                                   routes.push(route);
                                   RoutesLoader.showRoute(route);
                                   tick();
                               }
                           } else {
                               var idx = routes.indexOf(route);

                               if (idx != -1) {
                                   routes.splice(idx, 1);
                                   RoutesLoader.hideRoute(route);

                                   $.each(busMarkers,
                                          function(i, marker) {
                                              if (marker.bus.route == route) {
                                                  busLayer.removeLayer(marker);
                                                  delete busMarkers[i];
                                              }
                                          });
                               }
                           }
                       });

                   var _timeout;

                   function tick(){
                       if (!routes.length) return;

                       clearTimeout(_timeout);

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
                                   //lastTick = update.stamp;
                               });

                               _timeout = setTimeout(tick, 10000);
                           });
                   }

                   tick();

                   window.busMarkers = busMarkers;
               }
           };
       });
