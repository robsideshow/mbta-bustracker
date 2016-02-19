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
        
        
class currentTrips(object):    
    def __init__(self):
        self.vehicles = btr.getAllTripsGTFS()
        self.timestamp = long(time.time())
        threading.Timer(12, self.__init__).start()

