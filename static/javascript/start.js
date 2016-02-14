define(["jquery", "leaflet", "bus-marker"],
       function($, L, BusMarker) {
           return {
               init: function() {
                   var map = L.map("map", {
                       center: [42.36564700281194, -71.06386184692381],
                       zoom: 15
                   });
                   L.tileLayer("http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png")
                       .addTo(map);

                   var lastTick = 0,
                       busMarkers = {},
                       busLayer = L.layerGroup().addTo(map);
                   function tick(){
                       $.get("/api/bus_updates", {routes: "Red,77,66,1",
                                                  stamp: lastTick}).
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
