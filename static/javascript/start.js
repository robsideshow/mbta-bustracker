define(["jquery", "leaflet", "animation", "map", "legend", "infobox", "config",
        "app-state", "app", "utils"],
       function($, L, Animation, Map, Legend, InfoBox, config, AppState, _, $u) {
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

                   $("fieldset.select-route")
                       .on("change", "input", function() {
                           var route_id = this.value,
                               checked = this.checked;

                           if (checked) {
                               app.addRoute(route_id);
                           } else {
                               app.removeRoute(route_id);
                           }
                       });

                   new Legend({
                       el: "#legend",
                       app: app
                   });

                   var info = new InfoBox({
                       el: "#info",
                       app: app
                   });

                   animation.addObject(info);
               }
           };
       });
