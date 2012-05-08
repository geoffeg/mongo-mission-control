var activeHosts = {};

function addReplicaSet(config) {
	getReplicaSetStatus(config['host'], addServer);

}


function addServer(config) {
	console.log("add new host");
	if (activeHosts[config.host]) {
		console.log(config.host + " already exists, skipping");
		return;
	}
	activeHosts[config.host] = "active";
	var actions = {
		sum: function(result) {
			console.log('The result was ' + result);
		},
		log: function(message) {
			console.log(message);
		},
		serverStatus: function(message) {
			updateHost(message);
		}
	};

	var worker = new Worker("js/worker.js");
	// worker.postMessage({action: "setHostName", args: ["hostName"]})

	worker.onmessage = function(event) {
		var data        = JSON.parse(event.data), // parse the data
				action      = data.action,            // get the action
				returnValue = data.returnValue;       // get the returnValue

		// if we understand the action
		if (action in actions) {
			// handle the returnValue for the action
			actions[action].call(this,returnValue);
		} else {
			// throw an error? our worker isn't communicating properly
		}
	};

	worker.postMessage(JSON.stringify({
		action: 'config',
		args: [config]
	}));
	return worker;
}

function getUrlParam(param,s) { 
	s = s ? s : window.location.search; 
	var re = new RegExp('&'+param+'(?:=([^&]*))?(?=&|$)','i'); 
	return (s=s.replace(/^\?/,'&').match(re)) ? (typeof s[1] == 'undefined' ? '' : decodeURIComponent(s[1])) : undefined; 
} 

function getReplicaSetStatus(hostName, callback) {
	$.ajax({
		url: "command-proxy.php?host=" + hostName + "&command=replSetGetStatus", 
  	timeout: 5000,
	  success: function(data) {
			$.each(data['members'], function(index, val) {
				var config = {host: val['name']};
				callback(config);
			});
	});
}

var previousData = {};

function addHost(hostData) {
	var all_values = {"previousValues" : hostData, "currentValues" : hostData, "host" : hostData.host};
	if (hostData['replicaSet'] && hostData['replicaSet']['stateStr'] == "PRIMARY") {
		$("#hostHeaderTemplate").tmpl(all_values).insertAfter("#updatetime");
		$("#statusTemplate").tmpl(all_values).insertAfter("#mongo-stats-column-labels");
	} else {
		var template = Handlebars.compile($("#hostHeaderTemplate").html());
		$("#mongo-stats-header").append(template(all_values));
		template = Handlebars.compile($("#statusTemplate").html());
		$("#mongo-status-table").append(template(all_values));
	}
	previousData[hostData.host] = hostData;
	calculateColumnWidths();
}


function updateHost(hostData) {
	console.log(hostData);
	if (hostData.host in previousData) {
		var all_values = {"previousValues" : previousData[hostData.host], "currentValues" : hostData, "host" : hostData.host};
		var template = Handlebars.compile($("#statusTemplate").html());
		$("#host-column-" + getCssHostName(hostData.host)).replaceWith(template(all_values));
		previousData[hostData.host] = hostData;
		calculateColumnWidths();
	} else {
		addHost(hostData);
	}
}

function calculateColumnWidths() {
	var widthAvailable = $("#mongo-status-table").innerWidth() - $("#mongo-stats-column-labels").outerWidth();
	var columnsShown = $(".host-column").length - 1;
	var widthPerColumn = Math.floor(widthAvailable / columnsShown);
	$(".host-column[id!=mongo-stats-column-labels]").css("width", widthPerColumn + "px");
	$(".host-column[id!=mongo-stats-column-labels]").each(function(i) {
		$(this).css("width", widthPerColumn + "px");
		var thisHostName = $(this).attr('id').match(/(?:[a-z]+\-){2}(.*)/);
		$("#host-header-" + thisHostName[1]).css("width", widthPerColumn + "px");
		$("#host-header-" + thisHostName[1]).css("left", $(this).position().left);
	});
}


function getDiffVals(currentValue, previousValue, lastUpdate) {
	var secondsSinceLastRequest = parseInt((new Date().getTime() - lastUpdate) / 1000)
		return parseInt((currentValue - previousValue) / secondsSinceLastRequest);
}

function getCssHostName(hostName) {
	return hostName.replace(/\./ig, "-").replace(/:/,'');
}


// Handlebars block helpers
Handlebars.registerHelper('divByThou', function(val) {
	return val / 1000;
});

Handlebars.registerHelper('getNiceDate', function(dateObj) {
	return sprintf("%02d:%02d:%02d<BR/>%02d/%02d", dateObj.getHours(), dateObj.getMinutes(), dateObj.getSeconds(), dateObj.getMonth(), dateObj.getDate());
});

Handlebars.registerHelper('getDiffVals', function(currentValue, previousValue, lastUpdate) {
		return getDiffVals(currentValue, previousValue, lastUpdate);
});

Handlebars.registerHelper('getLockRatio', function(currentLockTime, previousLockTime, currentTotalTime, previousTotalTime) {
	var lockTimeDelta = currentLockTime - previousLockTime;
	var currentTotalDelta = currentTotalTime - previousTotalTime;
	var lockRatio = lockTimeDelta / currentTotalDelta;
	return sprintf("%3.2f", lockRatio * 100);
});

Handlebars.registerHelper('getGaugeVal', function(dataExpr, currentValue, lastUpdate) {
	if (lastUpdate == undefined) return 0;
	var diff = getDiffVals(dataExpr, currentValue, lastUpdate) / (new Date().getTime() / 1000 - lastUpdate / 1000);
	return sprintf("%10.2f", diff / 1024);
});

Handlebars.registerHelper('getCssHostName', function(hostName) {
	return hostName.replace(/\./ig, "-").replace(/:/,'');
});

Handlebars.registerHelper('cleanHostName', function(hostName) {
	return getCssHostName(hostName);
});

Handlebars.registerHelper('sprintf', function(format, val) {
	return sprintf(format, val);
});

Handlebars.registerHelper('isPrimaryOrStandalone', function(hostData) {
	console.log(hostData);
	if ("replicaSet" in hostData && hostData.replicaSet.stateStr === "PRIMARY") {
		return true;
	}
	return false;
});
