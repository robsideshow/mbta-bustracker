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

