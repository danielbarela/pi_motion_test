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

var led_output_pin = 16;
var motion_input_pin = 12;
var distance_trigger_pin = 38;
var distance_echo_pin = 40;

rpio.open(motion_input_pin, rpio.INPUT);
rpio.open(led_output_pin, rpio.OUTPUT);
rpio.open(distance_trigger_pin, rpio.OUTPUT);
rpio.open(distance_echo_pin, rpio.INPUT);

var throttledObservation = throttle(takeAPicture, 30000, {leading: true});

//getDistance();

loginToMage(function() {
  console.log('Logged in to Mage');
  initializeMotionSensor();
});

// get location from IP
//function getLocation(callback) {
//  publicIp.v4().then(ip => {
//    request.get({
//      json: true,
//      url: 'https://freegeoip.net/json/' + ip
//    }, function(err, response, body) {
//      callback(err, body.latitude, body.longitude);
//    });
//  });
//}

// get location from GPS file
function getLocation(callback) {
  var data = fs.readFile('./db/location.json', function(err, data) {
    var geojson = JSON.parse(data);
    callback(err, geojson.geometry.coordinates[1], geojson.geometry.coordinates[0]);
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
      var distance = getDistance();
      var observation = Mage.newObservation(id, lat, lng, 'Motion', distance);
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
  rpio.poll(motion_input_pin, motionChange);
}

function motionChange(pin) {
  var isMotion = rpio.read(motion_input_pin);
  if (isMotion) {
    rpio.write(led_output_pin, rpio.HIGH);
    console.log('Motion!');
    throttledObservation();
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
    rotation: 180,
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

function getDistance() {
  console.log('Measuring distance');
  rpio.write(distance_trigger_pin, rpio.LOW);

  console.log('Waiting for sensor to settle');
  rpio.sleep(2);
  rpio.write(distance_trigger_pin, rpio.HIGH);
  rpio.sleep(.00001);
  rpio.write(distance_trigger_pin, rpio.LOW);

  var pulse_start;
  var pulse_end;
  while(rpio.read(distance_echo_pin) == rpio.LOW) {
    pulse_start = process.hrtime()[1];
  }

  while(rpio.read(distance_echo_pin) == rpio.HIGH) {
    pulse_end = process.hrtime()[1];
  }

  var pulse_duration = pulse_end - pulse_start;
  console.log('pulse start: ' + pulse_start);
  console.log('pulse end: ' + pulse_end);
  console.log('pulse duration: ' + pulse_duration);
  var distance = pulse_duration * 17150 * .000000001;

  console.log('Distance: ' + distance + ' cm');
  return distance;
}

