# Public instance running at [MBTA.fyi](https://mbta.fyi/)

# Set up the environment
We use Conda to manage our Python libraries. [Install conda](http://conda.pydata.org/docs/install/quick.html)

Note that if you choose to install Anaconda (the full version), you probably only need to install GTSF Realtime. But if you choose to install Miniconda, which is way smaller, you'll need to install dependencies later one by one.

## Dependencies
### GTFS Realtime
[install GTFS](https://github.com/google/gtfs-realtime-bindings/tree/master/python)

```
pip install protobuf
```

```
pip install --upgrade gtfs-realtime-bindings
```

If it's throwing errors about setuptools, do this:

```
conda install -c https://conda.anaconda.org/anaconda setuptools
```
If it's still not working, try install GTFS using 

```
easy_install --upgrade gtfs-realtime-bindings
```  

### Flask

### flask-assets

Using the pyScss and Flask Assets to compile the SCSS files.  
```
pip install flask-assets
pip install pyScss
```

### lxml
```
conda install lxml
```

# Get an API key

Sign up for an account on the [MBTA realtime Developer Portal](http://realtime.mbta.com/portal) and create a new application. It may take a day or two to get approval. Once you get it, create a file called `ignore/mbta_api_key.txt` and paste your API key there.

# Run the App
 
```
$ git clone "https://github.com/robsideshow/mbta-bustracker.git"
$ cd your-path-to/mbta-bustracker
$ python flaskbus.py
```

Open the app at `localhost:5000/`


# API References

[MBTA Realtime and GTFS Documentation](http://realtime.mbta.com/Portal/Home/Documents)

[NextBus Documentation](http://www.nextbus.com/xmlFeedDocs/NextBusXMLFeed.pdf)
