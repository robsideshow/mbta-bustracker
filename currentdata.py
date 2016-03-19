# -*- coding: utf-8 -*-
"""
Created on Fri Feb 19 11:43:12 2016

@author: Rob
"""

import bustracker as btr
import time, json, threading, urllib

veh_update_period = 20
trip_update_period = 20
unscheduled_trip_update_period = 60


class CurrentData(object):    
    def __init__(self):
        self.counter = 0
        self.vehicles = []
        self.trips = []
        self.stop_preds = []
        self.vehicle_preds = []
        self.timestamp = 0
        self.supplement = dict() #this will contain data for unscheduled trips
        
    def updateData(self):
        self.counter += 1
        self.vehicles = btr.getAllVehiclesGTFS()
        self.trips = btr.getAllTripsGTFS()
        self.timestamp = long(time.time())
        self.addDestAndDir()
        threading.Timer(veh_update_period, self.updateData).start()
 

    def addDestAndDir(self):
        for veh in self.vehicles:
            if veh.get('destination', '?') == '?':
                trip_id = veh.get('trip_id', '')
                if trip_id in self.supplement:
                    veh['destination'] = self.supplement[trip_id].get('destination', '?')
                    veh['direction'] = self.supplement[trip_id].get('direction', '?')
                elif self.counter % 3 == 1:
                    self.getData4UnschedTrip(veh.get('route_id',''))
                    veh['destination'] = self.supplement.get(trip_id, {}).get('destination', '?')
                    veh['direction'] = self.supplement.get(trip_id, {}).get('direction', '?')
        
        
    def getData4UnschedTrip(self, route_id):
        if route_id:
            routejson = json.load(urllib.urlopen(btr.mbta_rt_url + 'predictionsbyroute?api_key=' 
                                                + btr.api_key 
                                                + '&route=' + str(route_id) 
                                                + '&format=json'))
            for direction in routejson.get('direction', []):
                for trip in direction.get('trip', []):
                    trip_id = trip.get('trip_id', '')
                    if trip_id not in btr.tripshapedict:
                        if trip_id not in self.supplement:
                            self.supplement[trip_id] = {'direction': direction.get('direction_id', '?'),
                                                           'destination' : trip.get('trip_headsign', '?'),
                                                           'preds' : trip.get('stop', []),
                                                            'veh_info' : trip.get('vehicle', {})}
                
    def getPredsForStops(self, stopidlist):
        stop_preds = dict([(stop_id, []) for stop_id in stopidlist])
        check_routes = set([x for stop_id in stopidlist for x in btr.stoproutesdict.get(stop_id, [])])
        for trip in self.trips:
            if trip.get('route_id') in check_routes:
                preds = trip.get('preds', [])
                for pred in preds:
                    if pred.get('stop_id') in stopidlist:
                        stop_preds[pred.get('stop_id')].append({'route_id':trip.get('route_id'),
                                                    'direction' : trip.get('direction'),
                                                    'destination' : trip.get('destination'),
                                                    'arr_time' : pred.get('arr_time'),
                                                    'vehicle_id' : trip.get('vehicle_id')})
        return stop_preds
                    
                
    def getPredsForVehicles(self, vehicleidlist):
        veh_preds = dict()
        tripvehicledict = dict()        
        for veh in self.vehicles:
            if veh.get('id', '') in vehicleidlist:
                tripvehicledict[veh.get('trip_id', '')] = veh.get('id', '')            
        for trip in self.trips:
            if trip.get('trip_id') in tripvehicledict:
                preds = trip.get('preds', [])
                for pred in preds:
                    pred['stop_name'] = (btr.stopinfodict.get(pred.get('stop_id'))).get('stop_name')
                veh_preds[tripvehicledict[trip.get('trip_id')]] = preds
        return veh_preds
            



    def getVehiclesOnRoutes(self, route_id_list):
        '''
        Takes a list of route_ids and returns a list of dictionaries, one for each
        vehicle currently on those routes
        '''
        return [veh for veh in self.vehicles if veh.get('route_id') in route_id_list]
       
                                         
        


current_data = CurrentData()
current_data.updateData()

