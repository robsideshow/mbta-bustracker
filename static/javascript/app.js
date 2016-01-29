function drawBus(bus, map){
  return {
    position: {lat: bus['lat'], lng: bus['lon']},
    map: map,
    icon: "/static/bus.png",
    title: "Route: " + bus['route'] + "-" + "Bearing:" + bus['bearing']
  };
}