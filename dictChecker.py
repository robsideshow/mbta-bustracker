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
from datetime import datetime

logging.basicConfig(filename='ignore/bustracker.log',level=logging.DEBUG)
logger = logging.getLogger(__name__)


info_url = 'http://www.mbta.com/uploadedfiles/feed_info.txt'

gtfs_zip_url = 'https://cdn.mbta.com/MBTA_GTFS.zip'

class ZipDownloadException(Exception):
   pass


def download_response_body(response, filename):
    try:
        byte_length = float(response.headers.get('Content-Length', 16*10**6))
        # typical size of the zip file is ~ 15 MB
        perc_notify = 10
        byte_buffer = BytesIO()
        for chunk in response.iter_content(chunk_size=1024):
            byte_buffer.write(chunk)
            percent = byte_buffer.tell()/byte_length*100
            if percent >= perc_notify:
                logger.info("{percent:0.1f}% downloaded".format(percent=percent))
                perc_notify += 10
        logger.info("Download complete.")
        z = zipfile.ZipFile(byte_buffer)
        z.extractall(filename)
    except:
       er = sys.exc_info()
       logger.exception("Error while downloading response")
       raise


def updateJson():
    headers = {}
    try:
        with open("cache/last_modified.txt") as lmfile:
            headers["If-Modified-Since"] = lmfile.read().strip()
    except IOError:
        headers["If-Modified-Since"] = None

    response = requests.get(gtfs_zip_url, headers=headers, stream=True)

    if response.status_code == 304:
        return

    if response.status_code != 200:
      # Report the error (or whatever)
        pass

    try:
        os.mkdir("cache")
    except:
        pass

    download_response_body(response, "MBTA_GTFS_texts")
    with open("cache/last_modified.txt", "w") as lmfile:
        lmfile.write(response.headers["Last-Modified"])
    
    if os.path.exists('data'):
        shutil.rmtree('data')
        
    dictmaker.makeAllDicts()
