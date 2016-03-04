from flask import Blueprint, request, abort, json, jsonify
from datetime import datetime

import bustracker as btr
import currentdata

api_routes = Blueprint("api", __name__)

@api_routes.route("/bus_updates")
def bus_updates():
    route_ids = request.args.get("routes", "")

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

    # Timestamp in seconds
    since = request.args.get("since", "")

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
                path  = btr.shapepathdict.get(shape_id, [])
                veh['timepoints'] = btr.getAnimationPoints(path, veh.get('lat'),
                                        veh.get('lon'), veh.get('timestamp'), 6)
            else:
                veh['timepoints'] = [{'lat' : veh.get('lat'),
                                        'lon' : veh.get('lon'), 
                                        'time' :veh.get('timestamp')}]
    else:
        vehicles = []

    # if since:
    #     when = long(since)
    #     vehicles = [veh for veh in vehicles if int(veh["timestamp"]) > when]
    now_stamp = (datetime.now() - datetime.fromtimestamp(0)).total_seconds()

    return jsonify(buses = vehicles, 
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
        abort(401)

    shape_ids = btr.routeshapedict.get(route_id)
    paths = [btr.shapepathdict.get(shape_id) for shape_id in shape_ids]
    stop_ids = btr.routestopsdict.get(route_id)
    stops = [btr.stopinfodict.get(stop_id) for stop_id in stop_ids]
    routename = btr.routenamesdict.get(route_id)
    return jsonify(routename = routename,
                    paths = paths, 
                   stops = stops)





