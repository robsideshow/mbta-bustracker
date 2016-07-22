FROM python:2.7.12

ADD . /app
WORKDIR "/app"
RUN ["bash", "/app/setup.sh"]
CMD ["python", "flaskbus.py"]
EXPOSE 5000
