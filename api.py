from flask import Blueprint, request, abort, json, jsonify
from datetime import datetime

import bustracker as btr

api_routes = Blueprint("api", __name__)

@api_routes.route("/bus_updates")
def bus_updates():
    route_id = request.args.get("route", "")

    # Timestamp in seconds
    since = request.args.get("since", "")

    if not route_id:
        abort(401)

    route = btr.Route(route_id)
    buses = route.getCurrentBuses()

    if since:
        when = datetime.fromtimestamp(int(since))

        dt = ((datetime.now() - when).total_seconds())
        buses = [bus for bus in buses if int(bus["secsSinceReport"]) <= dt]

    now_stamp = (datetime.now() - datetime.fromtimestamp(0)).total_seconds()

    return jsonify(
        buses=map(dict, buses),
        stamp=int(now_stamp))

