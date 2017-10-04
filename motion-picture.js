#!/usr/bin/env node

// Set environment variables MAGE_USER and MAGE_URL and MAGE_PASSWORD to communicate with MAGE

var rpio = require('rpio')
  , RaspiCam = require("raspicam")
  , tmp = require('tmp')
  , path = require('path')
  , Mage = require('./mage')
  , fs = require('fs')
  , throttle = require('lodash.throttle')
  , request = require('request')
  , publicIp = require('public-ip');

var led_output_pin = 13;
var motion_input_pin = 11;

rpio.open(motion_input_pin, rpio.INPUT);
rpio.open(led_output_pin, rpio.OUTPUT);

var throttledMotion = throttle.throttle(motionChange, 30000);

loginToMage(function() {
  console.log('Logged in to Mage');
  initializeMotionSensor();
});

function getLocation(callback) {
  publicIp.v4().then(ip => {
    request.get({
      json: true,
      url: 'https://freegeoip.net/json/' + ip
    }, function(err, response, body) {
      callback(err, body.latitude, body.longitude);
    });
  });
}

function loginToMage(callback) {
  console.log('Logging in to Mage');
  Mage.login(callback);
}

function sendMAGEObservation(attachmentPath) {
  console.log('Sending new observation');
  Mage.getId(function(err, id) {
    console.log('Observation has id ' + id);
    getLocation(function(err, lat, lng) {
      var observation = Mage.newObservation(id, lat, lng, 'Motion');
      Mage.sendObservation(observation, function(err) {
        console.log('Observation sent');
        Mage.sendAttachment(id, attachmentPath, function(err, response, body) {
          console.log('Attachment sent', body.id);
          fs.unlinkSync(attachmentPath);
        });
      });
    });
  });
}

function initializeMotionSensor() {
  console.log('Initializing motion sensor');
  var isMotion = rpio.read(motion_input_pin);
  if (isMotion) {
    rpio.write(led_output_pin, rpio.HIGH);
    console.log('Motion!');
  } else {
    rpio.write(led_output_pin, rpio.LOW);
    console.log('Motion complete');
  }
  console.log('Starting to poll the motion sensor');
  rpio.poll(motion_input_pin, throttledMotion);
}

function motionChange(pin) {
  var isMotion = rpio.read(motion_input_pin);
  if (isMotion) {
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
  });

  camera.start();
}
