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
        self.data = DF([0] + self.stoplist,
                       index = ['veh_timestamp'] + range(1, len(self.stoplist) + 1),
                        columns = ['stop_id'])
        veh_stamp, init_preds = self.getOneTripPreds()
        init_time = tm()
        self.sch_dep_tm = init_preds[0]['sch_dep_dt']
        self.data['schedule'] = [0] + [int(x['sch_dep_dt']) for x in init_preds]
        self.data[init_time] = [veh_stamp]+[int(x['pre_dt']) for x in init_preds]


    def getOneTripPreds(self):
        preds = btr.json.load(btr.urllib.urlopen('http://realtime.mbta.com/developer/api/v2/predictionsbytrip?api_key='
                    + btr.api_key + '&trip=' + self.trip_id +'&format=json'))
        if 'vehicle' in preds:
            veh_stamp = int(preds['vehicle']['vehicle_timestamp'])
        else:
            veh_stamp = 0
        if 'error' in preds:
            return veh_stamp, 'finished'
        else:
            return veh_stamp, preds['stop']

    def collectDataOneTrip(self, numsteps = 200):
        for n in range(numsteps):
            btr.time.sleep(60)
            veh_stamp, preds = self.getOneTripPreds()
            curr_time = tm()
            print curr_time, veh_stamp, preds
            if preds == 'finished':
                break
            current_stop = int(preds[0]['stop_sequence'])
            if current_stop == 1:
                self.data[curr_time] = [veh_stamp]+[int(x['pre_dt']) for x in preds]
            else:
                self.data[curr_time] = [veh_stamp]+ (current_stop - 1)*[0] + [int(x['pre_dt']) for x in preds]



def getQtimesAndPreds(df, stop_seq):
    qtimes = list(df.columns[2:])
    tmp = df[stop_seq:stop_seq + 1]
    preds = list(tmp.values[0][2:])
    sched = tmp.values[0][1]
    preds = [x-sched for x in preds if x != 0]
    qtimes = [x - sched for x in qtimes[:len(preds)]]
    return qtimes, preds
