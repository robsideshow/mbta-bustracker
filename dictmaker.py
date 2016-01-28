# -*- coding: utf-8 -*-
"""
Created on Fri Jan 22 03:34:59 2016

@author: Rob
"""
import json

alldicts = ['shapepathdict', 'routenamesdict', 'tripshapedict', 
            'shaperoutedict', 'routeshapedict', 'shapestopsdict',
                'routestopsdict', 'stoproutesdict']   
    
def makeShapePathDict(filename = 'MBTA_GTFS_texts/shapes.txt'):
    #reads the 'shapes.txt' file and returns a dictionary of 
    # shape_id : [list of latlon path points]
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines]
    shape_ids = set([l[0].strip('"') for l in splitlines])
    shapepathdict = dict([(shape_id, []) for shape_id in shape_ids])
    for l in splitlines:
        latlon = (float(l[1].strip('"')), float(l[2].strip('"')))
        shapepathdict[l[0].strip('"')].append(latlon)
    return shapepathdict
    
    
def makeRouteNamesDict(filename = 'MBTA_GTFS_texts/routes.txt'):
    #reads the 'routes.txt' file and returns a dictionary of 
    # route_id : route_name
    # WARNING: MUST MANUALLY ADJUST ENTRY FOR SL WATERLINE in txt file
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines]
    routenamesdict = dict()
    for l in splitlines:
        if l[2].strip('"') == '':
            routenamesdict[l[0].strip('"')] = l[3].strip('"')
        else:
            routenamesdict[l[0].strip('"')] = l[2].strip('"')        
    return routenamesdict
    
    
def makeTripShapeDict(filename = 'MBTA_GTFS_texts/trips.txt'):
    #reads the 'trips.txt' file and returns a dictionary of 
    # trip_id : shape_id 
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines]
    tripshapedict = dict([(l[2].strip('"'), l[-2].strip('"')) for l in splitlines])
    return tripshapedict
    
def makeShapeRouteDict(filename = 'MBTA_GTFS_texts/trips.txt'):
    #reads the 'trips.txt' file and returns a dictionary of 
    # shape_id : route_id 
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines]
    shaperoutedict = dict([(l[-2].strip('"'), l[0].strip('"')) for l in splitlines])
    return shaperoutedict

    
def makeRouteShapeDict(shaperoutedict, filename = 'MBTA_GTFS_texts/shapes.txt'):
    #reads the 'shapes.txt' file and returns a dictionary of 
    # route_id : [list of shape_ids]
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines]
    shape_ids = list(set([l[0].strip('"') for l in splitlines]))
    routeshapedict = dict()
    for shape_id in shape_ids:
        if shape_id in shaperoutedict:
            route_id = shaperoutedict[shape_id] 
            if route_id in routeshapedict:
                routeshapedict[route_id].append(shape_id)
            else:
                routeshapedict[route_id] = [shape_id]
    return routeshapedict    
    

def makeStopsDicts(tripshapedict, shaperoutedict,
                   filename = 'MBTA_GTFS_texts/stop_times.txt'):
    #reads the 'stop_times.txt' file and returns two dictionaries of 
    # shapestopsdict shape_id : [list of stops in order] 
    # routestopsdict route_id : {set of stops for that route}
    f = open(filename, 'r')
    f.readline()
    rawlines = f.readlines()
    f.close()
    splitlines = [l.split(',') for l in rawlines if l[:2] == '"2']
    tripstopsdict = dict()
    for l in splitlines:
        trip_id = l[0].strip('"')
        stop_id = l[3].strip('"')
        if trip_id in tripstopsdict:
            tripstopsdict[trip_id].append(stop_id)
        else:
            tripstopsdict[trip_id] = [stop_id]
    shapestopsdict = dict()    
    for trip_id in tripstopsdict:
        shape_id = tripshapedict[trip_id]
        if shape_id not in shapestopsdict:
            shapestopsdict[shape_id] = tripstopsdict[trip_id]  
    routestopsdict = dict()
    for shape_id in shapestopsdict:
        route_id = shaperoutedict[shape_id]
        if route_id in routestopsdict:
            routestopsdict[route_id] = routestopsdict[route_id].union(shapestopsdict[shape_id])
        else:
            routestopsdict[route_id] = set(shapestopsdict[shape_id])
    for route_id in routestopsdict:
        routestopsdict[route_id] = list(routestopsdict[route_id])
    return shapestopsdict, routestopsdict
    
def makeStopRoutesDict(routestopsdict):
    # inverts the routestopsdict to create a dict of stop_id : {set of routes for that stop}
    stoproutesdict = dict()
    for route_id in routestopsdict:
        for stop_id in routestopsdict[route_id]:
            if stop_id in stoproutesdict:
                stoproutesdict[stop_id].add(route_id)
            else:
                stoproutesdict[stop_id] = set([route_id])
    for stop_id in stoproutesdict:
        stoproutesdict[stop_id] = sorted(list(stoproutesdict[stop_id]))
    return stoproutesdict


def makeAllDicts():
    shapepathdict = makeShapePathDict()
    routenamesdict = makeRouteNamesDict()
    tripshapedict = makeTripShapeDict()
    shaperoutedict = makeShapeRouteDict()
    routeshapedict = makeRouteShapeDict(shaperoutedict)
    shapestopsdict, routestopsdict = makeStopsDicts(tripshapedict, shaperoutedict)
    stoproutesdict = makeStopRoutesDict(routestopsdict)
    for dic in alldicts:
        f = open(dic + '.json', 'w')
        json.dump(eval(dic), f)
        f.close()
    