var main = require("../main");
var Request = require("sdk/request").Request;
var {
  setInterval,
  clearInterval,
  setTimeout
} = require("sdk/timers");

function build(villageId, locationId, buildingType) {
  var url = "building/upgrade";
  var data = {
    'villageId': villageId,
    'locationId': locationId,
    'buildingType': buildingType
  };
  SendPost(url, data)
}

function sendAdventure() {
  var url = "quest/dialogAction";
  var data = {
    questId: 991,
    dialogId: 0,
    command: "activate"
  };
  var type = "adventure";
  SendPost(url, data)
}

function sendTroopTrain(villageId, locationId, buildingType, units) {
  var url = "building/recruitUnits";
  var data = {
    "villageId": villageId,
    "locationId": locationId,
    "buildingType": buildingType,
    "units": units
  };
  SendPost(url, data)
}

function sendTrade(sourceVillageId, destVillageId, resources) {
  var url = "trade/sendResources";
  var data = {
    "sourceVillageId": sourceVillageId,
    "resources": resources,
    "destVillageId": destVillageId,
    "recurrences": 1
  };
  SendPost(url, data)
}
var PostQueue = [];

function SendPost(url, data) {
  PostQueue.push({
    "url": url,
    "data": data
  })
}
var handlePost = setInterval(function() {
  if (main.player != undefined) {
    if (main.player.on) {
      if (PostQueue.length > 0) {
        var currTime = new Date();
        main.getWorker().port.emit("request", PostQueue[0].url, PostQueue[0].data);
        console.log(main.player.host + " send post: " + PostQueue[0].url + " data: " + JSON.stringify(PostQueue[0].data));
        PostQueue.shift()
      }
    } else {
      PostQueue = []
    }
  }
}, 2000);

function searchFarms(coordinate) {
  SearchMap(coordinate.x, coordinate.y, 2)
}

function attackRobbers() {
  var x = main.player.tasks.campsRobbing.village.x;
  var y = main.player.tasks.campsRobbing.village.y;
  console.log("starting farm find");
  if (main.countTroops(main.player.tasks.campsRobbing.village.villageId) > 10) {
    SearchMap(x, y, 1)
  }
}

function SearchMap(x, y, type) {
  var currTime = Math.floor(new Date().getTime());
  var urlP = "http://" + main.player.host + "/api/?c=map&a=getByRegionIds&t" + currTime;
  x = Math.round(x / 7);
  y = Math.round(y / 7);
  var positions1 = [];
  for (var i = -2; i < 3; i++) {
    for (var j = -2; j < 3; j++) {}
  }
  positions1.push.apply(positions1, f(ja(x - 3, y - 1)));
  positions1.push.apply(positions1, f(ja(x, y - 1)));
  positions1.push.apply(positions1, f(ja(x + 2, y - 3)));
  positions1.push.apply(positions1, f(ja(x, y + 2)));
  positions1.push.apply(positions1, f(ja(x + 2, y - 1)));
  positions1.push.apply(positions1, f(ja(x + 3, y - 2)));
  positions1.push.apply(positions1, f(ja(x + 4, y + 1)));
  var o = 0;
  positions1.forEach(function(element) {
    if ((o % 7) == 3) {
      console.log(id2xy(element))
    }
    o++
  });
  var dataP = {
    "controller": "map",
    "action": "getByRegionIds",
    "params": {
      "regionIdCollection": {
        "1": positions1,
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": []
      }
    },
    "session": main.player.SeesionId
  };
  Request({
    url: urlP,
    content: JSON.stringify(dataP),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json;charset=utf-8",
      "Referer": main.player.host
    },
    onComplete: function(response) {
      if (type == 1) {
        FindCamp(response)
      }
      if (type == 2) {
        FindFarms(response)
      }
    }
  }).post()
}

function FindFarms(response) {
  var alliances = [];
  var farms = [];
  Object.keys(response.json.response[1].alliance).forEach(function(key) {
    alliances.push({
      "id": key,
      "name": response.json.response[1].alliance[key].name,
      "payers": []
    })
  });
  Object.keys(response.json.response[1].player).forEach(function(key) {
    var p = response.json.response[1].player[key];
    p.id = key;
    p.villages = [];
    alliances.forEach(function(ally) {
      if (ally.id * 1 == p.allianceId * 1) {
        p.ally = ally
      }
    });
    farms.push(p)
  });
  Object.keys(response.json.response[1].region).forEach(function(key) {
    var region = response.json.response[1].region[key];
    region.forEach(function(element) {
      if (element.hasOwnProperty('village')) {
        var v = element.village;
        v.x = id2xy(element.village.villageId).x;
        v.y = id2xy(element.village.villageId).y;
        v.lastReport = {};
        farms.forEach(function(farm) {
          if (farm.id * 1 == element.playerId * 1) {
            farm.villages.push(v)
          }
        })
      }
    })
  });
  Object.keys(response.json.response[1].reports).forEach(function(key) {
    var id = key;
    var report = response.json.response[1].reports[key];
    farms.forEach(function(farm) {
      farm.villages.forEach(function(village) {
        if (village.villageId * 1 == id * 1) {
          village.lastReport = report
        }
      })
    })
  });
  main.player.farms = farms;
  main.updateFarmsGui()
}

function FindCamp(response) {
  for (var key in response.json.response[1].region) {
    response.json.response[1].region[key].forEach(function(element) {
      if (element.hasOwnProperty('village')) {
        if (parseInt(element.village.villageId) < 0) {
          console.log(JSON.stringify(id2xy(element.village.villageId)) + JSON.stringify(element));
          sendAttack(element.id, main.player.tasks.campsRobbing.village.villageId, 4, false, main.player.villages[main.getVillageNumber(main.player.tasks.campsRobbing.village.villageId)].Troops, "resources");
          return
        }
      }
    })
  }
}

function logArrayElements(element, index, array) {
  console.log('a[' + index + '] = ' + element)
}

function sendAttack(destVillageId, villageId, movementType, redeployHero, units, spyMission) {
  var data = {
    "destVillageId": destVillageId,
    "villageId": villageId,
    "movementType": movementType,
    "redeployHero": redeployHero,
    "units": {
      "1": units[1],
      "2": units[2],
      "3": units[3],
      "4": units[4],
      "5": units[5],
      "6": units[6],
      "7": 0,
      "8": 0,
      "9": 0,
      "10": 0,
      "11": units[11]
    },
    "spyMission": spyMission
  };
  var url = "troops/send";
  PostQueue.push({
    "url": url,
    "data": data
  })
}

function ja(a, c) {
  return a + 16384 + 32768 * (c + 16384)
}

function f(a) {
  a = parseInt(a);
  var e = id2xy(a),
    b = [];
  b.push(ja(e.x - 1, e.y - 1));
  b.push(ja(e.x, e.y - 1));
  b.push(ja(e.x + 1, e.y - 1));
  b.push(a - 1);
  b.push(a);
  b.push(a + 1);
  b.push(ja(e.x - 1, e.y + 1));
  b.push(ja(e.x, e.y + 1));
  b.push(ja(e.x + 1, e.y + 1));
  b.push(ja(e.x + 1, e.y + 2));
  b.push(ja(e.x + 1, e.y + 3));
  b.push(ja(e.x + 2, e.y + 1));
  b.push(ja(e.x + 3, e.y + 1));
  return b
}

function id2xy(a) {
  return {
    "x": (a % 32768 - 16384),
    "y": (Math.floor(a / 32768) - 16384)
  }
}

function getDataFromServer() {
  var currTime = Math.floor(new Date().getTime());
  var urlP = "http://" + main.player.host + "/api/?c=ranking&a=getRankAndCount&t" + currTime;
  var dataP = {
    "controller": "ranking",
    "action": "getRankAndCount",
    "params": {
      "id": main.player.playerId,
      "rankingType": "ranking_Player",
      "rankingSubtype": "population"
    },
    "session": main.player.SeesionId
  };
  Request({
    url: urlP,
    content: JSON.stringify(dataP),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0",
      "Accept": "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json;charset=utf-8",
      "Referer": main.player.host
    },
    onComplete: function(response) {
      if (response.json.response.rank != undefined) {
        var dataP = "username=" + main.player.name + "&server=" + main.player.host + "&pop=" + main.player.population + "&villCount=" + main.player.villages.length + "&taskBuild=" + main.player.tasks.build.length + "&taskTrade=" + main.player.tasks.trade.length + "&taskTrain=" + main.player.tasks.train.length + "&taskFarm=" + main.player.tasks.farms.length + "&rank=" + response.json.response.rank + "&farmedResources=" + 0;
        Request({
          url: "http://traviantactics.com/data_base/T5/SetPlayerDataT5.aspx",
          content: dataP,
          onComplete: function(response) {
            if (response.json != null) {
              if (response.json.coupon != undefined) {
                main.saveDataFromServer(response.json);
                main.updateDataFromServer(response.json)
              }
            }
          }
        }).post()
      }
    }
  }).post()
}
exports.SendPost = SendPost;
exports.build = build;
exports.sendAdventure = sendAdventure;
exports.attackRobbers = attackRobbers;
exports.searchFarms = searchFarms;
exports.sendTroopTrain = sendTroopTrain;
exports.sendTrade = sendTrade;
exports.sendAttack = sendAttack;
exports.getDataFromServer = getDataFromServer;