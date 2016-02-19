# -*- coding: utf-8 -*-
"""
Created on Fri Feb 19 11:43:12 2016

@author: Rob
"""

import bustracker as btr
import threading
import time


class currentVehicles(object):    
    def __init__(self):
        self.vehicles = btr.getAllVehiclesGTFS()
        self.timestamp = long(time.time())
        threading.Timer(12, self.__init__).start()
    
    def getVehiclesOnRoutes(self, route_id_list):
        '''
        Takes a list of route_ids and returns a list of dictionaries, one for each
        vehicle currently on those routes
        '''
        return [veh for veh in self.vehicles if veh.get('route_id') in route_id_list]
        
        
class currentTrips(object):    
    def __init__(self):
        self.vehicles = btr.getAllTripsGTFS()
        self.timestamp = long(time.time())
        threading.Timer(12, self.__init__).start()


current_vehicles = currentVehicles()

current_trips = currentTrips()