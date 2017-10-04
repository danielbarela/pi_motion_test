#!/usr/bin/env node

// Set environment variables MAGE_USER and MAGE_URL and MAGE_PASSWORD to communicate with MAGE

var rpio = require('rpio')
  , RaspiCam = require("raspicam")
  , tmp = require('tmp')
  , path = require('path')
  , Mage = require('./mage')
  , fs = require('fs')
  , request = require('request')
  , publicIp = require('public-ip');

var led_output_pin = 13;
var motion_input_pin = 11;

rpio.open(motion_input_pin, rpio.INPUT);
rpio.open(led_output_pin, rpio.OUTPUT);

var latitude = 0;
var longitude = 0;

loginToMage(function() {
  console.log('Logged in to Mage');
  publicIp.v4().then(ip => {
  	console.log(ip);
    console.log('Raspberry IP address is: ' + ip);
    request.get({
      json: true,
      url: 'https://freegeoip.net/json/' + ip
    }, function(err, response, body) {
      console.log('ip response is', body);
      latitude = body.latitude;
      longitude = body.longitude;
      initializeMotionSensor();
    });
  });
});

function loginToMage(callback) {
  console.log('Logging in to Mage');
  Mage.login(callback);
}

function sendMAGEObservation(attachmentPath) {
  console.log('Sending new observation');
  Mage.getId(function(err, id) {
    console.log('Observation has id ' + id);
    var observation = Mage.newObservation(id, latitude, longitude, 'Motion');
    Mage.sendObservation(observation, function(err) {
      console.log('Observation sent');
      Mage.sendAttachment(id, attachmentPath, function(err, response, body) {
        console.log('Attachment sent', body.id);
        fs.unlinkSync(attachmentPath);
      });
    });
  });

}

function initializeMotionSensor() {
  console.log('Initializing motion sensor');
  rpio.poll(motion_input_pin, motionChange);
}

function motionChange(pin) {
  var isMotion = rpio.read(motion_input_pin);
  if (isMotion) {
    rpio.poll(motion_input_pin, null);
    rpio.write(led_output_pin, rpio.HIGH);
    console.log('Motion!');
    takeAPicture();
  } else {
    rpio.write(led_output_pin, rpio.LOW);
    console.log('Motion complete');
  }
}

function takeAPicture() {
  var filePath = tmp.tmpNameSync() + '.jpg';
  var camera = new RaspiCam({
    mode: "photo",
    output: filePath,
    rotation: 0,
    t: 5,
    width: 1640,
    height: 1232
  });

  camera.on('read', function() {
    camera.stop();
    console.log('Picture written to %s', filePath);
    sendMAGEObservation(filePath);
    // schedule the motion sensor polling to begin again in 30 seconds
    setTimeout(initializeMotionSensor, 30000);
  });

  camera.start();
}
