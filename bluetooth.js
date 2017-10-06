var noble = require('noble')
  , async = require('async');

var scan = true;

module.exports.stopScan = function() {
  scan = false;
}

function peripheralDetected(peripheral, deviceDetectedCallback) {
  // console.log('peripheral with ID ' + peripheral.id + ' found');
  var advertisement = peripheral.advertisement;

  var info = {};
  info.id = peripheral.id;
  info.localName = advertisement.localName;
  info.txPowerLevel = advertisement.txPowerLevel;
  info.manufacturerData = advertisement.manufacturerData;
  info.serviceData = advertisement.serviceData;
  info.serviceUuids = advertisement.serviceUuids;
  if (advertisement.manufacturerData) {
    info.manufacturerData = JSON.stringify(advertisement.manufacturerData.toString('hex'));
  }

  explore(peripheral, info, deviceDetectedCallback);
}

function explore(peripheral, info, deviceDetectedCallback) {
  info.services = [];

  peripheral.connect(function(error) {
    if (error) {
      console.log('could not connect', error);
      return deviceDetectedCallback(error, info);
    }
    peripheral.discoverServices([], function(error, services) {
      if (!services.length) return deviceDetectedCallback(null, info);
      var serviceIndex = 0;
      async.doWhilst(

        function(callback) {
          var service = services[serviceIndex];

          if (!service.name) {
            return callback();
          }
          // if it is the time service, ignore
          if (service.uuid === '1805') {
            return callback();
          }
          var infoService = {};
          info.services.push(infoService);
          infoService.name = service.name;
          infoService.uuid = service.uuid;
          infoService.characteristics = [];
          service.discoverCharacteristics([], function(error, characteristics) {
            if (!characteristics.length) return;
            var characteristicIndex = 0;
            async.doWhilst(

              function(callback) {
                var infoCharacteristic = {};
                var characteristic = characteristics[characteristicIndex];

                infoCharacteristic.name = characteristic.name;
                infoCharacteristic.uuid = characteristic.uuid;

                async.series([
                  function(callback) {
                    characteristic.discoverDescriptors(function(error, descriptors) {
                      async.detect(
                        descriptors,
                        function(descriptor, callback) {
                          return callback(descriptor.uuid === '2901');
                        },
                        function(userDescriptionDescriptor){
                          if (userDescriptionDescriptor) {
                            userDescriptionDescriptor.readValue(function(error, data) {
                              if (data) {
                                infoCharacteristic.data = data.toString();
                                console.log('\t\t\t(' + data.toString() + ')');
                              }
                              callback();
                            });
                          } else {
                            callback();
                          }
                        }
                      );
                    });
                  },
                  function(callback) {
                    if (characteristic.properties.indexOf('read') !== -1) {
                      characteristic.read(function(error, data) {
                        if (data) {
                          var string = data.toString('ascii');
                          var value = data.toString('hex');
                          infoCharacteristic.hexValue = value;
                          infoCharacteristic.asciiValue = string;
                          if (characteristic.uuid === '2a19') {
                            info.battery = data.readUInt8();
                            console.log('\t\t\t\tBattery level is: %d %', data.readUInt8());
                          }
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    callback();
                  }
                ]);
              },
              function () {
                characteristicIndex++;
                return (characteristicIndex < characteristics.length);
              },
              function(error) {
                callback();
              }
            );
          });
        },
        function () {
          serviceIndex++;
          return (serviceIndex < services.length);
        },
        function (err) {
          deviceDetectedCallback(err, info);
          peripheral.disconnect();
        }
      );
    });
  });
}

module.exports.startScan = function(bluetoothDeviceDetectedCallback) {
  async.whilst(function() {
    return scan;
  }, function(callback) {
    console.log('Scanning...');
    setTimeout(callback, 30000);
  });

  noble.on('stateChange', function(state){
    if (state === 'poweredOn') {
      noble.startScanning();
    }
  });

  noble.on('discover', function(peripheral) {
    peripheralDetected(peripheral, bluetoothDeviceDetectedCallback);
  });

// noble.on('discover', function(peripheral) {
//   console.log('peripheral discovered (' + peripheral.id +
//               ' with address <' + peripheral.address +  ', ' + peripheral.addressType + '>,' +
//               ' connectable ' + peripheral.connectable + ',' +
//               ' RSSI ' + peripheral.rssi + ':');
//   console.log('\thello my local name is:');
//   console.log('\t\t' + peripheral.advertisement.localName);
//   console.log('\tcan I interest you in any of the following advertised services:');
//   console.log('\t\t' + JSON.stringify(peripheral.advertisement.serviceUuids));
//
//   var serviceData = peripheral.advertisement.serviceData;
//   if (serviceData && serviceData.length) {
//     console.log('\there is my service data:');
//     for (var i in serviceData) {
//       console.log('\t\t' + JSON.stringify(serviceData[i].uuid) + ': ' + JSON.stringify(serviceData[i].data.toString('hex')));
//     }
//   }
//   if (peripheral.advertisement.manufacturerData) {
//     console.log('\there is my manufacturer data:');
//     console.log('\t\t' + JSON.stringify(peripheral.advertisement.manufacturerData.toString('hex')));
//   }
//   if (peripheral.advertisement.txPowerLevel !== undefined) {
//     console.log('\tmy TX power level is:');
//     console.log('\t\t' + peripheral.advertisement.txPowerLevel);
//   }
//
//   console.log();
//
// });
}

module.exports.startScan(function(err, deviceInfo) {
  console.log('Device found: ', deviceInfo);
});
