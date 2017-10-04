var request = require('request');

var mageEvent = 1;
var token;

module.exports.login = function(callback) {
  request.post({
    url: process.env.MAGE_URL + '/api/login',
    json: true,
    form: {
      username: process.env.MAGE_USER,
      uid: process.env.MAGE_UID,
      password: process.env.MAGE_PASSWORD
    }
  }, function(err, response, body) {
    token = body.token;
    callback(err, token);
  });
}

module.exports.getId = function(callback) {
  request.post({
    url: process.env.MAGE_URL + '/api/events/' + mageEvent + '/observations/id',
    json: {
      eventId: mageEvent
    },
    headers: {
      Authorization: 'Bearer ' + token
    },
  }, function(err, response, body) {
      if (err) callback(err);
      var id = body.id;
      callback(err, id);
    }
  );
}

module.exports.sendObservation = function(observation, callback) {
  console.log('Sending observation', observation);
  request.post({
    url: process.env.MAGE_URL + '/api/events/' + mageEvent + '/observations',
    json: observation,
    headers: {
      Authorization: 'Bearer ' + token
    }
  }, function(err, response, body) {
    console.log('err', err);
    console.log('sent the observation', body);
    callback(err);
  });
}

module.exports.newObservation = function(id, lat, lng, sensorType) {
    return {
      id: id,
      eventId: mageEvent,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      properties: {
        timestamp: new Date().toISOString(),
        type: sensorType
      }
    };
}

module.exports.setDistance = function(form, distance) {
  form.properties.field4 = distance;
}
