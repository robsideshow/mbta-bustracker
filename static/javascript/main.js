require.config({
    paths: {
        "jquery": "http://code.jquery.com/jquery-1.12.0.min",
        "leaflet": "http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet",

        "config": "config",
        "animation": "src/animation",
        "bus-marker": "src/busMarker",
        "stop-marker": "src/stopMarker",
        "routes": "src/routes",
        "utils": "src/utils",

        "start": "start"
    },

    shim: {
        "leaflet": {
            exports: "L"
        }
    }
});

require(["start"], function(start) {
    start.init();
});
