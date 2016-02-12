function drawBus(bus, map){
  return {
    position: {lat: bus.lat, lng: bus.lon},
    map: map,
    icon: "/static/bus.png",
    title: "Route: " + bus.route + "-" + "Bearing:" + bus.bearing
  };
}

function drawStop(stop, map, zIndex){
  return {
    position: {lat: +stop.lat, lng: +stop.lon},
    map: map,
    icon: "/static/busstop.png",
    title: stop.stop_name + " - Routes: " + stop.routes, 
	zIndex: zIndex
  }
}