var gpsd = require('node-gpsd')
  , fs = require('fs');


var daemon = new gpsd.Daemon({
    program: 'gpsd',
    device: '/dev/ttyS0',
    port: 2947,
    pid: '/tmp/gpsd.pid',
    readOnly: false,
    logger: {
        info: console.log,
        warn: console.warn,
        error: console.error
    }
});

var listener = new gpsd.Listener({
  port: 2947,
  hostname: 'localhost',
  logger:  {
    info: console.log,
    warn: console.warn,
    error: console.error
  },
  parse: true
});

daemon.start(function() {
  console.log('GPS Daemon Started');

  listener.connect(function() {
    console.log('GPS deamon connected');
  });

  listener.on('TPV', function (tpv) {
    console.log('gps recevied, writing to filesystem');
    var geojson = {
      geometry: {
        type: 'Point',
        coordinates: [tpv.lon, tpv.lat]
      },
      properties: {
        timestamp: tpv.time,
        altitude: tpv.alt,
        speed: tpv.speed
      }
    };

    fs.writeFileSync('./db/location.json',  JSON.stringify(geojson), 'utf-8'); 
  });

  listener.watch({
    class: 'WATCH',
    json: true,
    nmea: false
  });
});
