# -*- coding: utf-8 -*-
"""
Created on Tue Jul 12 19:33:53 2016

@author: Rob
"""

'''
This module contains functions that are used to:
1) get the info.txt file from MBTA and parse the current version info

2) check whether the local MBTA_GTFS_texts/feed_info.txt file exists and if
    so what version it is

3) download the zip archive from MBTA, unzip the text files to /MBTA_GTFS_texts

4) combine the above functions to update the static json files in /data directory
'''

import requests, zipfile, os, dictmaker, shutil, logging, sys
from io import BytesIO

logging.basicConfig(filename='ignore/bustracker.log',level=logging.DEBUG)
logger = logging.getLogger(__name__)


info_url = 'http://www.mbta.com/uploadedfiles/feed_info.txt'

gtfs_zip_url = 'http://www.mbta.com/uploadedfiles/MBTA_GTFS.zip'

class ZipDownloadException(Exception):
   pass

def getMBTAGtfsInfo():
    '''
    get the version info from the MBTA url
    '''
    try:
        r = requests.get(info_url)
        if r.ok:
            info = (r.content).split('",')[-1].strip()
            version = info.strip('"')
        return version
    except:
        er = sys.exc_info()
        logger.error(er)
        return 'trouble getting MBTA version info'

def getLocalGtfsInfo():
    '''
    get the GTFS version info from the local disk
    '''
    if os.path.exists('MBTA_GTFS_texts/feed_info.txt'):
        try:
            f = open('MBTA_GTFS_texts/feed_info.txt', 'r')
            info = f.read().split('",')[-1].strip()
            version = info.strip('"')
            return version
        except:
            er = sys.exc_info()
            logger.error(er)
    return 'trouble getting local info file'


def getZipFile():
    print 'downloading and extracting static GTFS text files from MBTA...'
    try:
        r = requests.get(gtfs_zip_url, stream=True)
        byte_length = float(r.headers['content-length'])
        perc_notify = 10
        byte_buffer = BytesIO()
        for chunk in r.iter_content(chunk_size=1024):
            byte_buffer.write(chunk)
            percent = byte_buffer.tell()/byte_length*100
            if percent >= perc_notify:
                logger.info("{percent:0.1f}% downloaded".format(percent=percent))
                perc_notify += 10
        logger.info("Download complete.")
        z = zipfile.ZipFile(byte_buffer)
        z.extractall('MBTA_GTFS_texts')
    except:
       er = sys.exc_info()
       logger.error(er)
       raise

def updateJson():
    '''
    1) checks whether the \MBTA_GTFS_texts folder exists

    2) if so, checks whether the version of the feed_info.txt matches the
    current version at MBTA website.  If not, download new GTFS text files and
    create new json files in \data folder.

    3) even if local MBTA file version matches current version at MBTA website, still
    check to make sure \data folder exists.  If not, create it and json files.

    '''
    if not (os.path.exists('MBTA_GTFS_texts/feed_info.txt') and
                    getLocalGtfsInfo() == getMBTAGtfsInfo()):
        getZipFile()
        if os.path.exists('data'):
            shutil.rmtree('data')
        os.mkdir('data')
        dictmaker.makeAllDicts()

    if not os.path.exists('data'):
        os.mkdir('data')
        dictmaker.makeAllDicts()
