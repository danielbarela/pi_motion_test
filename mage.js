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
    json: true,
    form: {
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
  request.post({
    url: process.env.MAGE_URL + '/api/events/' + mageEvent + '/observations/id/' + observation.id,
    json: true,
    form: observation,
    headers: {
      Authorization: 'Bearer ' + token
    }
  }, function(err, response, body) {
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

// https://mageiot.geointservices.io/api/events/1/observations/id
// request:
// {eventId: 1}
//
// response: {"__v":0,"id":"59d50426607cb672fa04d17f","eventId":1,"url":"https://mageiot.geointservices.io/api/events/1/observations/59d50426607cb672fa04d17f"}
//
// https://mageiot.geointservices.io/api/events/1/observations/id/59d50426607cb672fa04d17f
// request:
// {"eventId":1,"type":"Feature","geometry":{"type":"Point","coordinates":[-77.16796875,41.902277040963696]},"properties":{"timestamp":"2017-10-04T15:54:00.922Z","type":"Motion","field4":5},"options":{"layerId":"NewObservation","selected":true,"draggable":true},"id":"59d50426607cb672fa04d17f"}
// response:
// {"lastModified":"2017-10-04T15:54:14.361Z","userId":"59d4fb4a607cb672fa04d17d","deviceId":"59d42c0a686dc66397164017","type":"Feature","geometry":{"type":"Point","coordinates":[-77.16796875,41.902277040963696]},"properties":{"timestamp":"2017-10-04T15:54:00.922Z","type":"Motion","field4":5},"__v":0,"createdAt":"2017-10-04T15:54:14.361Z","favoriteUserIds":[],"attachments":[],"id":"59d50426607cb672fa04d17f","eventId":1,"url":"https://mageiot.geointservices.io/api/events/1/observations/59d50426607cb672fa04d17f","state":{"userId":"59d4fb4a607cb672fa04d17d","name":"active","id":"59d50426607cb672fa04d180","url":"https://mageiot.geointservices.io/api/events/1/observations/59d50426607cb672fa04d17f/states/59d50426607cb672fa04d180"}}
