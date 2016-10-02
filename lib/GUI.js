var utils = require('sdk/window/utils');
var {
  ToggleButton
} = require("sdk/ui/button/toggle");
var panels = require("./panel/panel");
var tabs = require("sdk/tabs");
var cm = require("sdk/context-menu");
var main = require("./main");
var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
let {
  setInterval,
  clearInterval,
  setTimeout
} = require('sdk/timers');
var version = self.version;
var panel = panels.Panel({
  width: 280,
  contentURL: "./views/index.html",
  focus: false,
  position: {
    left: 30,
    top: 100,
    bottom: 100
  },
  label: "blablabla"
});
var panelFarmFinder = panels.Panel({
  width: 1050,
  contentURL: "./views/farmFinder.html",
  focus: false,
  position: {
    left: 350,
    top: 50,
    bottom: 50
  },
  label: "blablabla"
});
exports.panel = panel;
var button = ToggleButton({
  id: "test_button",
  label: "TravianTactics",
  icon: "./views/img/TT5-5.png",
  onChange: clickFunction,
  badgeColor: "#FF66CC"
});
var rn = 1;

function clickFunction(state) {
  if (state.checked) {
    panel.show();
    panel.port.emit("BotVersion", self.version);
    rn = (rn + 1) % 5
  } else {
    panel.hide();
    panelFarmFinder.hide()
  }
  main.updateFromWindow()
}
pageMod.PageMod({
  include: "*",
  contentScriptFile: self.data.url("../lib/content-script.js"),
  contentScriptWhen: "end",
  attachTo: ["existing", "top"],
  onAttach: function(worker) {
    setTimeout(function() {
      if (typeof main.startListening == 'function') {
        main.startListening(worker)
      }
    }, 5000)
  }
});
panel.on("show", function() {
  panel.port.emit("setPlayer", main.player)
});
panel.port.on("startBot", function(start) {
  if (start == "start") {
    main.player.on = true
  } else {
    main.player.on = false
  }
});
panel.port.on("changeHeroOn", function(start) {
  if (main.player.tasks.hero) {
    main.player.tasks.hero = false
  } else {
    main.player.tasks.hero = true
  }
  console.log("hero: " + main.player.tasks.hero);
  updatePlayer();
  main.savePlayer()
});
panel.port.on("changeCampsRobbing", function(data) {
  main.player.tasks.campsRobbing = data;
  console.log("campsRobbing: " + main.player.tasks.campsRobbing);
  updatePlayer();
  main.savePlayer()
});
panel.port.on("addBuildingTask", function(data) {
  var buildingTask = Object.create(null);
  buildingTask.taskType = "build";
  buildingTask.locationId = data.building.locationId;
  buildingTask.toLvl = data.level;
  buildingTask.villageId = data.building.villageId;
  buildingTask.building = data.building;
  buildingTask.id = new Date().getUTCMilliseconds() + Math.floor(Math.random() * (100000));
  console.log(JSON.stringify(buildingTask));
  main.player.tasks.build.push(buildingTask);
  updatePlayer();
  main.savePlayer()
});
panel.port.on("addTradingTask", function(data) {
  data.id = new Date().getUTCMilliseconds() + Math.floor(Math.random() * (100000));
  main.player.tasks.trade.push(data);
  updatePlayer();
  main.savePlayer()
});
panel.port.on("removeTask", function(taskId) {
  for (var i = 0; i < main.player.tasks.build.length; i++)
    if (taskId == main.player.tasks.build[i].id) {
      main.player.tasks.build.splice(i, 1)
    }
  for (var i = 0; i < main.player.tasks.trade.length; i++)
    if (taskId == main.player.tasks.trade[i].id) {
      main.player.tasks.trade.splice(i, 1)
    }
  for (var i = 0; i < main.player.tasks.farms.length; i++)
    if (taskId == main.player.tasks.farms[i].id) {
      main.player.tasks.farms.splice(i, 1)
    }
  updatePlayer()
});
panel.port.on("removeFarmlist", function(villageId) {
  var farms = [];
  main.player.tasks.farms.forEach(function(farm) {
    if (villageId != farm.villageFrom) {
      farms.push(farm)
    }
  });
  main.player.tasks.farms = farms;
  updatePlayer();
  main.savePlayer()
});
panel.port.on("robberHideout", function(data) {
  main.player.robberHideout = data
});
var farmsShown = true;
panel.port.on("showFarms", function(data) {
  if (!panelFarmFinderShown || farmsShown != data) {
    farmsShown = data;
    panelFarmFinderShown = true;
    panelFarmFinder.show();
    panelFarmFinder.port.emit("showFarmReports", data);
    if (!data) {
      main.updateReports()
    }
  } else {
    panelFarmFinderShown = false;
    panelFarmFinder.hide()
  }
});
panel.port.on("changeFarmOn", function(data) {
  if (!main.player.villages[data].farmOn) {
    main.enableFarm(data, true)
  } else {
    main.enableFarm(data, false)
  }
  updatePlayer()
});
panel.port.on("changeTroops", function(data) {
  for (var i = 0; i < main.player.tasks.train.length; i++) {
    if (main.player.tasks.train[i].villageId == data.villageId) {
      data.checkTime = new Date();
      main.player.tasks.train[i] = data
    }
  }
  main.savePlayer()
});
panel.port.on("changeActiveVillage", function(data) {
  panelFarmFinder.port.emit("changeActiveVillage", data)
});

function setPanelFarmFinder() {
  try {
    panelFarmFinder.port.emit("changeActiveVillage", {
      x: main.player.villages[0].x,
      y: main.player.villages[0].y,
      villageId: main.player.villages[0].villageId
    })
  } catch (err) {
    console.log("failed Setting village")
  }
}
var panelFarmFinderShown = false;
panelFarmFinder.port.on("showFarms", function(data) {
  if (!panelFarmFinderShown) {
    panelFarmFinderShown = true;
    panelFarmFinder.show()
  } else {
    panelFarmFinderShown = false;
    panelFarmFinder.hide()
  }
});
panelFarmFinder.port.on("farmsSearch", function(data) {
  main.searchFarms(data)
});
panelFarmFinder.port.on("addFarms", function(data) {
  if (main.player.tasks.farms == undefined) main.player.tasks.farms = [];
  data.forEach(function(element) {
    element.id = new Date().getUTCMilliseconds() + Math.floor(Math.random() * (100000));
    main.player.tasks.farms.push(element)
  });
  updatePlayer();
  main.savePlayer()
});

function updateFarms() {
  panelFarmFinder.port.emit("updateFarms", main.player)
}

function updatePlayer() {
  panel.port.emit("setPlayer", main.player)
}

function updateLogs(logs) {
  panel.port.emit("updateLogs", logs)
}

function updateDataFromServer(data) {
  panel.port.emit("updateDataFromServer", data)
}

function updateReports(reports, troops) {
  panelFarmFinder.port.emit("setTroops", troops);
  panelFarmFinder.port.emit("updateReports", reports)
}
exports.updatePlayer = updatePlayer;
exports.updateFarms = updateFarms;
exports.updateLogs = updateLogs;
exports.updateDataFromServer = updateDataFromServer;
exports.updateReports = updateReports;
exports.setPanelFarmFinder = setPanelFarmFinder;