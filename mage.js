var request = require('request')
  , fs = require('fs');

var mageEvent = 1;
var token;

module.exports.login = function(callback) {
  request.post({
    url: process.env.MAGE_URL + '/api/login',
    json: {
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
  request.put({
    url: process.env.MAGE_URL + '/api/events/' + mageEvent + '/observations/id/' + observation.id,
    json: observation,
    headers: {
      Authorization: 'Bearer ' + token
    }
  }, function(err, response, body) {
    console.log('err', err);
    console.log('sent the observation', body.id);
    callback(err);
  });
}

module.exports.sendAttachment = function(observationId, filePath, callback) {
  //POST /api/events/{eventId}/observations/{observationId}/attachments
  request.post({
    url: process.env.MAGE_URL + '/api/events/' + mageEvent + '/observations/' + observationId + '/attachments',
    headers: {
      Authorization: 'Bearer ' + token
    },
    formData: {
      attachment: fs.createReadStream(filePath),
    }
  }, callback);
}

module.exports.newObservation = function(id, lat, lng, sensorType, distance) {
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
        type: sensorType,
        field4: distance
      }
    };
}

module.exports.setDistance = function(form, distance) {
  form.properties.field4 = distance;
}
