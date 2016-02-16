from flask import Blueprint, request, render_template
import bustracker as btr

map_routes = Blueprint("map", __name__)
sortedRoute_ids, routeTitles = btr.getAllBusRoutes()

@map_routes.route("/")
def live_map():
  return render_template('liveMap.html', 
                          routeTitles = btr.routenamesdict,
                          rnums = sortedRoute_ids);
