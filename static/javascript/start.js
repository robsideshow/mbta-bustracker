define(["jquery", "leaflet", "animation", "bus-marker", "routes", "config"],
       function($, L, Animation, BusMarker, Routes, config) {
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

                   window.map = map;
                   window.routeLayer = routeLayer;
                   window.routeLoader = RoutesLoader;
                   window.routes = routes;

                   RoutesLoader.showRoutes(routes);

                   var animation = new Animation({tickInterval: 1000});
                   animation.start();

                   // TODO: Rewrite
                   $("fieldset.select-route")
                       .on("change", "input", function() {
                           var route_id = this.value,
                               checked = this.checked;

                           if (checked) {
                               if (routes.indexOf(route_id) == -1) {
                                   routes.push(route_id);
                                   RoutesLoader.showRoute(route_id)
                                       .then(function() {
                                           map.fitBounds(RoutesLoader.getBounds());
                                       });
                                   tick();
                               }
                           } else {
                               var idx = routes.indexOf(route_id);

                               if (idx != -1) {
                                   routes.splice(idx, 1);
                                   RoutesLoader
                                       .hideRoute(route_id)
                                       .then(function() {
                                           var bounds = RoutesLoader.getBounds();
                                           if (bounds) map.fitBounds(bounds);
                                       });

                                   $.each(busMarkers,
                                          function(i, marker) {
                                              if (marker.bus.route_id == route_id) {
                                                  busLayer.removeLayer(marker);
                                                  animation.removeObject(marker);
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
                                       var marker = new BusMarker(bus).addTo(busLayer);
                                       busMarkers[bus.id] = marker;
                                       animation.addObject(marker);
                                   } else {
                                       busMarkers[bus.id].update(bus);
                                   }
                                   lastTick = update.stamp;
                               });

                               _timeout = setTimeout(tick, 10000);
                           });
                   }

                   tick();

                   window.busMarkers = busMarkers;
               }
           };
       });
