# -*- coding: utf-8 -*-
"""
Created on Wed Mar 04 18:50:03 2015

@author: Rob
"""
from lxml import etree as et
import time
from google.transit import gtfs_realtime_pb2
import logging
import requests
import json
import sys
import dictChecker

logging.basicConfig(filename='ignore/bustracker.log',level=logging.DEBUG)
logger = logging.getLogger(__name__)


try:
    with open('ignore/mbta_api_key.txt', 'r') as f:
        api_key = f.readline().rstrip("\n")
except IOError:
    pass

mbta_rt_v3_url = 'https://api-v3.mbta.com/'

'''
First, update/create the static json files which are made
(and saved) using functions in dictmaker.py with the text files from
MBTA_GTFS_texts.  These text files can be downloaded from
http://www.mbta.com/uploadedfiles/MBTA_GTFS.zip
Note that these files change slightly about once every 3 months,
due to schedule and route changes.
'''
dictChecker.updateJson()


'''
Next, load the json files into dictionaries.
'''
with open('data/shapepathdict.json', 'r') as f:
	shapepathdict = json.load(f)
#dict of shape_id : [list of [lat,lon] for that shape]

with open('data/tripshapedict.json', 'r') as f:
	tripshapedict = json.load(f)
#dict of trip_id : shape_id

with open('data/routeshapedict.json', 'r') as f:
	routeshapedict = json.load(f)
#dict of route_id : [list of shape_ids for that route]

with open('data/shapestopsdict.json', 'r') as f:
	shapestopsdict = json.load(f)
#dict of shape_id : [LIST of stop_ids (in order) for that shape]

with open('data/routestopsdict.json', 'r') as f:
	routestopsdict = json.load(f)
#dict of route_id : [List of all stop_ids for that route_id]

with open('data/stoproutesdict.json', 'r') as f:
	stoproutesdict = json.load(f)
#dict of stop_id : [List of all route_ids for that stop_id]

with open('data/routenamesdict.json', 'r') as f:
	routenamesdict = json.load(f)
#dict of route_id : route_name
 
with open('data/routeinfodict.json', 'r') as f:
	routeinfodict = json.load(f)
#dict of route_id : {Dict of 'id', 'key', 'name', 'activity', 'type', 'sort_order'}

with open('data/shaperoutedict.json', 'r') as f:
	shaperoutedict = json.load(f)
#dict of shape_id : route_id

with open('data/stopinfodict.json', 'r') as f:
	stopinfodict = json.load(f)
#dict of stop_id : {Dict of 'stop_id', 'stop_name', 'lat', 'lon',
# 'parent' (if a child), 'children' (if a parent)}

with open('data/shapeinfodict.json', 'r') as f:
	shapeinfodict = json.load(f)
#dict of shape_id : {Dict of 'destination', 'direction', 'route_id'}

with open('data/shapestopseqdict.json', 'r') as f:
	shapestopseqdict = json.load(f)
#dict of shape_id : {Dict of stop_seq : stop_point_index}
 
with open('data/shapefinderdict.json', 'r') as f:
	shapefinderdict = json.load(f)
#dict of (route_id, direction) : {Dict of destination : shape_id}


class APIException(Exception):
   pass


def getAllRoutes():
    '''
    This is run once to get a list of all the bus and subway route_ids
    in a good order (subway first, then CTs and SLs, then numerical order),
    suitable for display on the landing page.
    '''
    routes = routeinfodict.values()
    routes.sort(key = lambda x : x['sort_order'])
    return [r['id'] for r in routes]

sortedRoute_ids = getAllRoutes()

def parseVehEntity(vent):
    '''
    Takes a GTFS vehicle entity and returns a dictionary of info about the vehicle
    '''
    vdict = dict()
    vdict['route_id'] = vent.vehicle.trip.route_id
    vdict['route'] = routenamesdict.get(vdict['route_id'])
    vdict['trip_id'] = vent.vehicle.trip.trip_id
    vdict['id'] = vent.vehicle.vehicle.id
    vdict['lat'] = vent.vehicle.position.latitude
    vdict['lon'] = vent.vehicle.position.longitude
    vdict['heading'] = vent.vehicle.position.bearing
    vdict['timestamp'] = vent.vehicle.timestamp
    shape_id = tripshapedict.get(vent.vehicle.trip.trip_id, '')
    if shape_id == '':
        vdict['destination'] = '?'
        vdict['direction'] = '?'
        vdict['shape_id'] = ''
    else:
        vdict['destination'] = shapeinfodict[shape_id]['destination']
        vdict['direction'] = shapeinfodict[shape_id]['direction']
        vdict['shape_id'] = shape_id
    if vdict['route_id'] == '':
        vdict['type'] = 'unknown'
    elif vdict['route_id'][0] == 'C':
        vdict['type'] = 'CR'
    elif vdict['id'][0] == 'y':
        vdict['type'] = 'bus'
    else:
        vdict['type'] = 'subway'
    return vdict


def parseTripEntity(tent):
    '''
    takes a GTFS trip entity and returns a dictionary of info about the trip
    '''
    tdict = dict()
    tdict['route_id'] = tent.trip_update.trip.route_id
    shape_id = tripshapedict.get(tent.trip_update.trip.trip_id, '')
    if shape_id == '':
        tdict['destination'] = '?'
        tdict['direction'] = '?'
        tdict['shape_id'] = ''
    else:
        tdict['destination'] = shapeinfodict[shape_id]['destination']
        tdict['direction'] = shapeinfodict[shape_id]['direction']
        tdict['shape_id'] = shape_id
    tdict['trip_id'] = tent.trip_update.trip.trip_id
    tdict['vehicle_id'] = tent.trip_update.vehicle.id
    stu = tent.trip_update.stop_time_update
    tdict['preds'] = [{'stop_seq' : str(x.stop_sequence),
                       'arr_time' : x.arrival.time,
                       'stop_id' : x.stop_id} for x in stu]
    if tdict['route_id'][0] == 'C':
        tdict['type'] = 'CR'
    elif tdict['route_id'][0] in '123456789':
        tdict['type'] = 'bus'
    else:
        tdict['type'] = 'subway'
    return tdict


def parseAlertEntity(aent):
    '''
    Takes a GTFS alert entity and returns a dictionary of info about the alert
    '''
    alerts = dict()
    alerts['alert_id'] = aent.id
    alerts['start_time'] = aent.alert.active_period[0].start
    alerts['end_time'] = aent.alert.active_period[0].end
    alerts['route_ids'] = sorted(list(set([x.route_id for x in aent.alert.informed_entity if x.route_id])))
    alerts['stop_ids'] = sorted(list(set([x.stop_id for x in aent.alert.informed_entity if x.stop_id])))
    alerts['header'] = [x.text for x in aent.alert.header_text.translation]
    alerts['description'] = [x.text for x in aent.alert.description_text.translation]
    return alerts


def getAllVehiclesGTFS_Raw():
    '''
    downloads the GTFS protobuffer Vehicles feed from mbta.com.
    Returns a list of unparsed GTFS vehicle entities
    '''
    feed = gtfs_realtime_pb2.FeedMessage()
    try:
        url = 'https://cdn.mbta.com/realtime/VehiclePositions.pb'
        response = requests.get(url, timeout = 10)
        if response.ok:
            feed.ParseFromString(response.content)
            return feed.entity
    except:
        er = sys.exc_info()
        logger.error(er)
        return []


def getAllTripsGTFS_Raw():
    '''
    downloads the GTFS protobuffer Trips feed from mbta.com.
    Returns a list of unparsed GTFS trip entities
    '''
    feed = gtfs_realtime_pb2.FeedMessage()
    try:
        url = 'https://cdn.mbta.com/realtime/TripUpdates.pb'
        response = requests.get(url, timeout = 10)
        if response.ok:
            feed.ParseFromString(response.content)
            return feed.entity
    except:
        er = sys.exc_info()
        logger.error(er)
        return []


def getAllAlertsGTFS_Raw():
    '''
    downloads the GTFS protobuffer Alerts feed from mbta.com.
    Returns a list of unparsed GTFS alert entities
    '''
    feed = gtfs_realtime_pb2.FeedMessage()
    try:
        url = 'https://cdn.mbta.com/realtime/Alerts.pb'
        response = requests.get(url, timeout = 10)
        if response.ok:
            feed.ParseFromString(response.content)
            return feed.entity
    except:
        er = sys.exc_info()
        logger.error(er)
        return []


def getAllVehiclesGTFS():
    '''
    downloads the most recent protobuffer Vehicles feed and returns a list of
    dictionaries with info for each vehicle
    '''
    parsed_vehicles = []
    raw_vehicles = getAllVehiclesGTFS_Raw()
    if raw_vehicles:
        for v in raw_vehicles:
            if v.vehicle.trip.route_id in routenamesdict:
                parsed_vehicles.append(parseVehEntity(v))
        logger.info('Got vehicles!  Number of vehicles: {0}'.format(len(parsed_vehicles)))
    else:
        logger.info('UH OH! Number of vehicles: {0}'.format(len(parsed_vehicles)))
    return parsed_vehicles


def getAllTripsGTFS():
    '''
    downloads the most recent protobuffer Trips feed and returns a list of
    dictionaries with info for each trip. Trips that are underway already or
    about to depart have a specific vehicle, but trips further in the future don't
    '''
    parsed_trips = []
    raw_trips = getAllTripsGTFS_Raw()
    if raw_trips:
        for t in raw_trips:
            if t.trip_update.trip.route_id in routenamesdict:
                parsed_trips.append(parseTripEntity(t))
        logger.info('Got trips!  Number of trips: {0}'.format(len(parsed_trips)))
    else:
        logger.info('UH OH!  Number of trips: {0}'.format(len(parsed_trips)))
    return parsed_trips


def getAllAlertsGTFS():
    '''
    downloads the most recent protobuffer Vehicles feed and returns a list of
    dictionaries with info for each vehicle
    '''
    parsed_alerts = []
    for a in getAllAlertsGTFS_Raw():
        parsed_alerts.append(parseAlertEntity(a))
    logger.info('Got Alerts!  Number of alerts: {0}'.format(len(parsed_alerts)))
    return parsed_alerts


def getAllStops():
    '''
    returns a list of dictionaries, one for each stop
    minus any generic subway "parent" stations
    '''
    stops = [stopinfodict[s] for s in stopinfodict if s[0] != 'p']
    for stop in stops:
        routenames = filter(lambda x : x!= '', [routenamesdict[route_id] for route_id in stoproutesdict.get(stop['stop_id'], '') ])
        stop['routes'] = ', '.join(routenames)
    return stops


def getNearbyStops(lat, lon, numstops = 15, radius = 800):
    '''
    returns a list of dictionaries, one for each of the stops nearest the
    given (lat, lon). It will return the GREATER number of stops from:
    1) the nearest (numstops) stops, regardless of distance, or
    2) all stops withing (radius) METERS

    That is, if you are in a sparse area and/or (radius) is very small, you will
    get (numstops) stops.  If you are in a congested area and/or (radius) is large,
    you will get all stops within (radius) meters.
    '''
    asradius = convertDist2ASD(radius)
    asdistlist = []
    for stop_id in stopinfodict:
        asdist = angularSquaredDist(lat, lon,
                                    stopinfodict[stop_id]['lat'],
                                    stopinfodict[stop_id]['lon'])
        asdistlist.append((stop_id, asdist))
    nearstops = filter(lambda x : x[1] < asradius, asdistlist)
    if len(nearstops) < numstops:
        asdistlist.sort(key = lambda x : x[1])
        nearstops = asdistlist[:numstops]
    stops = [stopinfodict[x[0]] for x in nearstops]
    for stop in stops:
        routenames = filter(lambda x : x!= '', [routenamesdict[route_id] for route_id in stoproutesdict.get(stop['stop_id'], '') ])
        stop['routes'] = ', '.join(routenames)
    return stops


def getStopsInRectangle(swlat, swlon, nelat, nelon):
    '''
    takes lat/lon for the southwest and northeast corners of a rectangle and
    returns a list of stopinfo dictionaries for the stops in that rectangle
    '''
    stops = []
    parent_stops = []
    for stop_id in stopinfodict:
        if (swlat < stopinfodict[stop_id]['lat'] < nelat) and  (swlon < stopinfodict[stop_id]['lon'] < nelon):
            if stop_id[:5] == 'place':
                parent_stops.append(stopinfodict[stop_id])
            else:
                stops.append(stopinfodict[stop_id])
    return stops, parent_stops



def getBusesOnRoutes(routelist):
    '''
    Takes a list of route_ids and returns a list of dictionaries, one for each
    vehicle currently on those routes
    '''
    vehicles = getAllVehiclesGTFS()
    return [veh for veh in vehicles if veh['route_id'] in routelist]


def getRoutesForStops(stopidlist):
    '''
    takes a list of stop_ids and returns a list of route_ids for all routes
    which go through those stops
    '''
    routeidlist = []
    for stop_id in stopidlist:
        routeidlist += stoproutesdict.get(stop_id, [])
    routeidlist = list(set(routeidlist))
    return routeidlist


def getParentsAmongStops(stopidlist):
    '''
    takes a list of stop_ids and returns a list of dictionaries, one for each
    of the parent stops that is in the list stopidlist
    '''
    parents = []
    for stop_id in stopidlist:
        stopinfo = stopinfodict[stop_id]
        if stopinfo.get('children', ''):
            route_ids = stopinfo.get('route_ids')
            routenames = filter(lambda x : x!= '', [routenamesdict.get(route_id, '') for route_id in route_ids])
            routenames = sorted(list(set(routenames)))
            stopinfo['routes'] = ', '.join(routenames)
            parents.append(stopinfo)
    return parents


def getParentsForStops(stopidlist):
    '''
    takes a list of stop_ids and returns a list of dictionaries, one for each
    parent stop that has children in the list stopidlist
    '''
    parent_ids = []
    for stop_id in stopidlist:
        stopinfo = stopinfodict[stop_id]
        if stopinfo.get('parent', ''):
            parent_ids.append(stopinfo.get('parent'))
    parent_ids = list(set(parent_ids))
    parents = [stopinfodict[parent_id] for parent_id in parent_ids]
    return parents



def angularSquaredDist(lat1, lon1, lat2, lon2):
    '''
    calculates a number proportional to the squared distance, computationally
    much more efficient than calculating the distance
    '''
    dlon = lon1 - lon2
    dlat = lat1 - lat2
    return dlat**2 + (.742*dlon)**2

def convertASD2Dist(asdist):
    '''converts the "angular squared distance" to distance in meters'''
    return 111120*((asdist)**.5)

def convertDist2ASD(dist_meters):
    '''converts distance in meters to "angular squared distance" '''
    return (dist_meters/float(111120))**2


def convertll2xy(latlon):
    '''
    converts a (lat, lon) to x, y coordinates in meters
    origin of x-y coords is lat: 42.3572, lon: -71.0926: Mass Ave & Memorial Drive
    1 degree lat = 111120 meters, 1 degree lon = 82600 meters
    '''
    lat, lon = latlon
    return (int((lon +71.0926)*82600), int((lat - 42.3572)*111120))


def convertxy2latlon(xy):
    '''
    converts x, y coordinates in meters to (lat, lon)
    origin of x-y coords is lat: 42.3572, lon: -71.0926 Mass Ave & Memorial Drive
    1 degree lat = 111120 meters, 1 degree lon = 82600 meters
    '''
    x,y = xy
    return (y/float(111120) + 42.3572, x/float(82600) - 71.0926)


def distxy(xy1, xy2):
    dx = xy1[0] - xy2[0]
    dy = xy1[1] - xy2[1]
    return (dx**2 + dy**2)**.5


def distll(lat1, lon1, lat2, lon2):
    return ((111120*(lat1 - lat2))**2 + (82600*(lon1 - lon2))**2)**.5


def trip2route(trip_id):
    '''
    takes a trip_id and returns the shape_id for that trip
    '''
    return shaperoutedict.get(tripshapedict.get(trip_id), '')

def trip2stops(trip_id):
    '''
    takes a trip_id and returns a list of stop_ids, in order, for that trip
    '''
    return shapestopsdict.get(tripshapedict.get(trip_id), '')


def findClosestPoint(lat, lon, path):
    '''
    takes a (vehicle) lat and lon and a path (list of (lat, lon)) and returns
    the INDEX of the path point closest to the given location
    '''
    closest_i = 0
    min_asdist = 99999
    numpoints = len(path)
    for i in range(numpoints):
        pathlat, pathlon = path[i]
        asdist = angularSquaredDist(lat, lon, pathlat, pathlon)
        if asdist < min_asdist:
            closest_i = i
            min_asdist = asdist
    return closest_i


def findClosestPointFast(lat, lon, path):
    '''
    takes a (vehicle) lat and lon and a path (list of (lat, lon)) and returns
    the INDEX of the path point closest to the given location
    '''
    cs = 10
    numpoints = len(path)
    reduced_path = path[0:numpoints:cs]
    k = cs * findClosestPoint(lat, lon, reduced_path)
    if k == 0:
        refined_path = path[0:20]
        return findClosestPoint(lat, lon, refined_path)
    elif k == (numpoints-1) - (numpoints-1)%cs:
        refined_path = path[-20:]
        return numpoints - 20 + findClosestPoint(lat, lon, refined_path)
    else:
        refined_path = path[k - cs: k + cs]
        return k - cs + findClosestPoint(lat, lon, refined_path)



def buildAnimationDicts(path, first_i, start_lat, start_lon, start_time, speed):
    '''
    takes a path, a starting lat and lon not on the path, the index of the
    first path point to go to, the starting timestamp, and the speed in m/s
    returns a list of {time, lat, lon} dicts
    '''
    last_i = len(path) - 1
    curr_time = start_time
    timepoints = []
    i = first_i
    curr_lat, curr_lon = start_lat, start_lon
    while (curr_time < start_time + 180) and (i <= last_i):
        next_lat, next_lon = path[i]
        dx = distll(curr_lat, curr_lon, next_lat, next_lon)
        dt = dx/float(speed)
        if dx > 1:
            timepoints.append({'time':round(curr_time + dt, 2),
                               'lat':next_lat, 'lon':next_lon})
        curr_lat, curr_lon = next_lat, next_lon
        curr_time += dt
        i += 1
    return timepoints


def getStopPointIndices(shape_id):
    '''
    takes a shape_id and returns a list of indices which correspond to the path
    points that are closest to the stops for the path for that shape
    '''
    path = shapepathdict[shape_id]
    stops = shapestopsdict[shape_id]
    stop_point_indices = []
    for stop_id in stops:
        stopinfo = stopinfodict[stop_id]
        stop_point_indices.append(findClosestPoint(stopinfo['lat'], stopinfo['lon'], path))
    return stop_point_indices


def calcAlpha(plat1, plon1, plat2, plon2, vlat, vlon):
    '''
    takes the endpoints of a path segment from p1 to p2, and the position of a vehicle
    v, and calculates the proportion from p1 to p2 where the projection of v onto
    the line through p1 and p2 would be.  e.g. alpha = 0 corresponds to p1,
    alpha = .8 is 80% of the way from p1 to p2, alpha < 0 means v projects onto
    a point behind p1, and alpha > 1 means v projects past p2.
    '''
    py = plat2 - plat1
    px = .742*(plon2 - plon1)
    if px == 0 and py == 0:
        return 0
    ry = vlat - plat1
    rx = .742*(vlon - plon1)
    alpha = (rx*px + ry*py)/(px**2 + py**2)
    return alpha


def projectVehOnSeg(plat1, plon1, plat2, plon2, vlat, vlon):
    '''
    takes the endpoints of a path segment from p1 to p2, and the position of a vehicle
    v, and calculates the point on the segment closest to v
    '''
    alpha = calcAlpha(plat1, plon1, plat2, plon2, vlat, vlon)
    if alpha < 0:
        return [plat1, plon1]
    elif alpha > 1:
        return [plat2, plon2]
    else:
        return [plat1 + alpha*(plat2 - plat1), plon1 + alpha*(plon2 - plon1)]

def calcPathLength(path):
    numsegs = len(path) - 1
    totlen = 0
    for i in range(numsegs):
        lat1, lon1 = path[i]
        lat2, lon2 = path[i+1]
        totlen += distll(lat1, lon1, lat2, lon2)
    return totlen


def calcTimepointsSection(path, start_time, finish_time):
    '''
    return a list of timepoints NOT INCLUDING path[0]!!!
    (in order to avoid duplication of points when sections are concatenated)
    '''
    total_dist = calcPathLength(path) + .01
    speed = total_dist / (finish_time + .01 - start_time)
    timepoints = []
    numsegs = len(path) - 1
    curr_lat, curr_lon = path[0]
    curr_time = start_time
    for i in range(numsegs):
        next_lat, next_lon = path[i + 1]
        dx = distll(curr_lat, curr_lon, next_lat, next_lon)
        dt = dx/speed
        if dx > 1:
            timepoints.append({'time':round(curr_time + dt, 2),
                               'lat':next_lat, 'lon':next_lon})
        curr_lat, curr_lon = next_lat, next_lon
        curr_time += dt
    return timepoints



def getTimepoints(vlat, vlon, veh_stamp, shape_id, preds):
    '''
    1) figure out where to project the veh onto the path - need both ll and index of next pathpoint
    2) figure out the path point index for each pred
    3) figure out distance to first pred --> get speed --> get timepoints
    4) figure out distance to subsequent preds --> get speed --> get timepoints
    '''
    path = shapepathdict[shape_id]
    time_now = int(time.time())
    stop_seq_ind_dict = shapestopseqdict[shape_id]
    future_preds = [p for p in preds if p['arr_time'] > time_now]
    if len(future_preds) == 0:
        return [{'time':round(veh_stamp, 2),'lat':vlat, 'lon':vlon},
                 {'time':preds[-1]['arr_time'],'lat':path[-1][0], 'lon':path[-1][1]}]
    first_pred = future_preds[0]
    if first_pred.get('stop_seq') == '1':
        first_point = path[0]
        second_pred = future_preds[1]
        second_i = stop_seq_ind_dict.get(second_pred.get('stop_seq'), path[1])
    else:
        nearest_point_i = findClosestPointFast(vlat, vlon, path)
        if nearest_point_i >= len(path) - 2:
            return [{'time':round(veh_stamp, 2),'lat':vlat, 'lon':vlon},
                    {'time':first_pred['arr_time'],'lat':path[-1][0], 'lon':path[-1][1]}]
        i = nearest_point_i
        if path[i - 1] != path[i]:
            prev_seg = [path[i - 1], path[i]]
        else:
            prev_seg = [path[i - 2], path[i]]
        if path[i + 1] != path[i]:
            next_seg = [path[i], path[i + 1]]
            next_end_i = i + 1
        else:
            next_seg = [path[i], path[i + 2]]
            next_end_i = i + 2
        prev_alpha = calcAlpha(prev_seg[0][0], prev_seg[0][1], prev_seg[1][0], prev_seg[1][1], vlat, vlon)
        if 0 < prev_alpha < 1:
            first_point = projectVehOnSeg(prev_seg[0][0], prev_seg[0][1], prev_seg[1][0], prev_seg[1][1], vlat, vlon)
            second_i = i
        else:
            first_point = projectVehOnSeg(next_seg[0][0], next_seg[0][1], next_seg[1][0], next_seg[1][1], vlat, vlon)
            second_i = next_end_i


    timepoints = [{'time':round(veh_stamp, 2),
                   'lat':first_point[0], 'lon':first_point[1]}]
    path_i = second_i
    first_path_section = [first_point] + path[path_i:stop_seq_ind_dict.get(first_pred['stop_seq'], path_i)]
    timepoints += calcTimepointsSection(first_path_section, veh_stamp, first_pred['arr_time'])
    curr_time = first_pred['arr_time']
    curr_stop_seq = first_pred['stop_seq']
    pred_i = 1 #keep track of the pred to use for the END of the NEXT section
    while (curr_time < time_now + 180) and (pred_i <= len(future_preds) - 1):
        curr_pred = future_preds[pred_i] #the pred for the END of the section
        prev_stop_seq = curr_stop_seq
        curr_stop_seq = curr_pred['stop_seq']
        if curr_stop_seq in stop_seq_ind_dict:
            curr_path_i = stop_seq_ind_dict.get(curr_stop_seq, path_i) #path point index for END of the section
            prev_path_i = stop_seq_ind_dict.get(prev_stop_seq, path_i) #path point index for START of the section
            curr_path_section = path[prev_path_i : curr_path_i]
            prev_time = curr_time
            curr_time = curr_pred['arr_time']
            if len(curr_path_section) > 1:
                timepoints += calcTimepointsSection(curr_path_section, prev_time, curr_time)
            pred_i += 1
        else:
            break
    return timepoints



def getUnschedTripInfoV3(trip_id_list):
    infodict = dict()
    data = []
    try: 
        response = requests.get(mbta_rt_v3_url + 'trips?filter[id]=' + ','.join(trip_id_list))
        if response.ok:
            data = response.json()['data']
    except:
        er = sys.exc_info()
        logger.error(er)
        return infodict

    for datum in data:
        trip_id = datum['id']
        attributes = datum['attributes']
        dest = attributes['headsign']
        info = {'destination' : dest,
                'direction' : str(attributes['direction_id']),
                'route_id': datum['relationships']['route']['data']['id']}
        shape_key = info['route_id'] + '_' + info['direction']
        if shape_key in shapefinderdict:
            shapes_by_dest = shapefinderdict[shape_key]
            if dest in shapes_by_dest:
                info['shape_id'] = shapes_by_dest[dest]
            else:
                info['shape_id'] = shapes_by_dest['default']
        infodict[trip_id] = info
    return infodict
    

def getShapeForUnschedTrip(route_id, direction, destination):
    '''
    For unscheduled trip with trip_id not in static GTFS dictionaries, try to
    find a shape_id with the same direction and destination
    '''
    shape_ids = routeshapedict[route_id]
    dir_shape_ids = [x for x in shape_ids if shapeinfodict.get(x).get('direction') == direction]
    dir_shape_ids.sort(key = lambda x : len(shapepathdict[x]))
    if len(dir_shape_ids) == 0:
        return ''
    ok_shape_ids = [x for x in dir_shape_ids if (shapeinfodict.get(x, ' ').get('destination', ' '))[:6] == destination[:6]]
    if len(ok_shape_ids) == 0:
        return ''
    else:
        return ok_shape_ids[-1] #if multiple matches, return the shape_id with the longest path


def seglist2Pathlist(seglist):
    '''
    takes a list of segments and returns a list of paths made by stitching the segments together
    '''
    if len(seglist) <= 1:
        return []
    pathlist = []
    curr_seg = seglist.pop(0)
    curr_path = [curr_seg[0], curr_seg[1]]
    for seg in seglist:
        if seg[0] == curr_path[-1]:
            curr_path.append(seg[1])
        else:
            if len(curr_path) > 1: pathlist.append(curr_path)
            curr_path = [seg[0], seg[1]]
    pathlist.append(curr_path)
    return pathlist

def stopPointEliminator(path):
    '''
    takes a path and eliminates BOTH copies of the points that are added at each stop
    we only do this for DRAWING the paths on the map
    '''
    i = 0
    numpts = len(path)
    output_path = []
    while i < numpts - 1:
        if path[i] != path[i + 1]:
            output_path.append(path[i])
            i += 1
        else:
            i += 2
    output_path.append(path[-1])
    return output_path

def pathReducer(pathlist):
    '''
    takes a list of paths and returns a list of paths with no overlap (no repeated segments)
    '''
    segset = set()
    reduced_pathlist = []
    pathlist.sort(key = len, reverse = True) #start with the longest path
    pathnum = 0
    for pa in pathlist:
        path = stopPointEliminator(pa)
        curr_reduced_path_segs = []
        numpts = len(path)
        for i in range(numpts -1):
            curr_seg = tuple(sorted([tuple(path[i]), tuple(path[i+1])]))
            if curr_seg not in segset:
                segset.add(curr_seg)
                curr_reduced_path_segs.append([path[i], path[i+1]])
        if pathnum == 0:
            newpaths = [path]
        else:
            newpaths = seglist2Pathlist(curr_reduced_path_segs)
        reduced_pathlist.extend(newpaths)
        pathnum += 1
    return reduced_pathlist


def pathAnalyzer(path, longseg = 100):
    '''
    takes a path and returns: number of segments, total length of path, avg segment length
    '''
    numsegs = len(path) - 1
    totlen = 0
    longsegs = []
    for i in range(numsegs):
        lat1, lon1 = path[i]
        lat2, lon2 = path[i+1]
        seglength = distll(lat1, lon1, lat2, lon2)
        if seglength > longseg:
            longsegs.append(int(seglength))
        totlen += seglength
    avglen = totlen/numsegs
    return numsegs, round(totlen), round(avglen, 1), sorted(longsegs)


def routeAnalyzer(route_id, longseg = 100):
    for shape_id in routeshapedict.get(route_id):
        print shape_id, pathAnalyzer(shapepathdict.get(shape_id), longseg)




# some lat/lon points for testing purposes
MassAveMemDrLatLon = (42.3572, -71.0926)
KendallLatLon =  (42.362392, -71.084301)
DTXLatLon = (42.355741, -71.060537)


'''
The next function is semi-obsolete.  It gets path points from NextBus.
'''



def getLatLonPathsByRoute(rtnum):
    rttree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=mbta&r=' + str(rtnum))
    rtroot = rttree.getroot()
    route = rtroot.getchildren()[0]
    latMin, latMax = float(route.attrib['latMin']), float(route.attrib['latMax'] )
    lonMin, lonMax = float(route.attrib['lonMin']), float(route.attrib['lonMax'] )
    allElements = route.getchildren()
    allpaths = [[(float(pt.attrib['lat']),float(pt.attrib['lon'])) for pt in pa.getchildren()] for pa in allElements if pa.tag == 'path']
    centerLatLon = (.5*(latMin + latMax), .5*(lonMin + lonMax))
    return allpaths, centerLatLon
