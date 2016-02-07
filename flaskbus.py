# -*- coding: utf-8 -*-
"""
Created on Mon Aug 10 20:17:59 2015

@author: Rob
"""

from flask import Flask, render_template, url_for, request, redirect, session
import bustracker as btr

app = Flask(__name__)

app.secret_key = 'F12Zr47j\3yX R~X@H!jmM]Lwf/,?KT'

sortedRoutenums, routeTtitles = btr.getAllBusRoutes()
 


@app.route("/", methods=["GET","POST"])
def hello():
    if request.method == 'GET':
        return render_template('chooseRoute.html', routeTtitles = btr.routenamesdict,
                               rnums = sortedRoutenums);
    elif request.method == 'POST':
        routenum = request.form['routenum'];
        return redirect(url_for('routes',  routenum = routenum))
    
    
@app.route("/routes/<string:routenum>", methods=["GET","POST"])
def routes(routenum):
    rt = btr.Route(routenum)
    allStops = rt.allStops
    varTitles = rt.varTitles
    if request.method == 'GET':
        return render_template('chooseVar.html', routenum = routenum,
                               varTitles = varTitles, routeTtitle = routeTtitles[routenum],
                           stops = allStops, backLink = url_for('hello'))
    elif request.method == 'POST':
        var = request.form['var'];
        return redirect(url_for('routeVar',  routenum = routenum,
                                var = var))
                    
                    
@app.route("/routes/<string:routenum>/<string:var>", methods=["GET","POST"])
def routeVar(routenum, var):
    rt = btr.Route(routenum)
    #currentVars = rt.getCurrentVars()
    varTitles = rt.varTitles
    return render_template('showRoute.html', routenum = routenum, var = var, 
                           varTitles = varTitles, routeTitle = routeTtitles[routenum],
                           stops = rt.getStopsOneVar(var), backLink = url_for('hello'))


@app.route("/stops/<string:routenum>/<string:var>/<string:stoptag>", methods=["GET","POST"])
def stopVar(routenum, var, stoptag):
    if '_' in stoptag:
        stoptag = stoptag.split('_')[0]   
    rt = btr.Route(routenum)
    #currentVars = rt.getCurrentVars()
    currentBuses = rt.getCurrentBuses()
    varTitles = rt.varTitles
    stop = btr.Stop(stoptag)
    preds = stop.getStopPreds()
    return render_template('showStopVar.html', routenum = routenum, 
                           buses = currentBuses, preds = preds, routeTitle = routeTtitles[routenum],
                           var = var, allstops = rt.allStops, varTitles = varTitles,
                           stoptag = stoptag, backLink = url_for('hello'))

@app.route("/maptrip/<string:trip_id>/<string:map_id>", methods=["GET","POST"])
def mapByTrip(trip_id, map_id):
    if trip_id == 'all':
        tripidlist = [trip['trip_id'] for trip in btr.getAllTripsGTFS() if trip['type'] == 'bus']
    else:
        tripidlist = [trip_id]
    shapeidlist = list(set([btr.tripshapedict[tripid] for tripid in tripidlist]))
    trippaths = [btr.getPixTripPath(shape_id, map_id) for shape_id in shapeidlist]
    if request.method == 'GET':
        return render_template('mapwithroutes.html', paths = trippaths,
                               map_id = map_id);

                             
@app.route("/maproute/<string:route_id>/<string:map_id>", methods=["GET","POST"])
def mapByRoute(route_id, map_id):
    routepaths = btr.getPixRoutePaths(route_id, map_id)
    if request.method == 'GET':
        return render_template('mapwithroutes.html', paths = routepaths,
                               map_id = map_id);
 
                              
@app.route("/googmaproute/<string:route_id>", methods=["GET","POST"])
def googleMapByRoute(route_id):
    routepaths, centerLatLon = btr.getLatLonPathsByRoute(route_id)
   # routepaths = [btr.shapepathdict[shape_id] for shape_id in btr.routeshapedict[route_id]]
    vehicles = btr.getAllVehiclesGTFS() 
    vehlist = [veh for veh in vehicles if veh['route_id'] == route_id]
    if request.method == 'GET':
        return render_template('googleMapRoute.html', paths = routepaths,
                               centerLatLon = centerLatLon, buses = vehlist);

                               
@app.route("/googmaptrip/<string:trip_id>", methods=["GET","POST"])
def googleMapByTrip(trip_id):
    centerLatLon = btr.MassAveMemDrLatLon
    vehicles = btr.getAllVehiclesGTFS()
    if trip_id == 'all':
        tripidlist = [trip['trip_id'] for trip in btr.getAllTripsGTFS() if trip['type'] == 'bus']
        vehlist = [veh for veh in vehicles if veh['type'] == 'bus']
    else:
        tripidlist = [trip_id]
        path = btr.shapepathdict[btr.tripshapedict[trip_id]]
        startLat, startLon = path[0] 
        endLat, endLon = path[-1]
        centerLatLon = (.5*(startLat + endLat), .5*(startLon + endLon))
        vehlist = [veh for veh in vehicles if veh['trip_id'] == trip_id]
    shapeidlist = list(set([btr.tripshapedict[tripid] for tripid in tripidlist]))
    trippaths = [btr.shapepathdict[shape_id] for shape_id in shapeidlist]
    
    if request.method == 'GET':
        return render_template('googleMapRoute.html', paths = trippaths,
                               centerLatLon = centerLatLon, buses = vehlist);


@app.route("/googmapstops", methods=["GET","POST"])
def googleMapStops():
    centerLatLon = btr.MassAveMemDrLatLon
    stops = btr.getAllStops()
    if request.method == 'GET':
        return render_template('googleMapRoute.html',
                               centerLatLon = centerLatLon, stoplist = stops);


@app.route("/testlocation", methods=["GET","POST"])
def testlocation():
    if request.method == 'GET':
        return render_template('TESTgetLOCATION.html');
    elif request.method == 'POST':
        lat = request.json.get('latitude')
        lon = request.json.get('longitude')
        session['lat'] = lat
        session['lon'] = lon
        return redirect(url_for('mapLocation'))


@app.route("/maplocation", methods=["GET","POST"])
def mapLocation():
    if request.method == 'GET':
        lat = float(request.args['lat'])
        lon = float(request.args['lon'])
        radius = float(request.args.get('radius', 800))
        numstops = int(request.args.get('numstops', 15))
        #lat, lon = btr.KendallLatLon
        nearby_stops = btr.getNearbyStopsSelf(lat, lon, numstops, radius)
        routeidlist = []
        for stop in nearby_stops:
            if stop.get('stop_id') in btr.stoproutesdict:
                for route_id in btr.stoproutesdict.get(stop.get('stop_id')):
                    routeidlist.append(route_id)
        nearby_stops = [btr.json.dumps(x) for x in nearby_stops]
        routeidlist = list(set(routeidlist))
        routelist = [btr.routenamesdict[route_id] for route_id in routeidlist]
        print routelist
        buses = [btr.json.dumps(x) for x in btr.getBusesOnRoutes(routeidlist)]
        routepathdict = dict()
        for route_id in routeidlist:
            #routepathdict[route_id] = btr.getLatLonPathsByRoute(route_id)[0]
            routepathdict[route_id] = [btr.shapepathdict[shape_id] for shape_id in btr.routeshapedict[route_id]]
        return render_template('googleMapLoc.html', centerLatLon = (lat,lon),
                               stoplist = nearby_stops, routepathdict = routepathdict,
                               buses = buses);


if __name__ == "__main__":
    app.run(debug=True)