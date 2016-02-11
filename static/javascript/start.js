define(["jquery", "leaflet"], function($, L) {
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
                $.get("/api/bus_updates", {route: "77",
                                           stamp: lastTick}).
                    then(function(update) {
                        console.log(update, update.buses);
                        $.each(update.buses, function(idx, bus) {
                            if (!busMarkers[bus.id]) {
                                busMarkers[bus.id] =
                                    L.marker([+bus.lat, +bus.lon])
                                    .addTo(busLayer);
                            } else {
                                busMarkers[bus.id].setLatLng([+bus.lat, +bus.lon]);
                            }
                        });

                        setTimeout(tick, 10000);
                    });
            }

            tick();

            window.busMarkers = busMarkers;
        }
    };
});
