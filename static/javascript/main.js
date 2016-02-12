require.config({
    paths: {
        "jquery": "http://code.jquery.com/jquery-1.12.0.min",
        "leaflet": "http://cdn.leafletjs.com/leaflet/v0.7.7/leaflet",

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
