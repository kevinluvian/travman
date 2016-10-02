app.controller('mainController', ['$scope', 'socket','$window', function($scope, socket,$window) {
  $scope.BotVersion = 0;
  $scope.player=Object.create(null);
  $scope.diffVersion=false;
  $scope.option=1;
  $scope.selectedOption = 0;
  $scope.trops={on:true,  t1:300,  t11:1};
  $scope.coordinate={"x":50,"y":-50,"radius":10};
  $scope.taskTrade={from:{r1:10,r2:10,r3:10,r4:10},to:{r1:90,r2:90,r3:90,r4:90},villageFrom:0,villageTo:0,minRes:1000,time:new Date()};
  $scope.logs = [];
  $scope.lang="com";
  socket.on('setPlayer', function (player) { 
    setPlayer(player);
  });
  socket.on('updateFarms', function (data) { 
    $scope.player.farms=data;
  });
  socket.on('updateLogs', function (data) { 
    $scope.logs=data;
  });
  socket.on('BotVersion',function (data){
    $scope.BotVersion = data;
  });
  socket.on('updateDataFromServer',function (data){
    if(data.coupon!==undefined){
      $scope.golderCoupon=data.coupon;
    }
  });
  function setPlayer(player){
    if(player==null||player==undefined)
      return;
    if(player.villages.length>0){
      if(player.tasks.farms==undefined)
        player.tasks.farms=[];
      for(var i=0;i<player.villages.length;i++){
        var building=clone(player.villages[i].buildings[0]);
        building.buildingType=42;
        building.locationId="1-18";
        building.lvl="0";
        player.villages[i].buildings.unshift( building);
      }
      var currBuilding=$scope.building;
      if(currBuilding=== undefined||currBuilding===null){
        currBuilding=player.villages[0].buildings[0];
      }

      $scope.player= player;
      for(var i=0;i<player.villages.length;i++){
        for(var j=0;j<player.villages[i].buildings.length;j++){
          if(player.villages[i].buildings[j].locationId==currBuilding.locationId){
            $scope.building=player.villages[i].buildings[j];
            break;
          }
        }
      }
    }
  }
  $scope.numbers = [];
  for(var i=0;i<20;i++){
    $scope.numbers[i]=(i+1).toString();
  }
  $scope.selectedNumber = $scope.numbers[0];
  $scope.Answers = {};
  $scope.buildingId=1;
  $scope.level=1;
  $scope.startStatus="Start";
  var translation=new Translate(); 
  $scope.buldings=translation.buldings;
  $scope.languages=languages;
  $scope.buildingType="";
  $scope.buildingTypeSelect=false;
  var VillCount = 0;
  function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
  }
  $scope.customFilter = function (data) {

    console.log($scope.selectedOption);
    if ($scope.selectedOption == VillCount)
      return true;
    if (data.Name === $scope.names[$scope.selectedOption].Name) {
      return true;
    } else {
      return false;
    }
  };
  $scope.filterVillage = function (data) {
    if($scope.player.villages[$scope.selectedOption].villageId ==data.villageId)
    {
      return false;
    }
    return true;
  }
  $scope.filterVillageFarm = function (data) {
    if($scope.player.villages[$scope.selectedOption].villageId ==data.villageFrom)
    {
      return true;
    }
    return false;
  }
  $scope.villageTask = function (data) {
    if (data.villageId == $scope.player.villages[$scope.selectedOption].villageId ) {
      return true;
    } else {
      return false;
    }
  };
  $scope.villageTask2 = function (data) {
    if (data.villageFrom.villageId == $scope.player.villages[$scope.selectedOption].villageId ) {
      return true;
    } else {
      return false;
    }
  };
  $scope.tradingTask = function (data) {
    if (data.taskType == "trade") {
      return true;
    } else {
      return false;
    }
  };
  $scope.buildingChanged=function(building){
    if(building===null)
      return;
    if(building.buildingType=="0"){
      $scope.buildingTypeSelect=true;
    }else{
      $scope.buildingTypeSelect=false;
    }
  }             
  $scope.addBuildingTask=function(building,level,buildingType){
    if(building.buildingType=="0"){
      building.buildingType=buildingType;
      building.upgradeCosts={"1":Stavbe[buildingType][1][0],"2":Stavbe[buildingType][1][1],"3":Stavbe[buildingType][1][2],"4":Stavbe[buildingType][1][3]};
    }

    building.villageId=$scope.player.villages[$scope.selectedOption].villageId;
    socket.emit("addBuildingTask", {"building":building,"level":level});
  }
  $scope.addTradingTask=function(){
    if($scope.taskTrade.villageTo!=0){
      $scope.taskTrade.villageFrom=$scope.player.villages[$scope.selectedOption];
      socket.emit("addTradingTask", $scope.taskTrade);
    }
  }
  $scope.removeTask=function(taskId){
    socket.emit("removeTask", taskId);
  }
  $scope.changeHeroOn=function(){

    socket.emit("changeHeroOn", "");
  }
  $scope.changeCampsRobbing=function(){
    if(!$scope.player.tasks.campsRobbing.hasOwnProperty("village")){
      $scope.player.tasks.campsRobbing.status=false;
    }
    socket.emit("changeCampsRobbing", $scope.player.tasks.campsRobbing);
  }
  $scope.robberHideout=function(){
    var robberHideoutObj={village:selectedOption,trops:$scope.trops};
    socket.emit("robberHideout", robberHideoutObj);
  }
  $scope.changeTroops=function(){
    socket.emit("changeTroops", $scope.player.tasks.train[$scope.selectedOption]);
  }
  $scope.startBot = function () {
    console.log("start clicked");
    if($scope.startStatus=="Start"){
      $scope.startStatus="Stop";
      socket.emit("startBot", "start");
    }
    else{
     socket.emit("startBot", "stop");
     $scope.startStatus="Start";
   }
 }
 $scope.showFarms= function () {
  socket.emit("showFarms", true);
}
$scope.showReports=function(){
  socket.emit("showFarms", false);

}
$scope.changeFarmOn=function(){

  socket.emit("changeFarmOn", $scope.selectedOption);

}
$scope.openWindow = function() {
    $window.open("http://traviantactics.com/golder/");
};
$scope.removeFarmlist=function(){
    socket.emit("removeFarmlist", $scope.player.villages[$scope.selectedOption].villageId);

}
$scope.changeLang=function(){
  translation.nastavi($scope.lang);
  $scope.buldings=translation.buldings;
}
$scope.setbuildingName=function(type,displayImage){
  if(type==42&&displayImage){
    return '<img src="img/wood.png"   width="20" height="20"/><img src="img/clay.png"   width="20" height="20"/><img src="img/iron.png"   width="20" height="20"/><img src="img/grain.png"   width="20" height="20"/>';
  }
  return $scope.buldings[type];
}
$scope.$watch(
    "selectedOption",
    function handleFooChange( newValue, oldValue ) {
      if($scope.player.villages!=undefined){
            socket.emit("changeActiveVillage", {x:$scope.player.villages[newValue].x,y:$scope.player.villages[newValue].y,villageId:$scope.player.villages[newValue].villageId});
          }
    }
);
//$scope.player=Object.create(null);
//$scope.player={"villages":[{"villageId":537739306,"playerId":2285,"name":"Dorf von Infeno","tribeId":3,"type":1,"supplyBuildings":150,"supplyTroops":120,"production":{"1":"390","2":"456","3":"390","4":"274"},"storage":{"1":1575.375,"2":1747.4577777778,"3":1575.375,"4":1273.2663888889},"storageCapacity":{"1":"9600","2":"9600","3":"9600","4":"7700"},"lastProduction":1449511392393,"lastCalculation":1449511588276,"lastTributeProduction":1449511392393,"lastTributeCalculation":0,"cropBrutto":"274150120","x":42,"y":26,"isActive":false,"calculatedStorage":{"1":1596,"2":1772,"3":1596,"4":1288},"belongsToKing":1065,"tributes":{"1":203,"2":237,"3":203,"4":0},"treasury":{"1":"0","2":"0","3":"0","4":0},"calculatedTributes":{"1":203,"2":237,"3":203},"tributeBonusResources":{"1":0,"2":0,"3":0},"tributeTreasures":0,"tributesCapacity":9600,"tributesOnTheirWay":false,"culturePoints":3078.4687152781,"culturePointProduction":231,"realTributePercent":0,"bonusCulturePointProduction":0,"tributeSum":643,"canFetchTributes":false,"tributePercentage":7,"tributeTreasureMarker":20,"timeUntilTributeFetch":1449530007.8457491,"tributeProduction":247,"position":0,"celebrations":[],"population":150,"coordinates":{"x":"42","y":"26"},"isMainVillage":true,"isTown":false,"treasuresUsable":0,"treasures":0,"usedControlPoints":0,"availableControlPoints":0,"celebrationType":0,"celebrationEnd":0,"treasureResourceBonus":0,"acceptance":100,"acceptanceProduction":3.34996,"tributeTime":1449403424,"tributesRequiredToFetch":1920,"timeUntilTributeFull":1449641943.0684211,"buildings":[{"buildingType":1,"villageId":537739306,"locationId":1,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":520,"2":1300,"3":650,"4":780},"upgradeTime":1650,"upgradeSupplyUsage":2,"category":3,"sortOrder":1,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":4,"villageId":537739306,"locationId":2,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":975,"2":1170,"3":1105,"4":0},"upgradeTime":1380,"upgradeSupplyUsage":1,"category":3,"sortOrder":4,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":1,"villageId":537739306,"locationId":3,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":520,"2":1300,"3":650,"4":780},"upgradeTime":1650,"upgradeSupplyUsage":2,"category":3,"sortOrder":1,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":3,"villageId":537739306,"locationId":4,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":1300,"2":1040,"3":390,"4":780},"upgradeTime":2100,"upgradeSupplyUsage":2,"category":3,"sortOrder":3,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":2,"villageId":537739306,"locationId":5,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":1040,"2":520,"3":1040,"4":650},"upgradeTime":1530,"upgradeSupplyUsage":2,"category":3,"sortOrder":2,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":2,"villageId":537739306,"locationId":6,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":1040,"2":520,"3":1040,"4":650},"upgradeTime":1530,"upgradeSupplyUsage":2,"category":3,"sortOrder":2,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":3,"villageId":537739306,"locationId":7,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":1300,"2":1040,"3":390,"4":780},"upgradeTime":2100,"upgradeSupplyUsage":2,"category":3,"sortOrder":3,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":4,"villageId":537739306,"locationId":8,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":975,"2":1170,"3":1105,"4":0},"upgradeTime":1380,"upgradeSupplyUsage":1,"category":3,"sortOrder":4,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]}},{"buildingType":4,"villageId":537739306,"locationId":9,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":585,"2":700,"3":660,"4":0},"upgradeTime":690,"upgradeSupplyUsage":0,"category":3,"sortOrder":4,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":3,"villageId":537739306,"locationId":10,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":780,"2":620,"3":235,"4":465},"upgradeTime":1050,"upgradeSupplyUsage":2,"category":3,"sortOrder":3,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":3,"villageId":537739306,"locationId":11,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":780,"2":620,"3":235,"4":465},"upgradeTime":1050,"upgradeSupplyUsage":2,"category":3,"sortOrder":3,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":4,"villageId":537739306,"locationId":12,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":585,"2":700,"3":660,"4":0},"upgradeTime":690,"upgradeSupplyUsage":0,"category":3,"sortOrder":4,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":4,"villageId":537739306,"locationId":13,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":585,"2":700,"3":660,"4":0},"upgradeTime":690,"upgradeSupplyUsage":0,"category":3,"sortOrder":4,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":1,"villageId":537739306,"locationId":14,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":310,"2":780,"3":390,"4":465},"upgradeTime":840,"upgradeSupplyUsage":1,"category":3,"sortOrder":1,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":4,"villageId":537739306,"locationId":15,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":585,"2":700,"3":660,"4":0},"upgradeTime":690,"upgradeSupplyUsage":0,"category":3,"sortOrder":4,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":2,"villageId":537739306,"locationId":16,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":620,"2":310,"3":620,"4":390},"upgradeTime":750,"upgradeSupplyUsage":1,"category":3,"sortOrder":2,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":1,"villageId":537739306,"locationId":17,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":310,"2":780,"3":390,"4":465},"upgradeTime":840,"upgradeSupplyUsage":1,"category":3,"sortOrder":1,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":2,"villageId":537739306,"locationId":18,"lvl":4,"lvlNext":5,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":620,"2":310,"3":620,"4":390},"upgradeTime":750,"upgradeSupplyUsage":1,"category":3,"sortOrder":2,"effect":[66,99,150,210],"inQueueEffects":[],"nextEffect":{"level":5,"values":[99]},"currentEffect":{"level":4,"values":[66]}},{"buildingType":25,"villageId":537739306,"locationId":19,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":1995,"2":1580,"3":1205,"4":620},"upgradeTime":2400,"upgradeSupplyUsage":1,"category":1,"sortOrder":25,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":20,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":17,"villageId":537739306,"locationId":21,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":275,"2":240,"3":410,"4":240},"upgradeTime":1560,"upgradeSupplyUsage":3,"category":1,"sortOrder":17,"effect":["5",6,7,8],"inQueueEffects":[],"nextEffect":{"level":6,"values":[6]},"currentEffect":{"level":5,"values":["5"]}},{"buildingType":0,"villageId":537739306,"locationId":22,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":23,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":24,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":10,"villageId":537739306,"locationId":25,"lvl":9,"lvlNext":10,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":1825,"2":2345,"3":1300,"4":0},"upgradeTime":4560,"upgradeSupplyUsage":1,"category":1,"sortOrder":10,"effect":[9600,12000,14400,18000],"inQueueEffects":[],"nextEffect":{"level":10,"values":[12000]},"currentEffect":{"level":9,"values":[9600]}},{"buildingType":11,"villageId":537739306,"locationId":26,"lvl":8,"lvlNext":9,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":785,"2":980,"3":685,"4":195},"upgradeTime":3780,"upgradeSupplyUsage":1,"category":1,"sortOrder":11,"effect":[7700,9600,12000,14400],"inQueueEffects":[],"nextEffect":{"level":9,"values":[9600]},"currentEffect":{"level":8,"values":[7700]}},{"buildingType":15,"villageId":537739306,"locationId":27,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":290,"2":165,"3":250,"4":85},"upgradeTime":1500,"upgradeSupplyUsage":2,"category":1,"sortOrder":15,"effect":[86,83,80,77],"inQueueEffects":[],"nextEffect":{"level":6,"values":[83]},"currentEffect":{"level":5,"values":[86]}},{"buildingType":23,"villageId":537739306,"locationId":28,"lvl":5,"lvlNext":6,"isMaxLvl":false,"lvlMax":10,"upgradeCosts":{"1":135,"2":170,"3":105,"4":35},"upgradeTime":455,"upgradeSupplyUsage":1,"category":1,"sortOrder":27,"effect":[560,720,920,1200],"inQueueEffects":[],"nextEffect":{"level":6,"values":[720]},"currentEffect":{"level":5,"values":[560]}},{"buildingType":19,"villageId":537739306,"locationId":29,"lvl":7,"lvlNext":8,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":1545,"2":1030,"3":1915,"4":885},"upgradeTime":3420,"upgradeSupplyUsage":3,"category":2,"sortOrder":19,"effect":[53,48,43,39],"inQueueEffects":[],"nextEffect":{"level":8,"values":[48]},"currentEffect":{"level":7,"values":[53]}},{"buildingType":8,"villageId":537739306,"locationId":30,"lvl":1,"lvlNext":2,"isMaxLvl":false,"lvlMax":5,"upgradeCosts":{"1":900,"2":790,"3":685,"4":2230},"upgradeTime":430,"upgradeSupplyUsage":2,"category":3,"sortOrder":8,"effect":[5,10,15,20],"inQueueEffects":[],"nextEffect":{"level":2,"values":[10]},"currentEffect":{"level":1,"values":[5]}},{"buildingType":0,"villageId":537739306,"locationId":31,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":16,"villageId":537739306,"locationId":32,"lvl":2,"lvlNext":3,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":195,"2":285,"3":160,"4":125},"upgradeTime":160,"upgradeSupplyUsage":1,"category":2,"sortOrder":16,"inQueueEffects":[],"nextEffect":null},{"buildingType":33,"villageId":537739306,"locationId":33,"lvl":3,"lvlNext":4,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":335,"2":210,"3":170,"4":125},"upgradeTime":295,"upgradeSupplyUsage":0,"category":2,"sortOrder":33,"effect":[8,10,13,16],"inQueueEffects":[],"nextEffect":{"level":4,"values":[10]},"currentEffect":{"level":3,"values":[8]}},{"buildingType":18,"villageId":537739306,"locationId":34,"lvl":1,"lvlNext":2,"isMaxLvl":false,"lvlMax":20,"upgradeCosts":{"1":930,"2":890,"3":930,"4":320},"upgradeTime":75,"upgradeSupplyUsage":2,"category":1,"sortOrder":18,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":35,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":36,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":37,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":38,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":39,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null},{"buildingType":0,"villageId":537739306,"locationId":40,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":0,"2":0,"3":0,"4":0},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null}],"BuildingQueue":{"villageId":537739306,"tribeId":3,"freeSlots":{"1":2,"2":2,"4":0},"queues":{"1":[],"2":[],"4":[],"5":[]},"canUseInstantConstruction":false,"canUseInstantConstructionOnlyInVillage":false},"UnitQueue":{"villageId":"537739306","buildingTypes":[],"unitsInQueue":[null,0,0,0,0,0,0,0,0,0,0,0,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,0]},"Troops":{"1":79,"2":41,"3":0,"4":0,"5":0,"6":0,"7":0,"8":0,"9":0,"10":0,"11":1}}],"on":false,"init":false,"heroEnable":false,"tasks":{"build":[{"taskType":"build","locationId":19,"toLvl":"10","villageId":537739306,"building":{"buildingType":"25","villageId":537739306,"locationId":19,"lvl":0,"lvlNext":1,"isMaxLvl":false,"lvlMax":0,"upgradeCosts":{"1":580,"2":460,"3":350,"4":180},"upgradeTime":10,"upgradeSupplyUsage":0,"category":0,"sortOrder":0,"inQueueEffects":[],"nextEffect":null,"$$hashKey":"object:156"},"id":55},{"taskType":"build","locationId":"1-18","toLvl":"3","villageId":537739306,"building":{"buildingType":42,"villageId":537739306,"locationId":"1-18","lvl":"0","lvlNext":6,"isMaxLvl":false,"lvlMax":99,"upgradeCosts":{"1":520,"2":1300,"3":650,"4":780},"upgradeTime":1650,"upgradeSupplyUsage":2,"category":3,"sortOrder":1,"effect":[99,150,210,300],"inQueueEffects":[],"nextEffect":{"level":6,"values":[150]},"currentEffect":{"level":5,"values":[99]},"$$hashKey":"object:187"},"id":305}],"trade":[],"train":[],"robber":false,"hero":true},"loaded":false,"robberHideout":{"village":0,"trops":{"on":true,"t1":300,"t2":0,"t3":0,"t4":0,"t5":0,"t6":0,"t7":0,"t8":0,"t9":0,"t10":0,"t11":1}},"host":"kx3-de.travian.com","playerId":2285,"name":"Infeno","tribeId":3,"kingdomId":0,"allianceId":0,"allianceRights":0,"kingdomRole":0,"isKing":false,"kingstatus":0,"allianceTag":"","population":150,"active":1,"prestige":0,"level":0,"stars":{"bronze":0,"silver":0,"gold":0},"nextLevelPrestige":25,"hasNoobProtection":false,"uiLimitations":1,"gold":0,"silver":20514,"deletionTime":0,"taxRate":0,"coronationDuration":0,"brewCelebration":0,"uiStatus":-1,"hintStatus":0,"spawnedOnMap":1448183412,"isActivated":1,"isInstant":0,"signupTime":1448183232,"productionBonusTime":1448908418,"cropProductionBonusTime":1448908418,"premiumFeatureAutoExtendFlags":0,"plusAccountTime":1448908418,"limitedPremiumFeatureFlags":1,"lastPaymentTime":0,"isPunished":false,"limitationFlags":0,"isBannedFromMessaging":false,"bannedFromMessaging":0,"questVersion":1,"nextDailyQuestTime":1449532800,"dailyQuestsExchanged":0,"hero":{"playerId":2285,"villageId":537739306,"destVillageId":537706540,"status":0,"health":94,"lastHealthTime":1449511394,"baseRegenerationRate":30,"regenerationRate":30,"fightStrengthPoints":16,"attBonusPoints":0,"defBonusPoints":0,"resBonusPoints":0,"resBonusType":0,"freePoints":4,"speed":38,"untilTime":1449400139,"bonuses":{"17":14,"23":250},"maxScrollsPerDay":0,"scrollsUsedToday":0,"waterbucketUsedToday":0,"ointmentsUsedToday":0,"adventurePointCardUsedToday":0,"resourceChestsUsedToday":0,"cropChestsUsedToday":0,"artworkUsedToday":0,"isMoving":false,"adventurePoints":35,"adventurePointTime":1449520127,"xp":764,"xpThisLevel":750,"xpNextLevel":1050,"level":5,"notAlive":false},"SeesionId":"e88c9ade6b3a157a9103"};

//$scope.player.nameTemp = "mitja";
}]);

app.config(['$compileProvider', function ($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(filesystem:resource|resource):/); 
}]);