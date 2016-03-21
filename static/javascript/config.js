define([], function() {
    return {
        defaultRoutes: [],
        defaultRouteStyle: {
            opacity: 0.5,
            weight: 4
        },
        // If the route_id matches this pattern, the route is considered a
        // subway:
        subwayPattern: /^Red|Orange|Green-|Blue/,
        routeStyles: {
            "Red": {color: "red",
                    opacity: 0.2},
            "Orange": {color: "orange",
                    opacity: 0.3},
            "Green-B": {color: "green",
                    opacity: 0.2},
            "Green-C": {color: "green",
                    opacity: 0.2},
            "Green-D": {color: "green",
                    opacity: 0.2},
            "Green-E": {color: "green",
                    opacity: 0.2},
            "Blue": {color: "blue",
                    opacity: 0.3}
        },
        colors: ["salmon", "#6CB31B", "teal", "gold", "orchid", "darkgoldenrod", "deepskyblue", "deeppink", "sienna", "burlywood"]
    };
});
