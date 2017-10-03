#!/usr/bin/env node

var rpio = require('rpio');
var RaspiCam = require("raspicam");
var tmp = require('tmp');
var path = require('path');

initializeMotionSensor();

function initializeMotionSensor() {
  var led_output_pin = 13;
  var motion_input_pin = 11;

  rpio.open(motion_input_pin, rpio.INPUT);
  rpio.open(led_output_pin, rpio.OUTPUT);

  rpio.poll(motion_input_pin, function(pin) {
    var isMotion = rpio.read(motion_input_pin);
    if (isMotion) {
      rpio.write(led_output_pin, rpio.HIGH);
      console.log('Motion!');
      takeAPicture();
    } else {
      rpio.write(led_output_pin, rpio.LOW);
      console.log('Motion complete');
    }
  });
}


function takeAPicture() {
  var filePath = tmp.tmpNameSync() + '.jpg';
  var camera = new RaspiCam({
    mode: "photo",
    output: filePath,
    rotation: 270
  });

  camera.on('read', function() {
    camera.stop();
    console.log('Picture written to %s', filePath);
  });

  camera.start();
}
