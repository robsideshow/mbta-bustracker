define(["leaflet"], function(L) {
    return L.FeatureGroup.extend({
        initialize: function(stop) {
            L.FeatureGroup.prototype.initialize.apply(this, []);
            this.stop = stop;
            this.shape = L.circle([stop.lat, stop.lon],
                                  10, this.style)
                .addTo(this);
            this.bindPopup("");
            this.on("popupopen", this.onPopup);
        },

        style: {
            color: "black",
            fillColor: "white",
            fillOpacity: 1,
            weight: 2
        },

        onPopup: function(e) {
            var html = ["Stop id: ", this.stop.stop_id,
                        "<br/> Stop Name:", this.stop.stop_name].join("");
            e.popup.setContent(html);
        }
    });
});
