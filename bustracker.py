# -*- coding: utf-8 -*-
"""
Created on Wed Mar 04 18:50:03 2015

@author: Rob
"""
import math
from lxml import etree as et
import time
import matplotlib.pyplot as pl
from google.transit import gtfs_realtime_pb2
import urllib, requests
import json
import socket
import errno  
import google.protobuf.message


api_key = 'wX9NwuHnZU2ToO7GmGR9uw'
mbta_rt_url = 'http://realtime.mbta.com/developer/api/v2/'

#AG Mednet stopid:234 LatLon:(42.3639399, -71.0511499)   xyCoords:(3423, 749)
#Mass Ave @ Hollis{'lat': '42.39434', 'stopId': '2297', 'tag': '2297', 'lon': '-71.12703', 'title': 'Massachusetts Ave @ Hollis St'}
#UL corner of LM:(42.562689, -71.363924) LR corner:(42.204517,-70.831752)
#largemap 775 X 708

#UL corner of CM:(42.400886, -71.145444) LR corner:(42.331188, -71.044320)
#Centralmap 751 X 699
MassAveMemDrLatLon = (42.3572, -71.0926)
KendallLatLon =  (42.362392, -71.084301)
DTXLatLon = (42.355741, -71.060537)

'''
First, load several dictionaries from json files.  These dictionaries are made 
(and saved) using functions in dictmaker.py with the text files from 
MBTA_GTFS_texts, a folder which can be downloaded from 
http://www.mbta.com/uploadedfiles/MBTA_GTFS.zip Note that these files change 
slightly about once every 3 months, due to schedule and route changes.
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
#dict of shape_id : [LIST of stops (in order) for that shape]

with open('data/routestopsdict.json', 'r') as f:
	routestopsdict = json.load(f)
#dict of route_id : [List of all stop_ids for that route_id]

with open('data/stoproutesdict.json', 'r') as f:
	stoproutesdict = json.load(f)
#dict of stop_id : [List of all route_ids for that stop_id]

with open('data/routenamesdict.json', 'r') as f:
	routenamesdict = json.load(f)
#dict of route_id : route_name

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
  
            
    
def getAllRoutes():
    '''
    This is run once by flaskbus.py to get a list of all the bus and subway route_ids 
    in a good order (subway first, then CTs and SLs, then numerical order), 
    suitable for display on the landing page.
    '''
    tree = et.parse('http://realtime.mbta.com/developer/api/v2/routes?api_key=' + api_key + '&format=xml')
    root = tree.getroot()
    modes = root.getchildren()
    for mode in modes:
        if mode.attrib['route_type'] == '0':
            trolley_routes = mode.getchildren()
        if mode.attrib['route_type'] == '1':
            subway_routes = mode.getchildren()
        if mode.attrib['route_type'] == '3':
            bus_routes = mode.getchildren()
    allroutes = trolley_routes + subway_routes + bus_routes
    sortedRoute_ids = [x.attrib['route_id'] for x in allroutes]
    routes = dict([(x.attrib['route_id'], x.attrib['route_name']) for x in allroutes])
    return sortedRoute_ids, routes
        
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
    else:
        vdict['destination'] = shapeinfodict[shape_id]['destination']
        vdict['direction'] = shapeinfodict[shape_id]['direction']
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
    else:
        tdict['destination'] = shapeinfodict[shape_id]['destination']
        tdict['direction'] = shapeinfodict[shape_id]['direction']
    tdict['trip_id'] = tent.trip_update.trip.trip_id
    stu = tent.trip_update.stop_time_update
    tdict['preds'] = [{'stop_seq' : x.stop_sequence,
                       'arr_time' : x.arrival.time,
                       'stop_id' : x.stop_id} for x in stu] 
    if tdict['route_id'][0] == 'C':
        tdict['type'] = 'CR'
    elif tdict['route_id'][0] in '123456789':
        tdict['type'] = 'bus'
    else:
        tdict['type'] = 'subway'
    return tdict    
    
    
def getAllVehiclesGTFS_Raw():
    '''
    downloads the GTFS protobuffer Vehicles feed from mbta.com. 
    Returns a list of unparsed GTFS vehicle entities
    '''
    feed = gtfs_realtime_pb2.FeedMessage()
    #response = urllib.urlopen('http://developer.mbta.com/lib/GTRTFS/Alerts/VehiclePositions.pb')
    #feed.ParseFromString(response.read())
    #return feed.entity
    try:
        url = 'http://developer.mbta.com/lib/GTRTFS/Alerts/VehiclePositions.pb'
        response = requests.get(url, timeout = 10)
        if response.ok:
            feed.ParseFromString(response.content)       
            return feed.entity
    except socket.error as error:
        if error.errno == errno.WSAECONNRESET:
            return []
    except socket.error as error:
        if error.errno == errno.ECONNRESET:
            return []
    except (google.protobuf.message.DecodeError, requests.exceptions.ChunkedEncodingError,
            UnicodeDecodeError):
        return []
    except requests.exceptions.RequestException as e:    
        print e
        return []


def getAllTripsGTFS_Raw():
    '''
    downloads the GTFS protobuffer Trips feed from mbta.com.  
    Returns a list of unparsed GTFS trip entities
    '''
    feed = gtfs_realtime_pb2.FeedMessage()
    #response = urllib.urlopen('http://developer.mbta.com/lib/GTRTFS/Alerts/TripUpdates.pb')
    #feed.ParseFromString(response.read())

    try:
        url = 'http://developer.mbta.com/lib/GTRTFS/Alerts/TripUpdates.pb'
        response = requests.get(url, timeout = 10)
        if response.ok:
            feed.ParseFromString(response.content)       
            return feed.entity
    except socket.error as error:
        if error.errno == errno.WSAECONNRESET:
            return []
    except socket.error as error:
        if error.errno == errno.ECONNRESET:
            return []
    except (google.protobuf.message.DecodeError, requests.exceptions.ChunkedEncodingError,
            UnicodeDecodeError):
        return []
    except requests.exceptions.RequestException as e:   
        print e
        return []

def getAllVehiclesGTFS():
    '''
    downloads the most recent protobuffer Vehicles feed and returns a list of 
    dictionaries with info for each vehicle
    '''
    return [parseVehEntity(v) for v in getAllVehiclesGTFS_Raw()]


def getAllTripsGTFS():
    '''
    downloads the most recent protobuffer Trips feed and returns a list of 
    dictionaries with info for each trip. Trips that are underway already or 
    about to depart have a specific vehicle, but trips further in the future don't
    '''
    raw_trips = getAllTripsGTFS_Raw()
    return [parseTripEntity(t) for t in raw_trips]
    

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


def getParentStops(stopidlist):
    '''
    takes a list of stop_ids and returns a list of dictionaries 
    '''
    parents = []
    for stop_id in stopidlist:
        stopinfo = stopinfodict[stop_id]
        if stopinfo.get('children', ''):
            route_ids = []
            for stop_id in stopinfo['children']:
                route_ids += stoproutesdict.get(stop_id, []) 
            routenames = filter(lambda x : x!= '', [routenamesdict.get(route_id, '') for route_id in route_ids])
            routenames = sorted(list(set(routenames)))
            stopinfo['routes'] = ', '.join(routenames)  
            parents.append(stopinfo)
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
            
   
def getAnimationPoints(path, veh_lat, veh_lon, veh_timestamp, speed = 6):
    '''
    takes a path, the lat and lon of a vehicle, and speed in m/s
    returns a list of dictionaries {time, lat, lon} which give the 
    future points and their arrival times
    '''
    numpoints = len(path)
    closest_i = findClosestPoint(veh_lat, veh_lon, path)
    if closest_i == numpoints - 1:
        first_i = closest_i
    else:
        first_i = closest_i +1
    return buildAnimationDicts(path, first_i, veh_lat, veh_lon, veh_timestamp, speed)
        

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
    ok_shape_ids = [x for x in dir_shape_ids if shapeinfodict.get(x).get('destination') == destination]
    if len(ok_shape_ids) == 0:
        return ''
    else:
        return ok_shape_ids[-1] #if multiple matches, return the shape_id with the longest path

   

    
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
    
    

'''
The next four functions are semi-obsolete.  They are for plotting on two static 
google screenshot maps, before use of google JS API.
'''
   
def getPixTripPath(shape_id, map_id):
    if map_id == 'largemap':
        pixelcoords = [convertll2largemap(latlon) for latlon in shapepathdict[shape_id]] 
    if map_id == 'centralmap':
        pixelcoords = [convertll2centralmap(latlon) for latlon in shapepathdict[shape_id]] 
    return pixelcoords


def getPixRoutePaths(rtnum, map_id):
    if map_id == 'largemap':
        pixelcoords = [[convertll2largemap(latlon) for latlon in path] for path in getLatLonPathsByRoute(rtnum)[0]] 
    if map_id == 'centralmap':
        pixelcoords = [[convertll2centralmap(latlon) for latlon in path] for path in getLatLonPathsByRoute(rtnum)[0]]  
    return pixelcoords


def convertll2largemap(latlon):
    lat, lon = latlon
    return (int((lon +71.363224)*775/.532172), int((42.562689 - lat)*708/.358172))


def convertll2centralmap(latlon):
    lat, lon = latlon
    return (int((lon +71.145644)*751/.101124), int((42.400886 - lat)*699/.069698))

    



    

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


def plotAllBuses():
    #plots all current vehicles using matplotlib
    allVehicles = getAllVehiclesGTFS()
    buses = [v for v in allVehicles if v['type'] == 'bus']
    coords = [convertll2xy((v['lat'], v['lon'])) for v in buses]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    pl.plot(xs, ys, 'ro')
    pl.show()
    






class Bus(object):
    def __init__(self, busid, rtnum):
        self.busid = busid
        self.rtnum = rtnum
        
    def getBusinfo(self):    
        tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=mbta&r='
                        + str(self.rtnum) + '&t=0')
        root = tree.getroot()
        buses = root.getchildren()
        numbuses = len(buses) - 1
        for i in range(numbuses):
            if buses[i].attrib['id'] == self.busid:
                busdict = dict(buses[i].attrib)
                busdict['latlon'] = (float(busdict['lat']), float(busdict['lon']))
                busdict['coords'] = convertll2xy(busdict['latlon'])
                return busdict
        return None
        

class Route(object):
    def __init__(self, rtnum):
        self.rtnum = rtnum   
        self.allStops, self.allVars, self.varTitles = self.getAllStopsAndVars()
        
        
        
    def getAllStopsAndVars(self):
        rttree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=mbta&r=' + str(self.rtnum))
        rtroot = rttree.getroot()
        route = rtroot.getchildren()
        allElements = route[0].getchildren()
        allstops = dict([(x.attrib['tag'], x.attrib) for x in allElements if x.tag == 'stop'])
        allvars = dict()
        varTitles = dict()
        for el in allElements:
            if el.tag == 'direction':
                allvars[el.attrib['tag']] = [x.attrib['tag'] for x in el.getchildren()]
                varTitles[el.attrib['tag']] = [el.attrib['title'], el.attrib['name']] 
                #'name' = Inbound or Outbound, 'title' = destination via blahblah
        return allstops, allvars, varTitles
        
    def getStopsOneVar(self, var):
        if var not in self.allVars:
            var = var[:-1] + '0'
        return  [self.allStops[stop] for stop in self.allVars[var]]
        
    def getCurrentVars(self):
        buses = self.getCurrentBuses()
        return list(set([b['dirTag'] for b in buses]))
        
    
    def getStopTitlesOneVar(self, var):
        stops = self.getStopsOneVar(var)
        return [s['title'] for s in stops]
        
    def getCurrentBuses(self):
        tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed'+
        '?command=vehicleLocations&a=mbta&r=' + str(self.rtnum) + '&t=0')
        root = tree.getroot()
        buses = root.getchildren()[:-1]
        return [b.attrib for b in buses if b.get('dirTag') != None]
        #sometimes a bus has no 'dirTag'
        
    def displayRouteOneVar(self, var):
        allstops = self.getStopsOneVar(var)
        stopcoords = [convertll2xy((float(st['lat']), float(st['lon']))) for st in allstops]
        xcoords = [c[0] for c in stopcoords]
        ycoords = [c[1] for c in stopcoords]
        labels = [st['title'] for st in allstops]
        pl.plot(xcoords, ycoords, 'r')
        pl.plot(xcoords, ycoords, 'ro')
        #pl.plot([busx], [busy], markersize=10, marker = 's', c = 'yellow')
        pl.axes().set_aspect('equal', 'datalim')
        for label, x, y in zip(labels, xcoords, ycoords):
            pl.annotate(
            label, 
            xy = (x, y), xytext = (20, 20),
            textcoords = 'offset points', ha = 'right', va = 'bottom',
            bbox = dict(boxstyle = 'round,pad=0.1', fc = 'yellow', alpha = 0.1),
            arrowprops = dict(arrowstyle = '->', connectionstyle = 'arc3,rad=0'))
        pl.show()      
    
    
    


class Stop(object):
    def __init__(self, stoptag):
        self.stoptag = stoptag
        
    def getStopPreds(self):    
        tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=mbta&stopId=' + str(self.stoptag))
        root = tree.getroot()
        routes = root.getchildren() #each route has .tag 'predictions'
        #print routes
        preds = dict()
        for rt in routes:
            #print rt.getchildren()
            if len(rt.getchildren())>0:
                preds[rt.attrib['routeTitle']] = []
                direction = rt.getchildren()[0]
                for predEl in direction.getchildren():
                    pred = dict(predEl.attrib)
                    pred['secremainder'] = int(pred['seconds'])%60
                    preds[rt.attrib['routeTitle']].append(pred)
        return preds               
      
    

def d2r(deg):
    return math.pi * deg / float(180)
    
def dist(lat1, lon1, lat2, lon2):
    dlon = d2r(lon1 - lon2)
    dlat = d2r(lat1 - lat2)
    return 6373*(((dlat)**2 + \
    math.cos(d2r(lat1))*math.cos(d2r(lat2))*((dlon)**2))**0.5)
    
    
def getrouteinfo(rtnum = '77'):    
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=mbta&r=' + str(rtnum) + '&t=0')
    root = tree.getroot()
    buses = root.getchildren()
    numbuses = len(buses) - 1
    for i in range(numbuses):
        print buses[i].attrib
        
        
def getBusinfo(busid, rtnum):    
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=mbta&r=' + str(rtnum) + '&t=0')
    root = tree.getroot()
    buses = root.getchildren()
    numbuses = len(buses) - 1
    for i in range(numbuses):
        if buses[i].attrib['id'] == busid:
            busdict = dict(buses[i].attrib)
            busdict['latlon'] = (float(busdict['lat']), float(busdict['lon']))
            busdict['coords'] = convertll2xy(busdict['latlon'])
            return busdict
    return None


def getstopinfo(stopid = '2297'):    
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=mbta&stopId=' + str(stopid))
    root = tree.getroot()
    routes = root.getchildren() #called 'predictions'
    for rt in routes:
        #print rt.getchildren()
        if len(rt.getchildren())>0:
            print ' ===================================== '
            print 'Route ' + rt.attrib['routeTitle'], 
            direction = rt.getchildren()[0]
            print direction.attrib['title']
            buses = direction.getchildren()
            for bus in buses:
                print 'bus#' + bus.attrib['vehicle'],  bus.attrib['minutes'] + ' minutes'
                

def trackbusesStop(stopid = '2297'): 
    slat, slon = (stopinfodict[stopid]['lat'], stopinfodict[stopid]['lon'])
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=mbta&stopId=' + str(stopid))
    root = tree.getroot()
    routes = root.getchildren() #called 'predictions'
    for rt in routes:
        #print rt.attrib
        if len(rt.getchildren())>0:
            rtnum = rt.attrib['routeTag']
            rtname = rt.attrib['routeTitle']
            print ' ===================================== '
            print 'Route ' + rtname, 
            direction = rt.getchildren()[0]
            print direction.attrib['title']
            buses = direction.getchildren()
            for bus in buses:
                print 'bus#' + bus.attrib['vehicle'],  bus.attrib['minutes'] + ' minutes'
            rttree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=mbta&r=' + str(rtnum) + '&t=0')
            rtroot = rttree.getroot()
            rtbuses = rtroot.getchildren()
            for bus in rtbuses[:-1]:
                #print rtbuses[i].attrib
                blat = float(bus.attrib['lat'])
                blon = float(bus.attrib['lon'])
                bheading = bus.attrib['heading']
                dis = dist(slat, slon, blat, blon)
                busnum = bus.attrib['id']
                print 'bus#' + busnum + ' was ' + '{0:.2f}'.format(dis)  + ' km away ' + bus.attrib['secsSinceReport'] + ' seconds ago, heading ' + bheading + '.'
    #return 1


def watchOneBus(rtnum = '77', numpoints = 10, busid = None, timeinterval = 15):
    breadcrumbs = []
    timeinit = int(time.time())%10000
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=mbta&r=' + str(rtnum) + '&t=0')
    root = tree.getroot()
    buses = root.getchildren()
    numbuses = len(buses) - 1
    if numbuses > 0:
        bus = dict(buses[0].attrib)
        if busid == None: busid = bus['id']
        print 'tracking bus#' + busid + ' on route #' + str(rtnum)
        for i in range(numpoints):
            if i > 0: time.sleep(timeinterval)
            print '============================='
            print time.asctime(time.localtime())
            businfo = getBusinfo(busid, rtnum)
            print 'coords:', businfo['coords']
            print 'heading:', businfo['heading']
            print 'secsSinceReport: ' + businfo['secsSinceReport']
            dt = int(time.time())%10000 - timeinit
            breadcrumbs.append((dt, businfo['coords'], int(businfo['heading']), int(businfo['secsSinceReport'])))
            
    return breadcrumbs
        
def watchOneBusGraph(rtnum = '77', bus = None, points = 10, timeinterval = 15):
    businfo = bus.getBusinfo()
    busx, busy = businfo['coords']
    var = businfo['dirTag']
    r = Route(rtnum)
    allstops = r.getStopsOneVar(var)
    stopcoords = [convertll2xy((float(st['lat']), float(st['lon']))) for st in allstops]
    xcoords = [c[0] for c in stopcoords]
    ycoords = [c[1] for c in stopcoords]
    labels = [st['title'] for st in allstops]
    pl.plot(xcoords, ycoords, 'ro')
    pl.plot([busx], [busy], markersize=10, marker = 's', c = 'yellow')
    pl.axes().set_aspect('equal', 'datalim')
    for label, x, y in zip(labels, xcoords, ycoords):
        pl.annotate(
        label, 
        xy = (x, y), xytext = (20, 20),
        textcoords = 'offset points', ha = 'right', va = 'bottom',
        bbox = dict(boxstyle = 'round,pad=0.1', fc = 'yellow', alpha = 0.1),
        arrowprops = dict(arrowstyle = '->', connectionstyle = 'arc3,rad=0'))
    pl.show()
    
    
        
def getNearbyStopsOld(lat, lon):
    '''
    DEPRECATED. getNearbyStops is better
    returns a list of dictionaries, one for each of the 15 stops nearest the 
    given (lat, lon), minus any generic subway "parent" stations
    '''    
    stops = json.load(urllib.urlopen('http://realtime.mbta.com/developer/api/v2/stopsbylocation?api_key=' 
                + api_key + '&lat=' + str(lat) +'&lon=' + str(lon) + '&format=json'))['stop']
    stops = [stop for stop in stops if stop['stop_id'][0] != 'p']
    for stop in stops:
        tmp = filter(lambda x : x!= '', [routenamesdict[route_id] for route_id in stoproutesdict.get(stop['stop_id'], '') ])
        stop['routes'] = ', '.join(tmp)            
    return stops
 
   
        
        