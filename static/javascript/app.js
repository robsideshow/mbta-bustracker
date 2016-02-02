function drawBus(bus, map){
  return {
    position: {lat: bus.lat, lng: bus.lon},
    map: map,
    icon: "/static/bus.png",
    title: "Route: " + bus.route + "-" + "Bearing:" + bus.bearing
  };
}

function drawStop(stop, map){
  return {
    position: {lat: stop.stop_lat, lng: stop.stop_lon},
    map: map,
    icon: "/static/busstop.png",
    title: stop.stop_name + " - Routes: " + stop.routes 
  }
}