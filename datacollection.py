# -*- coding: utf-8 -*-
"""
Created on Sat Jan 30 14:07:10 2016

@author: Rob
"""

import bustracker as btr
import pandas as pd

DF = pd.DataFrame
tm = lambda : int(btr.time.time())
pl = btr.pl
#pd.set_option('display.max_columns', 1000)


class TripData(object):
    
    def __init__(self, trip_id):
        self.trip_id = trip_id
        self.route_id = btr.trip2route(trip_id)
        self.stoplist = btr.trip2stops(trip_id)
        self.data = DF(self.stoplist, index = range(1, len(self.stoplist) + 1), columns = ['stop_id'])
        init_preds = self.getOneTripPreds()
        init_time = tm()
        self.sch_dep_tm = init_preds[0]['sch_dep_dt']   
        self.data['schedule'] = [int(x['sch_dep_dt']) for x in init_preds]
        self.data[init_time] = [int(x['pre_dt']) for x in init_preds]
        
    
    def getOneTripPreds(self):
        preds = btr.json.load(btr.urllib.urlopen('http://realtime.mbta.com/developer/api/v2/predictionsbytrip?api_key=' 
                    + btr.api_key + '&trip=' + self.trip_id +'&format=json'))
        if 'error' in preds:
            return 'finished'
        else:
            return preds['stop']
        
    def collectDataOneTrip(self, numsteps = 200):
        for n in range(numsteps):
            btr.time.sleep(60)
            preds = self.getOneTripPreds()
            curr_time = tm()
            if preds == 'finished':
                break
            current_stop = int(preds[0]['stop_sequence'])
            if current_stop == 1:
                self.data[curr_time] = [int(x['pre_dt']) for x in preds]
            else:
                self.data[curr_time] = (current_stop - 1)*[0] + [int(x['pre_dt']) for x in preds]
                
            
            
        
        