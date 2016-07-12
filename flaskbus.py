# -*- coding: utf-8 -*-
"""
Created on Mon Aug 10 20:17:59 2015

@author: Rob
"""

from flask import Flask, render_template, url_for, request, redirect, session
from flask.ext.assets import Environment, Bundle
import bustracker as btr
from api_routes import api_routes
#from old_routes import old_routes
import os

app = Flask(__name__)

assets = Environment(app)
assets.url = app.static_url_path
scss = Bundle('stylesheets/all.scss', 
                filters='pyscss', 
                output='build/css/all.css', 
                depends=('stylesheets/**/*.scss'))
assets.register('scss_all', scss)

app.register_blueprint(api_routes, url_prefix="/api")
#app.register_blueprint(old_routes, url_prefix="/old")

app.secret_key = 'F12Zr47j\3yX R~X@H!jmM]Lwf/,?KT'

sortedRoute_ids = btr.sortedRoute_ids


@app.route("/")
def live_map():
    return render_template('liveMap.html', 
                          routeTitles = btr.routenamesdict,
                          rnums = sortedRoute_ids);



if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("FLASK_PORT", "5000")))
