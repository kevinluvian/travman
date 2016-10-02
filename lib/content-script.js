self.port.on("request", function(requestUrl, postData) {
  console.log("request " + requestUrl + " data: " + JSON.stringify(postData));
  self.port.emit("addLog", requestUrl + " data: " + JSON.stringify(postData));
  switch (requestUrl) {
    case "troops/send":
      var units = unsafeWindow.Cache.c["Collection:Troops:stationary:" + postData["villageId"]].data[0].data.units;
      var TroopsCount = 0;
      for (var i = 1; i < 12; i++) {
        TroopsCount += postData.units[i];
        if (units[i] === undefined) {
          if (postData.units[i] != 0) {
            console.log("trops number invalid: " + postData.units[i]);
            return
          }
        }
        if (parseInt(units[i]) < postData.units[i]) {
          console.log("trops number invalid2");
          return
        }
      }
      if (TroopsCount == 0) {
        console.log("can not send 0 troops");
        return
      }
      break;
    case "trade/sendResources":
      var storage = unsafeWindow.Cache.c["Village:" + postData.sourceVillageId].data.storage;
      var Merchants = unsafeWindow.Cache.c["Merchants:" + postData.sourceVillageId].data;
      if (Merchants.maxCapacity < postData.resources[1] + postData.resources[2] + postData.resources[3] + postData.resources[4]) {
        console.log("not enought merchants" + JSON.stringify(storage));
        return
      }
      if (storage[1] * 1 < postData.resources[1] || storage[2] < postData.resources[2] || storage[3] < postData.resources[3] * 1 || storage[4] * 1 < postData.resources[4]) {
        console.log("not enought resources to send merchants" + JSON.stringify(storage));
        return
      }
      break;
    case "building/upgrade":
      var storage = unsafeWindow.Cache.c["Village:" + postData.villageId].data.storage;
      var Tbuildings = unsafeWindow.Cache.c["Collection:Building:" + postData.villageId].data;
      var BuildingQueue = unsafeWindow.Cache.c["BuildingQueue:" + postData.villageId].data;
      if (postData.locationId > 18) {
        if (BuildingQueue.freeSlots[2] <= 0) {
          console.log("no free slot 2:" + JSON.stringify(BuildingQueue.freeSlots));
          return
        }
      } else {
        if (BuildingQueue.freeSlots[1] <= 0) {
          console.log("no free slot 1:" + JSON.stringify(BuildingQueue.freeSlots));
          return
        }
      }
      for (var j = 0; j < Tbuildings.length; j++) {
        if (Tbuildings[j].data.locationId == postData.locationId) {
          if (storage[1] * 1 < Tbuildings[j].data.upgradeCosts[1] || storage[2] < Tbuildings[j].data.upgradeCosts[2] || storage[3] < Tbuildings[j].data.upgradeCosts[3] * 1 || storage[4] * 1 < Tbuildings[j].data.upgradeCosts[4]) {
            console.log("not enought resources to send merchants" + JSON.stringify(storage));
            return
          }
          break
        }
      }
      break
  }
  if (unsafeWindow.parent.hasOwnProperty('Travian')) {
    unsafeWindow.requestUrl = cloneInto(requestUrl, unsafeWindow.parent);
    unsafeWindow.postData = cloneInto(postData, unsafeWindow.parent);
    unsafeWindow.parent.Travian.request(unsafeWindow.requestUrl, unsafeWindow.postData)
  }
});
self.port.on("getReports", function(savedReports) {
  if (unsafeWindow.Cache.hasOwnProperty('c')) {
    var reports = [];
    Object.keys(unsafeWindow.Cache.c).forEach(function(key) {
      var Entry = [key, unsafeWindow.Cache.c[key]];
      if (String(Entry[0]).indexOf("Troops:") == 0) {
        var reportId = Entry[0].substring(7) * 1;
        var isSaved = false;
        savedReports.forEach(function(rep) {
          if (rep == reportId) {
            isSaved = true
          }
        });
        if (!isSaved) {
          if (Entry[1].data.hasOwnProperty("movement")) {
            if (Entry[1].data.movement.hasOwnProperty("movementType")) {
              if (Entry[1].data.movement.movementType * 1 == 9) {
                savedReports.push(reportId);
                console.log(reportId);
                reports.push({
                  "capacity": Entry[1].data.capacity,
                  "resources": Entry[1].data.movement.resources,
                  "playerIdTarget": Entry[1].data.movement.playerIdTarget,
                  "playerNameTarget": Entry[1].data.movement.playerNameTarget,
                  "villageIdStart": Entry[1].data.movement.villageIdStart,
                  "villageNameStart": Entry[1].data.movement.villageNameStart,
                  "villageIdTarget": Entry[1].data.movement.villageIdTarget,
                  "villageNameTarget": Entry[1].data.movement.villageNameTarget,
                  "originalTroops": Entry[1].data.originalTroops,
                  "units": Entry[1].data.units,
                  "timeStart": Entry[1].data.movement.timeStart,
                  "timeFinish": Entry[1].data.movement.timeFinish
                })
              }
            }
          }
        }
      }
    });
    self.port.emit("setReports", reports, savedReports);
    reports = [];
    savedReports = []
  }
});

function clone(obj) {
  var copy;
  if (null == obj || "object" != typeof obj) return obj;
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy
  }
  if (Array.isArray(obj)) {
    copy = [];
    for (var i = 0, len = obj.length; i < len; i++) {
      copy[i] = clone(obj[i])
    }
    return copy
  }
  if ((typeof obj === 'function') || (typeof obj === 'object')) {
    copy = {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr])
    }
    return copy
  }
}
self.port.on("getData", function() {
  try {
    if (unsafeWindow.parent.hasOwnProperty('Travian')) {
      if (unsafeWindow.parent.Travian.hasOwnProperty('Player')) {
        if (unsafeWindow.parent.Travian.Player.data.playerId > 0) {
          var player = clone(Object(unsafeWindow.parent.Travian.Player.data));
          player.hero = clone(Object(unsafeWindow.Cache.c["Hero:" + player.playerId].data));
          for (var i = 0; i < player.villages.length; i++) {
            if (unsafeWindow.Cache.c.hasOwnProperty("Village:" + player.villages[i].villageId)) {
              player.villages[i] = clone(Object(unsafeWindow.Cache.c["Village:" + player.villages[i].villageId].data));
              player.villages[i].buildings = [];
              for (var j = 0; j < 40; j++) {
                player.villages[i].buildings.push(0)
              }
              if (unsafeWindow.Cache.c.hasOwnProperty("Collection:Building:" + player.villages[i].villageId)) {
                var Tbuildings = clone(Object(unsafeWindow.Cache.c["Collection:Building:" + player.villages[i].villageId].data));
                for (var j = 0; j < Tbuildings.length; j++) {
                  player.villages[i].buildings[Tbuildings[j].data.locationId - 1] = Tbuildings[j].data
                }
                Tbuildings = null;
                delete Tbuildings
              }
              if (unsafeWindow.Cache.c.hasOwnProperty("BuildingQueue:" + player.villages[i].villageId)) {
                player.villages[i].BuildingQueue = clone(Object(unsafeWindow.Cache.c["BuildingQueue:" + player.villages[i].villageId].data))
              }
              if (unsafeWindow.Cache.c.hasOwnProperty("UnitQueue:" + player.villages[i].villageId)) {
                player.villages[i].UnitQueue = clone(Object(unsafeWindow.Cache.c["UnitQueue:" + player.villages[i].villageId].data))
              }
              if (unsafeWindow.Cache.c.hasOwnProperty("Merchants:" + player.villages[i].villageId)) {
                player.villages[i].Merchants = clone(Object(unsafeWindow.Cache.c["Merchants:" + player.villages[i].villageId].data))
              } else {
                player.villages[i].Merchants = {
                  maxCapacity: 0
                }
              }
              player.villages[i].troopsMoving = [];
              if (unsafeWindow.Cache.c.hasOwnProperty("Collection:Troops:moving:" + player.villages[i].villageId)) {
                var troopsMoving = clone(Object(unsafeWindow.Cache.c["Collection:Troops:moving:" + player.villages[i].villageId].data));
                troopsMoving.forEach(function(element) {
                  player.villages[i].troopsMoving.push(clone(Object(element.data.movement)))
                });
                troopsMoving = null;
                delete troopsMoving
              }
              if (unsafeWindow.Cache.c.hasOwnProperty("Collection:Troops:stationary:" + player.villages[i].villageId)) {
                player.villages[i].Troops = clone(Object(unsafeWindow.Cache.c["Collection:Troops:stationary:" + player.villages[i].villageId].data[0].data.units));
                for (var z = 1; z < 12; z++) {
                  if (typeof player.villages[i].Troops[z] === 'undefined') {
                    player.villages[i].Troops[z] = 0
                  } else {
                    player.villages[i].Troops[z] = player.villages[i].Troops[z] * 1
                  }
                }
              }
            }
          }
          if (player.SeesionId == undefined) {
            Object.keys(unsafeWindow.Cache.c).forEach(function(key) {
              if (String(unsafeWindow.Cache.c[key].name).indexOf("Session") == 0) {
                player.SeesionId = unsafeWindow.Cache.c[key].data.sessionId
              }
            })
          }
          self.port.emit("setPlayer", player);
          player = null;
          delete player
        }
      }
    }
  } catch (ex) {
    console.log(ex.stack)
  }
});