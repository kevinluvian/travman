var app = angular.module('app', ["googlechart"]);

app.factory('socket', function ($rootScope) {
var socket=Object.create(null);
  return {
   on: function (eventName, callback) {

  },
  emit: function (eventName, data, callback) {

  },
  removeAllListeners: function (eventName, callback) {

  }
  };
});

