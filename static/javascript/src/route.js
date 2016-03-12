define(["leaflet", "jquery"],
       function(L, $) {
           return {
               routeFromPaths: function(paths) {
                   var group = L.featureGroup();

                   $.each(paths, function(path) {
                       L.polyline(path, {});
                   });
               }
           };
       });
