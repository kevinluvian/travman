var tabs = require("sdk/tabs");
var GUI = require("./GUI");
var Request = require("sdk/request").Request;
var {
  setInterval,
  clearInterval,
  setTimeout
} = require("sdk/timers");
var GUI = require("./GUI");
var travian5 = require("./windowCalls/travian5");
let {
  merge,
  extend
} = require("sdk/util/object");
var ss = require("sdk/simple-storage");
var player = initPlayer();
var pageMod = require("sdk/page-mod");
require("sdk/preferences/service").set('extensions.sdk.console.logLevel', 'all');
var enableSpecial = false;
var workerActive = Object.create(null);
var logs = [];
var lastAttackRobber = new Date();
var lastAttackFarm = new Date();
var getDataFromServerTime = new Date();
var getReportsTime = new Date();
var timerId = setInterval(startFunction, 10000);
var reports = [];
var savedReportsId = [];
var statiscicUpdate = 0;

function startFunction() {
  console.log("checking task");
  updateFromWindow()
}

function updateFromWindow() {
  try {
    if (workerActive.port != undefined) {
      workerActive.port.emit("getData", player);
      if (getReportsTime < Date.now()) {
        getReportsTime = addMinutes(getReportsTime, 10);
        workerActive.port.emit("getReports", savedReportsId)
      }
    }
  } catch (err) {
    console.log("name:" + err.stack + "   | message:" + err.message)
  }
}

function startListening(worker) {
  worker.port.on("setPlayer", function(PlayerNew) {
    workerActive = worker;
    if (player.name != PlayerNew.name) {
      player.init = true
    }
    if (player.host == extractDomain(worker.tab.url)) {
      player.init = false
    }
    var farmOn = [];
    for (var i = 0; i < player.villages.length; i++) {
      if (player.villages[i].farmOn == undefined) {
        player.villages[i].farmOn = false
      }
      farmOn.push(player.villages[i].farmOn)
    }
    player = merge(player, PlayerNew);
    for (var i = 0; i < player.villages.length; i++) {
      player.villages[i].farmOn = farmOn[i]
    }
    for (var i = 0; i < player.villages.length; i++) {
      if (player.villages[i].farmOn == undefined) {
        player.villages[i].farmOn = false
      }
      var contains = false;
      for (var j = 0; j < player.tasks.train.length; j++) {
        if (player.tasks.train[j].villageId == player.villages[i].villageId) {
          contains = true
        }
      }
      if (!contains) {
        player.tasks.train.push({
          t1: 0,
          t2: 0,
          t3: 0,
          t4: 0,
          t5: 0,
          t6: 0,
          t7: 0,
          t8: 0,
          t9: 0,
          t10: 0,
          time: 30,
          villageId: player.villages[i].villageId
        });
        farmPositions.push({
          id: player.villages[i].villageId,
          position: 0
        })
      }
    }
    if (player.init) {
      player.init = false;
      console.log("loading player");
      player.host = extractDomain(worker.tab.url);
      console.log("worker at " + extractDomain(worker.tab.url));
      loadPlayer();
      reports = [];
      savedReportsId = [];
      player.tasks.train.forEach(function(tr, index) {
        if (getVillageNumber(tr.villageId) == -1) {
          player.tasks.train.splice(index, 1)
        }
      });
      GUI.updatePlayer();
      GUI.setPanelFarmFinder()
    } else {
      if (player.on) {
        clearInterval(timerId);
        try {
          CheckBuild()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        try {
          CheckAdventure()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        try {
          CheckTrain()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        try {
          checkTrade()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        try {
          attackCamp()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        try {
          checkFarms()
        } catch (ex) {
          console.log(ex.message + " : " + ex.stack)
        }
        timerId = setInterval(startFunction, 10000)
      }
    }
    if (getDataFromServerTime < Date.now()) {
      getDataFromServerTime = addMinutes(getDataFromServerTime, 1440);
      ss.storage["p" + player.playerId + "statisctic"] = getDataFromServerTime;
      travian5.getDataFromServer()
    }
  });
  worker.port.on("addLog", function logFC(log) {
    addLog(log)
  });
  worker.port.on("setReports", function logFC(reps, lRId) {
    savedReportsId = lRId;
    reps.forEach(function(rep) {
      player.tasks.farms.forEach(function(farm) {
        if (rep.villageIdStart * 1 == farm.villageId * 1) {
          rep.originalTroops[1] = farm.t1;
          rep.originalTroops[2] = farm.t2;
          rep.originalTroops[3] = farm.t3;
          rep.originalTroops[4] = farm.t4;
          rep.originalTroops[5] = farm.t5;
          rep.originalTroops[6] = farm.t6;
          rep.villageNameStart = farm.name
        }
      });
      reports.push(rep)
    })
  });
  worker.port.emit("getData", player);
  worker.port.emit("getReports", savedReportsId)
}

function initPlayer() {
  var player1 = Object.create(null);
  player1.host = "";
  player1.name = "";
  player1.villages = [];
  player1.on = false;
  player1.init = false;
  player1.heroEnable = false;
  player1.tasks = Object.create(null);
  player1.tasks.build = [];
  player1.tasks.trade = [];
  player1.tasks.train = [];
  player1.tasks.farms = [];
  player1.tasks.robber = false;
  player1.tasks.hero = false;
  player1.tasks.campsRobbing = Object.create(null);
  player1.tasks.campsRobbing.status = false;
  player1.loaded = false;
  player1.robberHideout = {
    village: 0,
    troops: {
      on: true,
      t1: 300,
      t2: 0,
      t3: 0,
      t4: 0,
      t5: 0,
      t6: 0,
      t7: 0,
      t8: 0,
      t9: 0,
      t10: 0,
      t11: 1
    }
  };
  return player1
}

function getPlayer() {
  return player
}

function attackCamp() {
  if (player.tasks.campsRobbing == undefined) {
    player.tasks.campsRobbing = Object.create(null);
    player.tasks.campsRobbing.status = false
  }
  if (player.tasks.campsRobbing.status && lastAttackRobber < Date.now()) {
    if (player.tasks.campsRobbing.hasOwnProperty("village")) {
      lastAttackRobber = addMinutes(lastAttackRobber, 30);
      travian5.attackRobbers()
    }
  }
}
var farmPositions = [];

function checkFarms() {
  for (var j = 0; j < player.tasks.farms.length; j++) {
    var farm = player.tasks.farms[j];
    if (farm.time == undefined) {
      farm.time = new Date()
    }
    if (farm.time <= Date.now()) {
      var positionNumber = getPosition(farm.villageFrom);
      if (positionNumber !== undefined) {
        if (farmPositions[positionNumber].position == j) {
          var i = getVillageNumber(farm.villageFrom);
          if (player.villages[i].farmOn) {
            if (farm.troops.t1 * 1 <= player.villages[i].Troops[1] && farm.troops.t2 * 1 <= player.villages[i].Troops[2] && farm.troops.t3 * 1 <= player.villages[i].Troops[3] && farm.troops.t4 * 1 <= player.villages[i].Troops[4] && farm.troops.t5 * 1 <= player.villages[i].Troops[5] && farm.troops.t6 * 1 <= player.villages[i].Troops[6]) {
              player.villages[i].Troops[1] = player.villages[i].Troops[1] - farm.troops.t1 * 1;
              player.villages[i].Troops[2] = player.villages[i].Troops[2] - farm.troops.t2 * 1;
              player.villages[i].Troops[3] = player.villages[i].Troops[3] - farm.troops.t3 * 1;
              player.villages[i].Troops[4] = player.villages[i].Troops[4] - farm.troops.t4 * 1;
              player.villages[i].Troops[5] = player.villages[i].Troops[5] - farm.troops.t5 * 1;
              player.villages[i].Troops[6] = player.villages[i].Troops[6] - farm.troops.t6 * 1;
              if (farm.troops.t1 * 1 + farm.troops.t2 * 1 + farm.troops.t3 * 1 + farm.troops.t4 * 1 + farm.troops.t5 * 1 + farm.troops.t6 * 1 > 0) {
                farmPositions[positionNumber].position = (j + 1) % player.tasks.farms.length;
                var units = [0, farm.troops.t1 * 1, farm.troops.t2 * 1, farm.troops.t3 * 1, farm.troops.t4 * 1, farm.troops.t5 * 1, farm.troops.t6 * 1, 0, 0, 0, 0, 0];
                farm.time = addMinutes(new Date(), 30);
                travian5.sendAttack(farm.villageId * 1, farm.villageFrom * 1, 4, false, units, "resources")
              }
            }
          }
        }
      }
    }
  }
}

function getPosition(villageId) {
  for (var i = 0; i < farmPositions.length; i++) {
    if (farmPositions[i].id == villageId) {
      return i
    }
  }
  farmPositions.push({
    "id": villageId,
    "position": 0
  });
  return farmPositions.length - 1
}

function checkTrade() {
  for (var i = 0; i < player.tasks.trade.length; i++) {
    if (player.tasks.trade[i].time > Date.now()) {
      continue
    }
    player.tasks.trade[i].time = new Date();
    var F = getVillageNumber(player.tasks.trade[i].villageFrom.villageId);
    var T = getVillageNumber(player.tasks.trade[i].villageTo.villageId);
    if (T == undefined || F == undefined || T == -1 || F == -1) continue;
    var incomingRes = {
      r1: 0,
      r2: 0,
      r3: 0,
      r4: 0
    };
    for (var j = 0; j < player.villages.length; j++) {
      player.villages[j].troopsMoving.forEach(function(element) {
        if (element.movementType * 1 == 7 && element.villageIdTarget == player.tasks.trade[i].villageTo.villageId) {
          incomingRes.r1 = element.resources[1];
          incomingRes.r2 = element.resources[2];
          incomingRes.r3 = element.resources[3];
          incomingRes.r4 = element.resources[4]
        }
      })
    }
    var maxCapacity = player.villages[F].Merchants.maxCapacity;
    var maxS = {
      r1: 0,
      r2: 0,
      r3: 0,
      r4: 0
    };
    maxS.r1 = player.villages[F].storage[1] - player.villages[F].storageCapacity[1] * (player.tasks.trade[i].from.r1 / 100);
    if (maxS.r1 < 0) maxS.r1 = 0;
    maxS.r2 = player.villages[F].storage[2] - player.villages[F].storageCapacity[2] * (player.tasks.trade[i].from.r2 / 100);
    if (maxS.r2 < 0) maxS.r2 = 0;
    maxS.r3 = player.villages[F].storage[3] - player.villages[F].storageCapacity[3] * (player.tasks.trade[i].from.r3 / 100);
    if (maxS.r3 < 0) maxS.r3 = 0;
    maxS.r4 = player.villages[F].storage[4] - player.villages[F].storageCapacity[4] * (player.tasks.trade[i].from.r4 / 100);
    if (maxS.r4 < 0) maxS.r4 = 0;
    if (maxS.r1 + maxS.r2 + maxS.r3 + maxS.r4 < player.tasks.trade[i].minRes) continue;
    var maxR = {
      r1: 0,
      r2: 0,
      r3: 0,
      r4: 0
    };
    maxR.r1 = player.villages[T].storageCapacity[1] * (player.tasks.trade[i].to.r1 / 100) - player.villages[T].storage[1] - incomingRes.r1;
    if (maxR.r1 < 0) maxR.r1 = 0;
    maxR.r2 = player.villages[T].storageCapacity[2] * (player.tasks.trade[i].to.r2 / 100) - player.villages[T].storage[2] - incomingRes.r2;
    if (maxR.r2 < 0) maxR.r2 = 0;
    maxR.r3 = player.villages[T].storageCapacity[3] * (player.tasks.trade[i].to.r3 / 100) - player.villages[T].storage[3] - incomingRes.r3;
    if (maxR.r3 < 0) maxR.r3 = 0;
    maxR.r4 = player.villages[T].storageCapacity[4] * (player.tasks.trade[i].to.r4 / 100) - player.villages[T].storage[4] - incomingRes.r4;
    if (maxR.r4 < 0) maxR.r4 = 0;
    if (maxR.r1 + maxR.r2 + maxR.r3 + maxR.r4 < player.tasks.trade[i].minRes) continue;
    var Res = [Math.min(maxS.r1, maxR.r1), Math.min(maxS.r2, maxR.r2), Math.min(maxS.r3, maxR.r3), Math.min(maxS.r4, maxR.r4)];
    var possRes = Res[0] + Res[1] + Res[2] + Res[3];
    if (possRes <= 0) continue;
    var kol = maxCapacity / possRes;
    if (kol > 1) kol = 1;
    var finalRes = [0, Math.floor(Math.min(Res[0] * kol, maxS.r1)), Math.floor(Math.min(Res[1] * kol, maxS.r2)), Math.floor(Math.min(Res[2] * kol, maxS.r3)), Math.floor(Math.min(Res[3] * kol, maxS.r4))];
    if (finalRes[4] + finalRes[1] + finalRes[2] + finalRes[3] < player.tasks.trade[i].minRes) continue;
    if (finalRes[4] + finalRes[1] + finalRes[2] + finalRes[3] > maxCapacity) {
      possRes = finalRes[4] + finalRes[1] + finalRes[2] + finalRes[3];
      kol = maxCapacity / possRes;
      finalRes[1] = Math.floor(finalRes[1] * kol);
      finalRes[2] = Math.floor(finalRes[2] * kol);
      finalRes[3] = Math.floor(finalRes[3] * kol);
      finalRes[4] = Math.floor(finalRes[4] * kol)
    }
    player.villages[i].storage[1] = player.villages[i].storage[1] * 1 - finalRes[1] * 1;
    player.villages[i].storage[2] = player.villages[i].storage[2] * 1 - finalRes[2] * 1;
    player.villages[i].storage[3] = player.villages[i].storage[3] * 1 - finalRes[3] * 1;
    player.villages[i].storage[4] = player.villages[i].storage[4] * 1 - finalRes[4] * 1;
    travian5.sendTrade(player.tasks.trade[i].villageFrom.villageId, player.tasks.trade[i].villageTo.villageId, finalRes)
  }
}

function CheckTrain() {
  for (var i = 0; i < player.tasks.train.length; i++) {
    if (player.tasks.train[i].hasOwnProperty('checkTime')) {
      if (player.tasks.train[i].checkTime > Date.now()) {
        continue
      }
    }
    player.tasks.train[i].checkTime = new Date();
    player.tasks.train[i].checkTime = addMinutes(player.tasks.train[i].checkTime, player.tasks.train[i].time);
    for (var t = 1; t < 11; t++) {
      if (player.tasks.train[i]["t" + t] > 0) {
        var idTroop = ((player.tribeId - 1) * 10) + t;
        var r1 = troopCost[idTroop].costs[1] * player.tasks.train[i]["t" + t];
        var r2 = troopCost[idTroop].costs[2] * player.tasks.train[i]["t" + t];
        var r3 = troopCost[idTroop].costs[3] * player.tasks.train[i]["t" + t];
        var r4 = troopCost[idTroop].costs[4] * player.tasks.train[i]["t" + t];
        var vN = getVillageNumber(player.tasks.train[i].villageId);
        if (vN == -1) {
          continue
        }
        if (player.villages[vN].storage[1] * 1 > r1 && player.villages[vN].storage[2] * 1 > r2 && player.villages[vN].storage[3] * 1 > r3 && player.villages[vN].storage[4] * 1 > r4) {
          var buildingType = 0;
          var locationId = 0;
          if (t == 1 || t == 2 || t == 3) {
            buildingType = 19
          } else if (t == 4 || t == 5 || t == 6 || t == 7) {
            buildingType = 20
          } else if (t == 8 || t == 9) {
            buildingType = 21
          }
          if (player.tribeId * 1 == 2 && t == 4) {
            buildingType = 19
          }
          if (player.tribeId * 1 == 3 && t == 3) {
            buildingType = 20
          }
          console.log(JSON.stringify(player.villages[vN].buildings));
          for (var b = 0; b < player.villages[vN].buildings.length; b++) {
            if (player.villages[vN].buildings[b] != null) {
              if (player.villages[vN].buildings[b].buildingType == buildingType) {
                locationId = b + 1
              }
            }
          }
          if (locationId != 0) {
            player.villages[vN].storage[1] = player.villages[vN].storage[1] * 1 - r1;
            player.villages[vN].storage[2] = player.villages[vN].storage[2] * 1 - r2;
            player.villages[vN].storage[3] = player.villages[vN].storage[3] * 1 - r3;
            player.villages[vN].storage[4] = player.villages[vN].storage[4] * 1 - r4;
            var units = Object.create(null);
            idTroop = idTroop + "";
            units[idTroop] = player.tasks.train[i]["t" + t] * 1;
            travian5.sendTroopTrain(player.tasks.train[i].villageId, locationId, buildingType, units)
          }
        }
      }
    }
  }
}

function CheckBuild() {
  var currTime = new Date().getTime() / 1000;
  for (var j = 0; j < player.tasks.build.length; j++) {
    var i = getVillageNumber(player.tasks.build[j].villageId);
    if (i == -1) {
      removeTask(1, j);
      continue
    }
    var canBuild = true;
    if (i == undefined) {
      continue
    }
    if (player.tasks.build[j].locationId > 18 && player.tasks.build[j].locationId < 45) {
      if (player.villages[i].BuildingQueue.freeSlots[1] <= 0) {
        canBuild = false
      }
    } else {
      if (player.villages[i].BuildingQueue.freeSlots[2] <= 0) {
        canBuild = false
      }
    }
    if (canBuild) {
      if (player.tasks.build[j].building.locationId == "1-18") {
        var minLvl = 99;
        for (var t = 0; t < 18; t++) {
          if (minLvl > player.villages[i].buildings[t].lvlNext) {
            minLvl = player.villages[i].buildings[t].lvlNext
          }
        }
        if (player.tasks.build[j].toLvl * 1 < minLvl) {
          removeTask(1, j);
          break
        }
        for (var t = 0; t < 18; t++) {
          if (minLvl == player.villages[i].buildings[t].lvlNext) {
            if (build(i, j, player.villages[i].buildings[t])) {
              return
            }
          }
        }
      } else {
        if (build(i, j, player.tasks.build[j].building)) return
      }
    }
  }
}

function build(i, j, building) {
  var dateTime = new Date();
  var currTime = dateTime.getTime() / 1000;
  if (player.villages[i].buildings[building.locationId - 1].buildingType != 0) {
    building = player.villages[i].buildings[building.locationId - 1]
  }
  if (building.lvlNext * 1 <= player.tasks.build[j].toLvl * 1) {
    if (building.upgradeCosts[1] * 1 < player.villages[i].storage[1] * 1 && building.upgradeCosts[2] * 1 < player.villages[i].storage[2] * 1 && building.upgradeCosts[3] * 1 < player.villages[i].storage[3] * 1 && building.upgradeCosts[4] * 1 < player.villages[i].storage[4] * 1) {
      console.log("building");
      if (building.locationId > 18) {
        player.villages[i].BuildingQueue.freeSlots[2] = player.villages[i].BuildingQueue.freeSlots[2] - 1
      } else {
        player.villages[i].BuildingQueue.freeSlots[1] = player.villages[i].BuildingQueue.freeSlots[1] - 1
      }
      player.villages[i].storage[1] = player.villages[i].storage[1] * 1 - building.upgradeCosts[1] * 1;
      player.villages[i].storage[2] = player.villages[i].storage[2] * 1 - building.upgradeCosts[2] * 1;
      player.villages[i].storage[3] = player.villages[i].storage[3] * 1 - building.upgradeCosts[3] * 1;
      player.villages[i].storage[4] = player.villages[i].storage[4] * 1 - building.upgradeCosts[4] * 1;
      travian5.build(player.villages[i].villageId, building.locationId, building.buildingType);
      GUI.updatePlayer();
      return true
    } else {
      return false
    }
  } else {
    removeTask(1, j);
    return true
  }
}

function removeTask(type, j) {
  switch (type) {
    case 1:
      player.tasks.build.splice(j, 1);
      break
  }
  GUI.updatePlayer()
}

function updateResources() {
  var t = new Date();
  for (var i = 0; i < player.villages.length; i++) {
    player.villages[i].storage[1] = player.villages[i].storage[1] * 1;
    player.villages[i].storage[2] = player.villages[i].storage[2] * 1;
    player.villages[i].storage[3] = player.villages[i].storage[3] * 1;
    player.villages[i].storage[4] = player.villages[i].storage[4] * 1;
    player.villages[i].storage[1] += (player.villages[i].production[1] * (t - player.villages[i].updateResourcesTime) / 3600000);
    player.villages[i].storage[2] += (player.villages[i].production[2] * (t - player.villages[i].updateResourcesTime) / 3600000);
    player.villages[i].storage[3] += (player.villages[i].production[3] * (t - player.villages[i].updateResourcesTime) / 3600000);
    player.villages[i].storage[4] += (player.villages[i].production[4] * (t - player.villages[i].updateResourcesTime) / 3600000);
    player.villages[i].updateResourcesTime = new Date()
  }
}

function CheckAdventure() {
  var dateTime = new Date();
  var currTime = dateTime.getTime() / 1000;
  if (player.tasks.hero && player.hero.health > 0 && player.hero.isMoving == false && player.hero.adventurePoints * 1 > 0) {
    player.villages[getVillageNumber(player.hero.villageId)].Troops[11] = 0;
    travian5.sendAdventure()
  }
}

function extractDomain(url) {
  var domain;
  if (url.indexOf("://") > -1) {
    domain = url.split('/')[2]
  } else {
    domain = url.split('/')[0]
  }
  domain = domain.split(':')[0];
  return domain
}

function savePlayer() {
  var playerSave = initPlayer();
  playerSave.heroEnable = player.heroEnable;
  playerSave.playerId = player.playerId;
  playerSave.tasks = player.tasks;
  ss.storage["p" + playerSave.playerId] = playerSave;
  console.log("player data saved")
}

function loadPlayer() {
  if (typeof ss.storage["p" + player.playerId] !== 'undefined') {
    var playerSave = ss.storage["p" + player.playerId];
    player.heroEnable = playerSave.heroEnable;
    tasksTemp = playerSave.tasks;
    player.tasks.build = [];
    player.tasks.trade = [];
    player.tasks.train = [];
    player.tasks.farms = [];
    tasksTemp.build.forEach(function(task) {
      try {
        if (getVillageNumber(task.villageId) != -1) {
          player.tasks.build.push(task)
        }
      } catch (err) {}
    });
    tasksTemp.trade.forEach(function(task) {
      try {
        if (getVillageNumber(task.villageFrom.villageId) != -1) {
          player.tasks.trade.push(task)
        } else {
          console.log("no village for task : " + JSON.stringify(task))
        }
      } catch (err) {}
    });
    tasksTemp.train.forEach(function(task) {
      try {
        if (getVillageNumber(task.villageId) != -1) {
          player.tasks.train.push(task)
        }
      } catch (err) {}
    });
    tasksTemp.farms.forEach(function(task) {
      try {
        if (getVillageNumber(task.villageFrom) != -1) {
          player.tasks.farms.push(task)
        }
      } catch (err) {}
    });
    console.log("player data loaded")
  } else {
    player.tasks = Object.create(null);
    player.tasks.build = [];
    player.tasks.trade = [];
    player.tasks.train = [];
    player.tasks.farms = [];
    console.log("no saved data for player")
  }
  if (typeof ss.storage["p" + player.playerId + "statisctic"] !== 'undefined') {
    getDataFromServerTime = ss.storage["p" + player.playerId + "statisctic"] * 1
  } else {
    getDataFromServerTime = new Date()
  }
  travian5.getDataFromServer();
  if (typeof ss.storage["serverData"] !== 'undefined') {
    updateDataFromServer(ss.storage["serverData"])
  }
  farmPositions = []
}

function getVillageNumber(villageId) {
  for (var i = 0; i < player.villages.length; i++) {
    if (player.villages[i].villageId == villageId) {
      return i
    }
  }
  return -1
}

function getVillageId(number) {
  return player.villages[number].villageId
}

function countTroops(villageId) {
  var VN = getVillageNumber(villageId);
  var count = 0;
  for (var key in player.villages[VN].Troops) {
    count += player.villages[VN].Troops[key]
  }
  return count
}

function searchFarms(data) {
  travian5.searchFarms(data)
}

function updateFarmsGui() {
  GUI.updateFarms()
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000)
}

function addLog(log) {
  if (logs.length > 15) logs.shift();
  var today = new Date();
  var h = today.getHours();
  var m = today.getMinutes();
  var s = today.getSeconds();
  logs.push(h + "/" + m + "/" + s + " : " + log);
  GUI.updateLogs(logs)
}

function getWorker() {
  return workerActive
}

function enableFarm(i, enabled) {
  player.villages[i].farmOn = enabled;
  player.tasks.farms.forEach(function(farm) {
    if (farm.villageFrom == player.villages[i].villageId) {
      farm.time = new Date()
    }
  })
}

function updateDataFromServer(data) {
  GUI.updateDataFromServer(data)
}

function updateReports() {
  GUI.updateReports(reports, troopCost)
}

function saveDataFromServer(data) {
  ss.storage["serverData"] = data
}
var troopCost = {
  "1": {
    "id": 1,
    "nr": 1,
    "tribe": 1,
    "costs": {
      "1": 75,
      "2": 50,
      "3": 100,
      "4": 0
    },
    "time": 1600,
    "supply": 1,
    "speed": 12,
    "carry": 50,
    "attack": 40,
    "defence": 35,
    "defenceCavalry": 50,
    "requirements": [{
      "type": 2,
      "buildingType": 19,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 550,
        "2": 300,
        "3": 1000,
        "4": 0
      },
      "time": 2200
    }
  },
  "2": {
    "id": 2,
    "nr": 2,
    "tribe": 1,
    "costs": {
      "1": 80,
      "2": 100,
      "3": 160,
      "4": 0
    },
    "time": 1760,
    "supply": 1,
    "speed": 10,
    "carry": 20,
    "attack": 30,
    "defence": 65,
    "defenceCavalry": 35,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 13,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 580,
        "2": 500,
        "3": 1480,
        "4": 0
      },
      "time": 2360
    }
  },
  "3": {
    "id": 3,
    "nr": 3,
    "tribe": 1,
    "costs": {
      "1": 100,
      "2": 110,
      "3": 140,
      "4": 0
    },
    "time": 1920,
    "supply": 1,
    "speed": 14,
    "carry": 50,
    "attack": 70,
    "defence": 40,
    "defenceCavalry": 25,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 13,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 700,
        "2": 540,
        "3": 1320,
        "4": 0
      },
      "time": 2520
    }
  },
  "4": {
    "id": 4,
    "nr": 4,
    "tribe": 1,
    "costs": {
      "1": 100,
      "2": 140,
      "3": 10,
      "4": 0
    },
    "time": 1360,
    "supply": 2,
    "speed": 32,
    "carry": 0,
    "attack": 0,
    "defence": 20,
    "defenceCavalry": 10,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 700,
        "2": 660,
        "3": 280,
        "4": 0
      },
      "time": 1960
    }
  },
  "5": {
    "id": 5,
    "nr": 5,
    "tribe": 1,
    "costs": {
      "1": 350,
      "2": 260,
      "3": 180,
      "4": 0
    },
    "time": 2640,
    "supply": 3,
    "speed": 28,
    "carry": 100,
    "attack": 120,
    "defence": 65,
    "defenceCavalry": 50,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 2200,
        "2": 1140,
        "3": 1640,
        "4": 0
      },
      "time": 3240
    }
  },
  "6": {
    "id": 6,
    "nr": 6,
    "tribe": 1,
    "costs": {
      "1": 280,
      "2": 340,
      "3": 600,
      "4": 0
    },
    "time": 3520,
    "supply": 4,
    "speed": 20,
    "carry": 70,
    "attack": 180,
    "defence": 80,
    "defenceCavalry": 105,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 1780,
        "2": 1460,
        "3": 5000,
        "4": 0
      },
      "time": 4120
    }
  },
  "7": {
    "id": 7,
    "nr": 7,
    "tribe": 1,
    "costs": {
      "1": 700,
      "2": 180,
      "3": 400,
      "4": 0
    },
    "time": 4600,
    "supply": 3,
    "speed": 8,
    "carry": 0,
    "attack": 60,
    "defence": 30,
    "defenceCavalry": 75,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 4300,
        "2": 820,
        "3": 3400,
        "4": 0
      },
      "time": 5200
    }
  },
  "8": {
    "id": 8,
    "nr": 8,
    "tribe": 1,
    "costs": {
      "1": 690,
      "2": 1000,
      "3": 400,
      "4": 0
    },
    "time": 9000,
    "supply": 6,
    "speed": 6,
    "carry": 0,
    "attack": 75,
    "defence": 60,
    "defenceCavalry": 10,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 15,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 4240,
        "2": 4100,
        "3": 3400,
        "4": 0
      },
      "time": 9600
    }
  },
  "9": {
    "id": 9,
    "nr": 9,
    "tribe": 1,
    "costs": {
      "1": 30750,
      "2": 27200,
      "3": 45000,
      "4": 0
    },
    "time": 90700,
    "supply": 5,
    "speed": 8,
    "carry": 0,
    "attack": 50,
    "defence": 40,
    "defenceCavalry": 30,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 20,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 16,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 15880,
        "2": 13800,
        "3": 36400,
        "4": 0
      },
      "time": 8158
    }
  },
  "10": {
    "id": 10,
    "nr": 10,
    "tribe": 1,
    "costs": {
      "1": 3500,
      "2": 3000,
      "3": 4500,
      "4": 0
    },
    "time": 26900,
    "supply": 1,
    "speed": 10,
    "carry": 3000,
    "attack": 0,
    "defence": 80,
    "defenceCavalry": 80,
    "requirements": null,
    "research": {
      "costs": {
        "1": 21100,
        "2": 12100,
        "3": 36200,
        "4": 0
      },
      "time": 27500
    }
  },
  "11": {
    "id": 11,
    "nr": 1,
    "tribe": 2,
    "costs": {
      "1": 85,
      "2": 65,
      "3": 30,
      "4": 0
    },
    "time": 720,
    "supply": 1,
    "speed": 14,
    "carry": 60,
    "attack": 40,
    "defence": 20,
    "defenceCavalry": 5,
    "requirements": [{
      "type": 2,
      "buildingType": 19,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 610,
        "2": 360,
        "3": 440,
        "4": 0
      },
      "time": 1320
    }
  },
  "12": {
    "id": 12,
    "nr": 2,
    "tribe": 2,
    "costs": {
      "1": 125,
      "2": 50,
      "3": 65,
      "4": 0
    },
    "time": 1120,
    "supply": 1,
    "speed": 14,
    "carry": 40,
    "attack": 10,
    "defence": 35,
    "defenceCavalry": 60,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 19,
      "minLvl": 3,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 850,
        "2": 300,
        "3": 720,
        "4": 0
      },
      "time": 1720
    }
  },
  "13": {
    "id": 13,
    "nr": 3,
    "tribe": 2,
    "costs": {
      "1": 80,
      "2": 65,
      "3": 130,
      "4": 0
    },
    "time": 1200,
    "supply": 1,
    "speed": 12,
    "carry": 50,
    "attack": 60,
    "defence": 30,
    "defenceCavalry": 30,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 3,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 13,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 580,
        "2": 360,
        "3": 1240,
        "4": 0
      },
      "time": 1800
    }
  },
  "14": {
    "id": 14,
    "nr": 4,
    "tribe": 2,
    "costs": {
      "1": 140,
      "2": 80,
      "3": 30,
      "4": 0
    },
    "time": 1120,
    "supply": 1,
    "speed": 18,
    "carry": 0,
    "attack": 0,
    "defence": 10,
    "defenceCavalry": 5,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 15,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 940,
        "2": 420,
        "3": 440,
        "4": 0
      },
      "time": 1720
    }
  },
  "15": {
    "id": 15,
    "nr": 5,
    "tribe": 2,
    "costs": {
      "1": 330,
      "2": 170,
      "3": 200,
      "4": 0
    },
    "time": 2400,
    "supply": 2,
    "speed": 20,
    "carry": 110,
    "attack": 55,
    "defence": 100,
    "defenceCavalry": 40,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 2080,
        "2": 780,
        "3": 1800,
        "4": 0
      },
      "time": 3000
    }
  },
  "16": {
    "id": 16,
    "nr": 6,
    "tribe": 2,
    "costs": {
      "1": 280,
      "2": 320,
      "3": 260,
      "4": 0
    },
    "time": 2960,
    "supply": 3,
    "speed": 18,
    "carry": 80,
    "attack": 150,
    "defence": 50,
    "defenceCavalry": 75,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 15,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 1780,
        "2": 1380,
        "3": 2280,
        "4": 0
      },
      "time": 3560
    }
  },
  "17": {
    "id": 17,
    "nr": 7,
    "tribe": 2,
    "costs": {
      "1": 800,
      "2": 150,
      "3": 250,
      "4": 0
    },
    "time": 4200,
    "supply": 3,
    "speed": 8,
    "carry": 0,
    "attack": 65,
    "defence": 30,
    "defenceCavalry": 80,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 4900,
        "2": 700,
        "3": 2200,
        "4": 0
      },
      "time": 4800
    }
  },
  "18": {
    "id": 18,
    "nr": 8,
    "tribe": 2,
    "costs": {
      "1": 660,
      "2": 900,
      "3": 370,
      "4": 0
    },
    "time": 9000,
    "supply": 6,
    "speed": 6,
    "carry": 0,
    "attack": 50,
    "defence": 60,
    "defenceCavalry": 10,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 15,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 4060,
        "2": 3700,
        "3": 3160,
        "4": 0
      },
      "time": 9600
    }
  },
  "19": {
    "id": 19,
    "nr": 9,
    "tribe": 2,
    "costs": {
      "1": 35500,
      "2": 26600,
      "3": 25000,
      "4": 0
    },
    "time": 70500,
    "supply": 4,
    "speed": 8,
    "carry": 0,
    "attack": 40,
    "defence": 60,
    "defenceCavalry": 40,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 20,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 16,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 18250,
        "2": 13500,
        "3": 20400,
        "4": 0
      },
      "time": 6475
    }
  },
  "20": {
    "id": 20,
    "nr": 10,
    "tribe": 2,
    "costs": {
      "1": 4000,
      "2": 3500,
      "3": 3200,
      "4": 0
    },
    "time": 31000,
    "supply": 1,
    "speed": 10,
    "carry": 3000,
    "attack": 10,
    "defence": 80,
    "defenceCavalry": 80,
    "requirements": null,
    "research": {
      "costs": {
        "1": 24100,
        "2": 14100,
        "3": 25800,
        "4": 0
      },
      "time": 31600
    }
  },
  "21": {
    "id": 21,
    "nr": 1,
    "tribe": 3,
    "costs": {
      "1": 85,
      "2": 100,
      "3": 50,
      "4": 0
    },
    "time": 1040,
    "supply": 1,
    "speed": 14,
    "carry": 35,
    "attack": 15,
    "defence": 40,
    "defenceCavalry": 50,
    "requirements": [{
      "type": 2,
      "buildingType": 19,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 610,
        "2": 500,
        "3": 600,
        "4": 0
      },
      "time": 1640
    }
  },
  "22": {
    "id": 22,
    "nr": 2,
    "tribe": 3,
    "costs": {
      "1": 95,
      "2": 60,
      "3": 140,
      "4": 0
    },
    "time": 1440,
    "supply": 1,
    "speed": 12,
    "carry": 45,
    "attack": 65,
    "defence": 35,
    "defenceCavalry": 20,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 3,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 13,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 670,
        "2": 340,
        "3": 1320,
        "4": 0
      },
      "time": 2040
    }
  },
  "23": {
    "id": 23,
    "nr": 3,
    "tribe": 3,
    "costs": {
      "1": 140,
      "2": 110,
      "3": 20,
      "4": 0
    },
    "time": 1360,
    "supply": 2,
    "speed": 34,
    "carry": 0,
    "attack": 0,
    "defence": 20,
    "defenceCavalry": 10,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 940,
        "2": 540,
        "3": 360,
        "4": 0
      },
      "time": 1960
    }
  },
  "24": {
    "id": 24,
    "nr": 4,
    "tribe": 3,
    "costs": {
      "1": 200,
      "2": 280,
      "3": 130,
      "4": 0
    },
    "time": 2480,
    "supply": 2,
    "speed": 38,
    "carry": 75,
    "attack": 90,
    "defence": 25,
    "defenceCavalry": 40,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 3,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 1300,
        "2": 1220,
        "3": 1240,
        "4": 0
      },
      "time": 3080
    }
  },
  "25": {
    "id": 25,
    "nr": 5,
    "tribe": 3,
    "costs": {
      "1": 300,
      "2": 270,
      "3": 190,
      "4": 0
    },
    "time": 2560,
    "supply": 2,
    "speed": 32,
    "carry": 35,
    "attack": 45,
    "defence": 115,
    "defenceCavalry": 55,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 5,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 1900,
        "2": 1180,
        "3": 1720,
        "4": 0
      },
      "time": 3160
    }
  },
  "26": {
    "id": 26,
    "nr": 6,
    "tribe": 3,
    "costs": {
      "1": 300,
      "2": 380,
      "3": 440,
      "4": 0
    },
    "time": 3120,
    "supply": 3,
    "speed": 26,
    "carry": 65,
    "attack": 140,
    "defence": 60,
    "defenceCavalry": 165,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 15,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 20,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 1900,
        "2": 1620,
        "3": 3720,
        "4": 0
      },
      "time": 3720
    }
  },
  "27": {
    "id": 27,
    "nr": 7,
    "tribe": 3,
    "costs": {
      "1": 750,
      "2": 370,
      "3": 220,
      "4": 0
    },
    "time": 5000,
    "supply": 3,
    "speed": 8,
    "carry": 0,
    "attack": 50,
    "defence": 30,
    "defenceCavalry": 105,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 1,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 4600,
        "2": 1580,
        "3": 1960,
        "4": 0
      },
      "time": 5600
    }
  },
  "28": {
    "id": 28,
    "nr": 8,
    "tribe": 3,
    "costs": {
      "1": 590,
      "2": 1200,
      "3": 400,
      "4": 0
    },
    "time": 9000,
    "supply": 6,
    "speed": 6,
    "carry": 0,
    "attack": 70,
    "defence": 45,
    "defenceCavalry": 10,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 15,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 21,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 3640,
        "2": 4900,
        "3": 3400,
        "4": 0
      },
      "time": 9600
    }
  },
  "29": {
    "id": 29,
    "nr": 9,
    "tribe": 3,
    "costs": {
      "1": 30750,
      "2": 45400,
      "3": 31000,
      "4": 0
    },
    "time": 90700,
    "supply": 4,
    "speed": 10,
    "carry": 0,
    "attack": 40,
    "defence": 50,
    "defenceCavalry": 50,
    "requirements": [{
      "type": 2,
      "buildingType": 22,
      "minLvl": 20,
      "op": 5,
      "valid": 0
    }, {
      "type": 2,
      "buildingType": 16,
      "minLvl": 10,
      "op": 5,
      "valid": 0
    }],
    "research": {
      "costs": {
        "1": 15880,
        "2": 22900,
        "3": 25200,
        "4": 0
      },
      "time": 8158
    }
  },
  "30": {
    "id": 30,
    "nr": 10,
    "tribe": 3,
    "costs": {
      "1": 3000,
      "2": 4000,
      "3": 3000,
      "4": 0
    },
    "time": 22700,
    "supply": 1,
    "speed": 10,
    "carry": 3000,
    "attack": 0,
    "defence": 80,
    "defenceCavalry": 80,
    "requirements": null,
    "research": {
      "costs": {
        "1": 18100,
        "2": 16100,
        "3": 24200,
        "4": 0
      },
      "time": 23300
    }
  },
  "31": {
    "id": 31,
    "nr": 1,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 300,
    "supply": 1,
    "speed": 40,
    "carry": 0,
    "attack": 10,
    "defence": 25,
    "defenceCavalry": 20,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 900
    }
  },
  "32": {
    "id": 32,
    "nr": 2,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 360,
    "supply": 1,
    "speed": 40,
    "carry": 0,
    "attack": 20,
    "defence": 35,
    "defenceCavalry": 40,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 960
    }
  },
  "33": {
    "id": 33,
    "nr": 3,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 420,
    "supply": 1,
    "speed": 40,
    "carry": 0,
    "attack": 60,
    "defence": 40,
    "defenceCavalry": 60,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1020
    }
  },
  "34": {
    "id": 34,
    "nr": 4,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 480,
    "supply": 1,
    "speed": 40,
    "carry": 0,
    "attack": 80,
    "defence": 66,
    "defenceCavalry": 50,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1080
    }
  },
  "35": {
    "id": 35,
    "nr": 5,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 540,
    "supply": 2,
    "speed": 40,
    "carry": 0,
    "attack": 50,
    "defence": 70,
    "defenceCavalry": 33,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1140
    }
  },
  "36": {
    "id": 36,
    "nr": 6,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 600,
    "supply": 2,
    "speed": 40,
    "carry": 0,
    "attack": 100,
    "defence": 80,
    "defenceCavalry": 70,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1200
    }
  },
  "37": {
    "id": 37,
    "nr": 7,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 660,
    "supply": 3,
    "speed": 40,
    "carry": 0,
    "attack": 250,
    "defence": 140,
    "defenceCavalry": 200,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1260
    }
  },
  "38": {
    "id": 38,
    "nr": 8,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 720,
    "supply": 3,
    "speed": 40,
    "carry": 0,
    "attack": 450,
    "defence": 380,
    "defenceCavalry": 240,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1320
    }
  },
  "39": {
    "id": 39,
    "nr": 9,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 780,
    "supply": 3,
    "speed": 40,
    "carry": 0,
    "attack": 200,
    "defence": 170,
    "defenceCavalry": 250,
    "requirements": null,
    "research": {
      "costs": {
        "1": 550,
        "2": 250,
        "3": 480,
        "4": 0
      },
      "time": 665
    }
  },
  "40": {
    "id": 40,
    "nr": 10,
    "tribe": 4,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 100
    },
    "time": 840,
    "supply": 5,
    "speed": 40,
    "carry": 0,
    "attack": 600,
    "defence": 440,
    "defenceCavalry": 520,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 1440
    }
  },
  "41": {
    "id": 41,
    "nr": 1,
    "tribe": 5,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 50
    },
    "time": 240,
    "supply": 1,
    "speed": 12,
    "carry": 10,
    "attack": 20,
    "defence": 35,
    "defenceCavalry": 50,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 840
    }
  },
  "42": {
    "id": 42,
    "nr": 2,
    "tribe": 5,
    "costs": {
      "1": 100,
      "2": 100,
      "3": 100,
      "4": 50
    },
    "time": 240,
    "supply": 1,
    "speed": 14,
    "carry": 10,
    "attack": 65,
    "defence": 30,
    "defenceCavalry": 10,
    "requirements": null,
    "research": {
      "costs": {
        "1": 700,
        "2": 500,
        "3": 1000,
        "4": 0
      },
      "time": 840
    }
  },
  "43": {
    "id": 43,
    "nr": 3,
    "tribe": 5,
    "costs": {
      "1": 150,
      "2": 150,
      "3": 150,
      "4": 150
    },
    "time": 360,
    "supply": 1,
    "speed": 12,
    "carry": 10,
    "attack": 100,
    "defence": 90,
    "defenceCavalry": 75,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1000,
        "2": 700,
        "3": 1400,
        "4": 0
      },
      "time": 960
    }
  },
  "44": {
    "id": 44,
    "nr": 4,
    "tribe": 5,
    "costs": {
      "1": 50,
      "2": 50,
      "3": 50,
      "4": 75
    },
    "time": 120,
    "supply": 1,
    "speed": 50,
    "carry": 10,
    "attack": 0,
    "defence": 10,
    "defenceCavalry": 10,
    "requirements": null,
    "research": {
      "costs": {
        "1": 400,
        "2": 300,
        "3": 600,
        "4": 0
      },
      "time": 720
    }
  },
  "45": {
    "id": 45,
    "nr": 5,
    "tribe": 5,
    "costs": {
      "1": 300,
      "2": 150,
      "3": 150,
      "4": 100
    },
    "time": 480,
    "supply": 2,
    "speed": 28,
    "carry": 10,
    "attack": 155,
    "defence": 80,
    "defenceCavalry": 50,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1900,
        "2": 700,
        "3": 1400,
        "4": 0
      },
      "time": 1080
    }
  },
  "46": {
    "id": 46,
    "nr": 6,
    "tribe": 5,
    "costs": {
      "1": 250,
      "2": 250,
      "3": 400,
      "4": 150
    },
    "time": 600,
    "supply": 3,
    "speed": 24,
    "carry": 10,
    "attack": 170,
    "defence": 140,
    "defenceCavalry": 80,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1600,
        "2": 1100,
        "3": 3400,
        "4": 0
      },
      "time": 1200
    }
  },
  "47": {
    "id": 47,
    "nr": 7,
    "tribe": 5,
    "costs": {
      "1": 400,
      "2": 300,
      "3": 300,
      "4": 400
    },
    "time": 720,
    "supply": 4,
    "speed": 10,
    "carry": 10,
    "attack": 250,
    "defence": 120,
    "defenceCavalry": 150,
    "requirements": null,
    "research": {
      "costs": {
        "1": 2500,
        "2": 1300,
        "3": 2600,
        "4": 0
      },
      "time": 1320
    }
  },
  "48": {
    "id": 48,
    "nr": 8,
    "tribe": 5,
    "costs": {
      "1": 200,
      "2": 200,
      "3": 200,
      "4": 100
    },
    "time": 600,
    "supply": 5,
    "speed": 6,
    "carry": 10,
    "attack": 60,
    "defence": 45,
    "defenceCavalry": 10,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1300,
        "2": 900,
        "3": 1800,
        "4": 0
      },
      "time": 1200
    }
  },
  "49": {
    "id": 49,
    "nr": 9,
    "tribe": 5,
    "costs": {
      "1": 1000,
      "2": 1000,
      "3": 1000,
      "4": 1000
    },
    "time": 1800,
    "supply": 1,
    "speed": 10,
    "carry": 10,
    "attack": 80,
    "defence": 50,
    "defenceCavalry": 50,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1000,
        "2": 700,
        "3": 1200,
        "4": 0
      },
      "time": 750
    }
  },
  "50": {
    "id": 50,
    "nr": 10,
    "tribe": 5,
    "costs": {
      "1": 200,
      "2": 200,
      "3": 200,
      "4": 200
    },
    "time": 1800,
    "supply": 1,
    "speed": 10,
    "carry": 3000,
    "attack": 30,
    "defence": 40,
    "defenceCavalry": 40,
    "requirements": null,
    "research": {
      "costs": {
        "1": 1300,
        "2": 900,
        "3": 1800,
        "4": 0
      },
      "time": 2400
    }
  },
  "99": {
    "id": 99,
    "nr": 79,
    "tribe": 3,
    "costs": {
      "1": 35,
      "2": 30,
      "3": 10,
      "4": 20
    },
    "time": 600,
    "supply": 0,
    "speed": 0,
    "carry": 0,
    "attack": 0,
    "defence": 0,
    "defenceCavalry": 0,
    "requirements": null,
    "research": {
      "costs": {
        "1": 520,
        "2": 220,
        "3": 410,
        "4": 0
      },
      "time": 650
    }
  }
};
exports.getPlayer = getPlayer;
exports.player = player;
exports.updateReports = updateReports;
exports.startListening = startListening;
exports.getWorker = getWorker;
exports.updateFromWindow = updateFromWindow;
exports.savePlayer = savePlayer;
exports.loadPlayer = loadPlayer;
exports.getVillageNumber = getVillageNumber;
exports.getVillageId = getVillageId;
exports.countTroops = countTroops;
exports.searchFarms = searchFarms;
exports.updateFarmsGui = updateFarmsGui;
exports.addLog = addLog;
exports.enableFarm = enableFarm;
exports.updateDataFromServer = updateDataFromServer;
exports.saveDataFromServer = saveDataFromServer;