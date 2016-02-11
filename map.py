from flask import Blueprint, request, render_template

map_routes = Blueprint("map", __name__)

@map_routes.route("/")
def live_map():
    return render_template("liveMap.html")
