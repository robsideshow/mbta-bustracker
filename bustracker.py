# -*- coding: utf-8 -*-
"""
Created on Wed Mar 04 18:50:03 2015

@author: Rob
"""
import math
import random
from lxml import etree as et
import time
import matplotlib.pyplot as pl
from google.transit import gtfs_realtime_pb2
import urllib
import json

api_key = 'wX9NwuHnZU2ToO7GmGR9uw'

#AG Mednet stopid:234 LatLon:(42.3639399, -71.0511499)   xyCoords:(3423, 749)
#Mass Ave @ Hollis{'lat': '42.39434', 'stopId': '02297', 'tag': '2297', 'lon': '-71.12703', 'title': 'Massachusetts Ave @ Hollis St'}
#UL corner of LM:(42.562689, -71.363924) LR corner:(42.204517,-70.831752)
#largemap 775 X 708

#UL corner of CM:(42.400886, -71.145444) LR corner:(42.331188, -71.044320)
#Centralmap 751 X 699

#Kendall Sq: (42.362392, -71.084301)

'''
First, load several dictionaries from json files.  These dictionaries are made 
(and saved) using functions in dictmaker.py with the text files from 
MBTA_GTFS_texts, a folder which can be downloaded from 
http://www.mbta.com/uploadedfiles/MBTA_GTFS.zip Note that these files change 
slightly about once every 3 months, due to schedule and route changes.
'''

f = open('data/shapepathdict.json', 'r')
shapepathdict = json.load(f)
f.close()
#dict of shape_id : [list of [lat,lon] for that shape]

g = open('data/tripshapedict.json', 'r')
tripshapedict = json.load(g)
g.close()
#dict of trip_id : shape_id

h = open('data/routeshapedict.json', 'r')
routeshapedict = json.load(h)
h.close()
#dict of route_id : [list of shape_ids for that route]

f1 = open('data/shapestopsdict.json', 'r')
shapestopsdict = json.load(f1)
f1.close()
#dict of shape_id : [LIST of stops (in order) for that shape]

g1 = open('data/routestopsdict.json', 'r')
routestopsdict = json.load(g1)
g1.close()
#dict of route_id : [List of all stop_ids for that route_id]

h1 = open('data/stoproutesdict.json', 'r')
stoproutesdict = json.load(h1)
h1.close()
#dict of stop_id : [List of all route_ids for that stop_id]

f2 = open('data/routenamesdict.json', 'r')
routenamesdict = json.load(f2)
f2.close()
#dict of route_id : route_name

g2 = open('data/shaperoutedict.json', 'r')
shaperoutedict = json.load(g2)
g2.close()
#dict of shape_id : route_id

  
            
    
def getAllBusRoutes():
    #this is run once by flaskbus.py to get a list of all the bus route_ids 
    #in a good order (CTs and SLs first, then numerical order)
    tree = et.parse('http://realtime.mbta.com/developer/api/v2/routes?api_key=' + api_key + '&format=xml')
    root = tree.getroot()
    modes = root.getchildren()
    for mode in modes:
        if mode.attrib['mode_name'] == 'Bus':
            busroutes = mode.getchildren()
    sortedRoutenums = [x.attrib['route_id'] for x in busroutes]
    routes = dict([(x.attrib['route_id'], x.attrib['route_name']) for x in busroutes])
    return sortedRoutenums, routes
    
        
def parseVehEntity(vent):     
# takes a GTFS vehicle entity and returns a dictionary of info    
    vdict = dict()
    vdict['route_id'] = vent.vehicle.trip.route_id
    vdict['route'] = routenamesdict.get(vdict['route_id'])
    vdict['trip_id'] = vent.vehicle.trip.trip_id
    vdict['id'] = vent.vehicle.vehicle.id
    vdict['lat'] = vent.vehicle.position.latitude
    vdict['lon'] = vent.vehicle.position.longitude
    vdict['bearing'] = vent.vehicle.position.bearing
    vdict['timestamp'] = vent.vehicle.timestamp
    vdict['xcoord'], vdict['ycoord'] = convertll2xy((vdict['lat'], vdict['lon']))
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
# takes a GTFS trip entity and returns a dictionary of info    
    tdict = dict()
    tdict['route_id'] = tent.trip_update.trip.route_id
    tdict['trip_id'] = tent.trip_update.trip.trip_id
    if tdict['route_id'][0] == 'C':
        tdict['type'] = 'CR'
    elif tdict['route_id'][0] in '123456789':
        tdict['type'] = 'bus'
    else:
        tdict['type'] = 'subway'
    return tdict    
    
    
def getAllVehiclesGTFS_Raw():
    #gets the GTFS protobuffer Vehicles feed 
    feed = gtfs_realtime_pb2.FeedMessage()
    response = urllib.urlopen('http://developer.mbta.com/lib/GTRTFS/Alerts/VehiclePositions.pb')
    feed.ParseFromString(response.read())
    return feed.entity


def getAllTripsGTFS_Raw():
    #gets the GTFS protobuffer Trips feed
    feed = gtfs_realtime_pb2.FeedMessage()
    response = urllib.urlopen('http://developer.mbta.com/lib/GTRTFS/Alerts/TripUpdates.pb')
    feed.ParseFromString(response.read())
    return feed.entity


def getAllVehiclesGTFS():
    #downloads the most recent protobuffer Vehicles feed and returns a list of 
    #dictionaries with info for each vehicle
    return [parseVehEntity(v) for v in getAllVehiclesGTFS_Raw()]


def getAllTripsGTFS():
    #downloads the most recent protobuffer Trips feed and returns a list of 
    #dictionaries with info for each trip. Trips that are underway already or 
    #about to depart have a specific vehicle, but trips further in the future don't
    return [parseTripEntity(t) for t in getAllTripsGTFS_Raw()]
    

def getNearbyStops(lat, lon):
    #returns a list of dictionaries, one for each of the 15 stops nearest the 
    #given (lat, lon), minus any generic subway "parent" stations
    stops = json.load(urllib.urlopen('http://realtime.mbta.com/developer/api/v2/stopsbylocation?api_key=' 
                + api_key + '&lat=' + str(lat) +'&lon=' + str(lon) + '&format=json'))['stop']
    stops = [stop for stop in stops if stop['stop_id'][0] != 'p']
    for stop in stops:
        tmp = filter(lambda x : x!= '', [routenamesdict[route_id] for route_id in stoproutesdict.get(stop['stop_id'], '') ])
        stop['routes'] = ', '.join(tmp)            
    return stops
        
        
def getBusesOnRoutes(routelist):
    vehicles = getAllVehiclesGTFS()
    return [veh for veh in vehicles if veh['route_id'] in routelist]        
        
 
def convertll2xy(latlon):
    #origin of coords is lat: 42.3572, lon: -71.0926 Mass Ave & Memorial Drive
    #1 degree lat = 111200 meters, 1 degree lon = 82600 meters
    lat, lon = latlon
    return (int((lon +71.0926)*82600), int((lat - 42.3572)*111200))
    
    
def convertll2largemap(latlon):
    lat, lon = latlon
    return (int((lon +71.363224)*775/.532172), int((42.562689 - lat)*708/.358172))


def convertll2centralmap(latlon):
    lat, lon = latlon
    return (int((lon +71.145644)*751/.101124), int((42.400886 - lat)*699/.069698))

    
def convertxy2latlon(xy):
    #origin of coords is lat: 42.3572, lon: -71.0926 Mass Ave & Memorial Drive
    #1 degree lat = 111200 meters, 1 degree lon = 82600 meters
    x,y = xy
    return (y/float(111200) + 42.3572, x/float(82600) - 71.0926)

def distxy(xy1, xy2):
    dx = xy1[0] - xy2[0]
    dy = xy1[1] - xy2[1]
    return (dx**2 + dy**2)**.5     

    
def getPixTripPath(shape_id, map_id):
    if map_id == 'largemap':
        pixelcoords = [convertll2largemap(latlon) for latlon in shapepathdict[shape_id]] 
    if map_id == 'centralmap':
        pixelcoords = [convertll2centralmap(latlon) for latlon in shapepathdict[shape_id]] 
    return pixelcoords


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


def getPixRoutePaths(rtnum, map_id):
    if map_id == 'largemap':
        pixelcoords = [[convertll2largemap(latlon) for latlon in path] for path in getLatLonPathsByRoute(rtnum)[0]] 
    if map_id == 'centralmap':
        pixelcoords = [[convertll2centralmap(latlon) for latlon in path] for path in getLatLonPathsByRoute(rtnum)[0]]  
    return pixelcoords
    



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
      
        
def getstoplatlon(stopid):
    tree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=predictions&a=mbta&stopId=' + str(stopid))
    root = tree.getroot()
    routes = root.getchildren() #called 'predictions'
    rt = routes[0]
    rtnum = rt.attrib['routeTag']
    rttree = et.parse('http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=mbta&r=' + str(rtnum))
    rtroot = rttree.getroot()
    route = rtroot.getchildren()
    stops = route[0].getchildren()
    for stop in stops:
        if stop.attrib['tag'] == str(stopid):
            return (float(stop.attrib['lat']), float(stop.attrib['lon']))
            break


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
    slat, slon = getstoplatlon(stopid)
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
    
    
        
        
        
        