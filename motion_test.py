#!/usr/bin/python

import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BOARD)

led_output_pin=16
motion_input_pin=12
GPIO.setup(motion_input_pin, GPIO.IN)
GPIO.setup(led_output_pin, GPIO.OUT)
while True:
        i=GPIO.input(motion_input_pin)
        if i == 1:
                GPIO.output(led_output_pin, GPIO.HIGH)
                print "Motion!"
        else:
                GPIO.output(led_output_pin, GPIO.LOW)
        time.sleep(0.05)
