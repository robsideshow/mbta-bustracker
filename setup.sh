#!/bin/bash

if [ -z "$FLASK_PORT" ]; then
    export FLASK_PORT=5000
fi

pip install -r requirements.txt ||
    (echo "Failed to install requirements. Exiting" && exit 1)

mkdir -p ignore
