First, [install conda](http://conda.pydata.org/docs/install/quick.html)

Then, install GTFS  

```
pip install --upgrade gtfs-realtime-bindings
```

If it's throwing errors about setuptools, do this:

```
conda install -c https://conda.anaconda.org/anaconda setuptools
```

Once GTFS is installed, run  

```
python flaskbus.py
```

Open the app at `localholst:5000`

[MBTA Realtime and GTFS Documentation](http://realtime.mbta.com/Portal/Home/Documents)

[NextBus Documentation](http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf)
