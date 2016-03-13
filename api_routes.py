from flask import Blueprint, request, abort, json, jsonify
from datetime import datetime

import bustracker as btr
import currentdata

api_routes = Blueprint("api", __name__)

@api_routes.route("/bus_updates")
def bus_updates():   
    vehicle_ids = request.args.get("vehicles", "")
    vehicle_idlist = vehicle_ids.split(',')
    if vehicle_ids:
        vehicle_preds = currentdata.current_data.getPredsForVehicles(vehicle_idlist)
    else:
        vehicle_preds = None

    stop_ids = request.args.get("stops", "")
    stop_idlist = stop_ids.split(',')
    if stop_ids:
        stops = currentdata.current_data.getPredsForStops(stop_idlist)
    else:
        stops = None
    
    route_ids = request.args.get("routes", "")    
    active_shapes = []
    if route_ids:
        route_idlist = route_ids.split(',')
        vehicles = currentdata.current_data.getVehiclesOnRoutes(route_idlist)
        for veh in vehicles:
            shape_id = btr.tripshapedict.get(veh.get('trip_id'), '')
            if shape_id == '': #Unscheduled trip. Try to get shape_id by matching direction and destination
                shape_id = btr.getShapeForUnschedTrip(veh.get('route_id', ''),
                                                      veh.get('direction', ''), 
                                                      veh.get('destination', ''))
            if shape_id != '':
                active_shapes.append(shape_id)
                path  = btr.shapepathdict.get(shape_id, [])
                veh['timepoints'] = btr.getAnimationPoints(path, veh.get('lat'),
                                        veh.get('lon'), veh.get('timestamp'), 6)
            else:
                veh['timepoints'] = [{'lat' : veh.get('lat'),
                                        'lon' : veh.get('lon'), 
                                        'time' :veh.get('timestamp')}]
    else:
        vehicles = []
    active_shapes = sorted(list(set(active_shapes)))
    
    since = request.args.get("since", "") # Timestamp in seconds
    # if since:
    #     when = long(since)
    #     vehicles = [veh for veh in vehicles if int(veh["timestamp"]) > when]
    now_stamp = (datetime.now() - datetime.fromtimestamp(0)).total_seconds()

    return jsonify(buses = vehicles,
                   active_shapes = active_shapes, 
                   stamp = int(now_stamp),
                   stops = stops,
                   vehicle_preds = vehicle_preds)

@api_routes.route("/routes")
def bus_routes():
    #the route_ids are in a reasonable order for a user to choose from
    route_ids, routeTitles = btr.getAllRoutes()
    return jsonify(route_ids = route_ids, 
                   routeTitles = routeTitles)


@api_routes.route("/routeinfo")
def route_info():
    route_id = request.args.get("route", "")

    if not route_id:
        abort(404)

    try:
        shape_ids = btr.routeshapedict[route_id]
    except KeyError:
        abort(404)

    shape2path = dict([(shid, btr.shapepathdict.get(shid)) for shid in shape_ids])
    paths = btr.pathReducer([btr.shapepathdict.get(shape_id) for shape_id in shape_ids])
    stop_ids = btr.routestopsdict.get(route_id)
    stops = [btr.stopinfodict.get(stop_id) for stop_id in stop_ids]
    routename = btr.routenamesdict.get(route_id)
    return jsonify(routename = routename,
                   paths = paths,
                   stops = stops,
                   shape2path = shape2path)

@api_routes.route("/locationinfo")
def location_info():
    lat = float(request.args.get('lat', 40))
    lon = float(request.args.get('lon', -71))
    radius = float(request.args.get('radius', 800))
    numstops = int(request.args.get('numstops', 15))
    
    if lat == 40:
        abort(401)
        
    nearby_stops = btr.getNearbyStops(lat, lon, numstops, radius)
    routeidlist = btr.getRoutesForStops([stop.get('stop_id') for stop in nearby_stops])
    parent_stops = btr.getParentStops([s['stop_id'] for s in nearby_stops])        
    return jsonify(stops = nearby_stops,
                   routes = routeidlist, 
                   parent_stops = parent_stops)





