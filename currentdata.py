# -*- coding: utf-8 -*-
"""
Created on Fri Feb 19 11:43:12 2016

@author: Rob
"""

import bustracker as btr
import time, json, threading, urllib

veh_update_period = 12
trip_update_period = 12


class CurrentData(object):    
    def __init__(self):
        self.vehicles = []
        self.trips = []
        self.timestamp = 0
        self.supplement = dict() #this will contain data for unscheduled trips
        
    def updateData(self):
        self.vehicles = btr.getAllVehiclesGTFS()
        self.trips = btr.getAllTripsGTFS()
        for veh in self.vehicles:
            if veh.get('destination', '?') == '?':
                trip_id = veh.get('trip_id', '')
                if trip_id in self.supplement:
                    veh['destination'] = self.supplement[trip_id].get('destination', '?')
                    veh['direction'] = self.supplement[trip_id].get('direction', '?')
                else:
                    self.getData4UnschedTrip(veh.get('route_id',''))
                    veh['destination'] = self.supplement.get(trip_id, {}).get('destination', '?')
                    veh['direction'] = self.supplement.get(trip_id, {}).get('direction', '?')
        self.timestamp = long(time.time())
        threading.Timer(veh_update_period, self.updateData).start()
    
    def getVehiclesOnRoutes(self, route_id_list):
        '''
        Takes a list of route_ids and returns a list of dictionaries, one for each
        vehicle currently on those routes
        '''
        return [veh for veh in self.vehicles if veh.get('route_id') in route_id_list]
        
    def getData4UnschedTrip(self, route_id):
        routejson = json.load(urllib.urlopen(btr.mbta_rt_url + 'predictionsbyroute?api_key=' 
                                            + btr.api_key 
                                            + '&route=' + str(route_id) 
                                            + '&format=json'))
        triplist = []
        for direction in routejson.get('direction', []):
            for trip in direction.get('trip', []):
                trip_id = trip.get('trip_id', '')
                if trip_id not in btr.tripshapedict:
                    if trip_id not in self.supplement:
                        self.supplement[trip_id] = {'direction': direction.get('direction_id', '?'),
                                                       'destination' :  trip.get('trip_headsign', '?')}
                
        
                                         
        


current_data = CurrentData()
current_data.updateData()


