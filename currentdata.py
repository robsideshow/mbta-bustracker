# -*- coding: utf-8 -*-
"""
Created on Fri Feb 19 11:43:12 2016

@author: Rob
"""

import bustracker as btr
import time, json, threading, sys, logging

veh_update_period = 20
trip_update_period = 20
unsch_update_period_factor = 60

logging.basicConfig(filename='ignore/bustracker.log',level=logging.DEBUG)
logger = logging.getLogger(__name__)

class APIException(Exception):
   pass
 
      
class CurrentDataV3(object):    
    def __init__(self):
        self.counter = 0
        self.vehicles = []
        self.trips = []
        self.stop_preds = []
        self.vehicle_preds = []
        self.timestamp = 0
        self.supplement_by_trip = dict() #this will contain data for unscheduled trips
        self.supplement_by_veh = dict()
        
    def updateData(self):
        self.counter += 1
        if self.counter % unsch_update_period_factor == 1:
            self.supplement_by_trip = dict()
            self.supplement_by_veh = dict()
        self.vehicles = btr.getAllVehiclesGTFS()
        self.trips = btr.getAllTripsGTFS()
        self.timestamp = long(time.time())
        self.addDestDirShape()
        #print self.supplement_by_trip
        threading.Timer(veh_update_period, self.updateData).start()
 

    def addDestDirShape(self):
        unknown_trip_ids = []
        for veh in self.vehicles:
            if veh.get('destination', '?') == '?':
                trip_id = veh.get('trip_id', '')
                if trip_id in self.supplement_by_trip:
                    veh['destination'] = self.supplement_by_trip[trip_id].get('destination', '?')
                    veh['direction'] = self.supplement_by_trip[trip_id].get('direction', '?')
                    veh['shape_id'] = self.supplement_by_trip[trip_id].get('shape_id', '')
                else:
                    unknown_trip_ids.append(trip_id)
        unsched_trip_info = btr.getUnschedTripInfoV3(unknown_trip_ids)
        for trip_id in unsched_trip_info:
            self.supplement_by_trip[trip_id] = unsched_trip_info[trip_id]
        if len(unsched_trip_info) > 1:
            for veh in self.vehicles:
                if veh.get('destination', '?') == '?':
                    trip_id = veh.get('trip_id', '')
                    if trip_id in self.supplement_by_trip:
                        veh['destination'] = self.supplement_by_trip[trip_id].get('destination', '?')
                        veh['direction'] = self.supplement_by_trip[trip_id].get('direction', '?')
                        veh['shape_id'] = self.supplement_by_trip[trip_id].get('shape_id', '')
                
                                                              
    def getPredsForStops(self, stopidlist):
        #green_routes = ['Green-B','Green-C','Green-D','Green-E']
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
        for vehicle_id in vehicleidlist:
            if vehicle_id in self.supplement_by_veh:
                preds = []
                sup_preds = self.supplement_by_veh[vehicle_id].get('preds', [])
                for pred in sup_preds:
                    preds.append({'arr_time': long(pred.get('pre_dt', '0')), 
                                 'stop_id': pred.get('stop_id', ''),
                                 'stop_seq': pred.get('stop_sequence', '1'),
                                 'stop_name': pred.get('stop_name', '')})
                    veh_preds[vehicle_id] = preds
        return veh_preds


    def getPredsForOneVehicle(self, vehicle_id, trip_id = ''):
        preds = []
        if vehicle_id in self.supplement_by_veh:
            sup_preds = self.supplement_by_veh[vehicle_id].get('preds', [])
            for pred in sup_preds:
                preds.append({'arr_time': long(pred.get('pre_dt', '0')), 
                             'stop_id': pred.get('stop_id', ''),
                             'stop_seq': pred.get('stop_sequence', '1'),
                             'stop_name': pred.get('stop_name', '')})
            return preds
        for trip in self.trips:
            if trip.get('vehicle_id') == vehicle_id:
                preds = trip.get('preds', [])
                break
            if trip.get('trip_id') == trip_id:
                preds = trip.get('preds', [])
                break
        return preds
            

    def getVehiclesOnRoutes(self, route_id_list):
        '''
        Takes a list of route_ids and returns a list of dictionaries, one for each
        vehicle currently on those routes
        '''
        return [veh for veh in self.vehicles if veh.get('route_id') in route_id_list]
                                                  

current_data = CurrentDataV3()
current_data.updateData()

