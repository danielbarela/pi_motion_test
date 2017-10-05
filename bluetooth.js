var noble = require('noble')
  , async = require('async');

async.whilst(function() {
  return true;
}, function(callback) {
  console.log('Scanning...');
  setTimeout(callback, 30000);
});

noble.on('stateChange', function(state){
  console.log('state is', state);
  if (state === 'poweredOn') {
    noble.startScanning();
  }
});

noble.on('scanStart', function() {
  console.log('scan start', arguments);
})

noble.on('scanStop', function(results) {
  console.log('scan results', arguments);
});

noble.on('discover', function(peripheral) {
    console.log('peripheral with ID ' + peripheral.id + ' found');
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
      console.log('\tLocal Name        = ' + localName);
    } else if (advertisement.manufacturerData) {
      console.log('\there is my manufacturer data:');
      console.log('\t\t' + JSON.stringify(advertisement.manufacturerData.toString('hex')));
    } else {
      console.log('peripheral information', peripheral);
    }

    console.log('peripheral.rssi', peripheral.rssi);

    if (txPowerLevel) {
      console.log('\tTX Power Level    = ' + txPowerLevel);
    }

    console.log();

    explore(peripheral);
});

function explore(peripheral) {

  peripheral.connect(function(error) {
    if (error) {
      console.log('could not connect', error);
      return;
    }
    peripheral.discoverServices([], function(error, services) {
      var serviceIndex = 0;
      if (services.length) {
        console.log('services and characteristics:');
      }
      async.whilst(
        function () {
          return (serviceIndex < services.length);
        },
        function(callback) {
          var service = services[serviceIndex];

          if (!service.name) {
            serviceIndex++;
            return callback();
          }
          // if it is the time service, ignore
          if (service.uuid === '1805') {
            serviceIndex++;
            return callback();
          }
          console.log('\tService: %s (%s)', service.name, service.uuid);

          service.discoverCharacteristics([], function(error, characteristics) {
            var characteristicIndex = 0;

            async.whilst(
              function () {
                return (characteristicIndex < characteristics.length);
              },
              function(callback) {
                var characteristic = characteristics[characteristicIndex];
                if (characteristic.name) {
                  console.log('\t\tCharacteristic: %s (%s)', characteristic.name, characteristic.uuid);
                }

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
                          if (characteristic.uuid === '2a19') {
                            console.log('\t\t\t\tBattery level is: %d %', data.readUInt8());
                          } else if (characteristic.uuid === '2a0f') {
                            // local time zone and daylight savings time -- ignore this
                          } else {
                            console.log('\t\t\t\tvalue: ' + value + ' | (' + string + ')');
                          }
                        }
                        callback();
                      });
                    } else {
                      callback();
                    }
                  },
                  function() {
                    characteristicIndex++;
                    callback();
                  }
                ]);
              },
              function(error) {
                serviceIndex++;
                callback();
              }
            );
          });
        },
        function (err) {
          peripheral.disconnect();
        }
      );
    });
  });
}

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
