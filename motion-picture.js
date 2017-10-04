#!/usr/bin/env node

// Set environment variables MAGE_USER and MAGE_URL and MAGE_PASSWORD to communicate with MAGE

var rpio = require('rpio')
  , RaspiCam = require("raspicam")
  , tmp = require('tmp')
  , path = require('path')
  , Mage = require('./mage');

var led_output_pin = 13;
var motion_input_pin = 11;

rpio.open(motion_input_pin, rpio.INPUT);
rpio.open(led_output_pin, rpio.OUTPUT);

loginToMage(function() {
  initializeMotionSensor();
});

function loginToMage(callback) {
  Mage.login(callback);
}

function sendMAGEObservation() {
  Mage.getId(function(err, id) {
    var observation = Mage.newObservation(id, 0, 0, 'Motion');
    Mage.sendObservation(observation, function(err) {
    });
  });

}

function initializeMotionSensor() {
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
    t: 5
  });

  camera.on('read', function() {
    camera.stop();
    console.log('Picture written to %s', filePath);
    sendMAGEObservation();
    // schedule the motion sensor polling to begin again in 30 seconds
    setTimeout(initializeMotionSensor, 30000);
  });

  camera.start();
}
