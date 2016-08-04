define(["optional!local-config", "underscore"], function(localConfig, _) {
    var config = {
        defaultRoutes: ["Red", "Orange", "Blue"],
        defaultRouteStyle: {
            opacity: 0.5,
            weight: 4
        },
        bounds: [
            [42.10647, -71.291173],
            [42.58745957678619, -70.8439246281733]
        ],
        host: location.protocol + "//" + location.host,
        tilesURL: "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",

        // If the route_id matches this pattern, the route is considered a
        // subway:
        subwayPattern: /^Red|Orange|Green-|Blue|Mattapan/,
        isSubwayRoute: function(route_id) {
            return !!config.subwayPattern.exec(route_id);
        },
        getRouteMode: function(route_id) {
            if (config.subwayPattern.exec(route_id))
                return "subway";

            return "bus";
        },
        // Controls the order in which routes are grouped and the group labels.
        // The "mode" key should correspond to the return value of getRouteMode.
        modes: [
            {mode: "subway", label: "Subway Routes"},
            {mode: "bus", label: "Bus Routes"}
        ],
        routeStyles: {
            "Red": {color: "red"},
            "Orange": {color: "orange"},
            "Green-B": {color: "green",
                    opacity: 0.2},
            "Green-C": {color: "green",
                    opacity: 0.2},
            "Green-D": {color: "green",
                    opacity: 0.2},
            "Green-E": {color: "green",
                    opacity: 0.2},
            "Blue": {color: "blue"}
        },
        routeNicknames: {
            "Red": "Red",
            "Blue": "Blue",
            "Orange": "Orange",
            "Green-B": "B",
            "Green-C": "C",
            "Green-D": "D",
            "Green-E": "E",
            "Mattapan": "MT",
            // Silver Line Waterfront
            "746": "SLW"
        },
        colors: ["salmon", "#6CB31B", "teal", "gold", "orchid", "darkgoldenrod", "deepskyblue", "deeppink", "sienna", "burlywood"],

        // How long should popup alert messages remain visible?
        alertShowDuration: 5000,

        alertsURL: "/api/alerts",

        mbtaNinjaAlertsURL: "https://mbta-ninja-staging.herokuapp.com/api/reports",

        // The number of meters per degree of longitude.
        longMeters: 82600,
        // The number of meters per degree of latitude (this shouldn't change)
        latMeters: 111120,

        // Check MBTA.ninja for updates every 10 seconds
        ninjaPollInterval: 10000,

        ninjaStopIds: {
            "Charles/MGH": "place-chmnl",
            "Broadway": "place-brdwy",
            "Ashmont": "place-asmnl",
            "Andrew": "place-andrw",
            "Davis": "place-davis",
            "Central Square": "place-cntsq",
            "JFK/Umass": "place-jfk",
            "Quincy Center": "place-qnctr",
            "Downtown Crossing": "place-dwnxg",
            "Shawmut": "place-smmnl",
            "South Station": "place-sstat",
            "Wollaston": "place-wlsta",
            "Braintree": "place-brntn",
            "Porter Square": "place-portr",
            "Park Street": "place-pktrm",
            "Alewife": "place-alfcl",
            "North Quincy": "place-nqncy",
            "Quincy Adams": "place-qamnl",
            "Fields Corner": "place-fldcr",
            "Savin Hill": "place-shmnl",
            "Harvard Square": "place-harsq",
            "Kendall": "place-knncl",
            "Government Center": "place-gover",
            "Orient Heights": "place-orhte",
            "Wonderland": "place-wondl",
            "Airport": "place-aport",
            "Maverick": "place-mvbcl",
            "Revere Beach": "place-rbmnl",
            "Aquarium": "place-aqucl",
            "Bowdoin": "place-bomnl",
            "Wood Island": "place-wimnl",
            "Suffolk Downs": "place-sdmnl",
            "State Street": "place-state",
            "Beachmont": "place-bmmnl",
            "Assembly": "place-astao",
            "Wellington": "place-welln",
            "Malden Center": "place-mlmnl",
            "Oak Grove": "place-ogmnl",
            "Chinatown": "place-chncl",
            "Forest Hills": "place-forhl",
            "Roxbury Crossing": "place-rcmnl",
            "Ruggles": "place-rugg",
            "Haymarket": "place-haecl",
            "Green Street": "place-grnst",
            "Massachusetts Ave.": "place-masta",
            "Back Bay": "place-bbsta",
            "Sullivan Square": "place-sull",
            "Stony Brook": "place-sbmnl",
            "Community College": "place-ccmnl",
            "Jackson Square": "place-jaksn",
            "North Station": "place-north",
            "Tufts Medical Center": "place-tumnl",
            "State Street": "place-state",
            "Downtown Crossing": "place-dwnxg",
            "Arlington": "place-armnl",
            "Haymarket": "place-haecl",
            "Science Park": "place-spmnl",
            "North Station": "place-north",
            "Boylston": "place-boyls",
            "Washington Street": "place-wascm",
            "Hynes Convention Center": "place-hymnl",
            "Boston Univ. East": "place-buest",
            "Griggs Street": "place-grigg",
            "Saint Paul Street": "place-stplb",
            "Warren Street": "place-wrnst",
            "Lechmere": "place-lech",
            "Boston Univ. West": "place-buwst",
            "Government Center": "place-gover",
            "Packards Corner": "place-brico",
            "Chiswick Road": "place-chswk",
            "Copley": "place-coecl",
            "Kenmore": "place-kencl",
            "Harvard Ave.": "place-harvd",
            "Babcock Street": "place-babck",
            "Pleasant Street": "place-plsgr",
            "Chestnut Hill Ave.": "place-chill",
            "Sutherland Road": "place-sthld",
            "Boston College": "place-lake",
            "South Street": "place-sougr",
            "Boston Univ. Central": "place-bucen",
            "Blandford Street": "place-bland",
            "Allston Street": "place-alsgr",
            "Summit Ave.": "place-sumav",
            "Saint Mary Street": "place-smary",
            "Washington Square": "place-bcnwa",
            "Fairbanks Street": "place-fbkst",
            "Hawes Street": "place-hwsst",
            "Science Park": "place-spmnl",
            "North Station": "place-north",
            "Boylston": "place-boyls",
            "Saint Paul Street": "place-stpul",
            "Englewood Ave.": "place-engav",
            "Hynes Convention Center": "place-hymnl",
            "Coolidge Corner": "place-cool",
            "Lechmere": "place-lech",
            "Government Center": "place-gover",
            "Dean Road": "place-denrd",
            "Copley": "place-coecl",
            "Arlington": "place-armnl",
            "Kenmore": "place-kencl",
            "Cleveland Circle": "place-clmnl",
            "Brandon Hall": "place-bndhl",
            "Haymarket": "place-haecl",
            "Kent Street": "place-kntst",
            "Tappan Street": "place-tapst",
            "Arlington": "place-armnl",
            "Beaconsfield": "place-bcnfd",
            "Boylston": "place-boyls",
            "Museum of Fine Arts": "place-mfa",
            "Longwood Medical Area": "place-lngmd",
            "Government Center": "place-gover",
            "Park Street": "place-pktrm",
            "Symphony": "place-symcl",
            "Mission Park": "place-mispk",
            "Riverway": "place-rvrwy",
            "Lechmere": "place-lech",
            "Fenwood Road": "place-fenwd",
            "Haymarket": "place-haecl",
            "Copley": "place-coecl",
            "Arlington": "place-armnl",
            "Brigham Circle": "place-brmnl",
            "Prudential": "place-prmnl",
            "Science Park": "place-spmnl",
            "Heath Street": "place-hsmnl",
            "North Station": "place-north",
            "Back of the Hill": "place-bckhl",
            "Northeastern University": "place-nuniv",
            "Brookline Hills": "place-brkhl",
            "Brookline Village": "place-bvmnl",
            "Chestnut Hill": "place-chhil",
            "Court House": "place-crtst",
            "Eliot": "place-eliot",
            "Fenway": "place-fenwy",
            "Longwood": "place-longw",
            "Newton Centre": "place-newto",
            "Newton Highlands": "place-newtn",
            "Reservoir": "place-rsmnl",
            "Riverside": "place-river",
            "Saint Paul Street": "place-stplb",
            "Waban": "place-waban",
            "Woodland": "place-woodl",
			      "World Trade Center": "place-wtcst"
        }
    };

    if (localConfig)
        _.extend(config, localConfig);

    return config;
});
