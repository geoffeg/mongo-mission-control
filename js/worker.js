// var hostName = false;
var config;
var actions = {
	sum: function(a, b) {
		log('Summing: ' + a + ' + ' + b);
		return a + b;
	},
	config: function(cfg) {
		config = cfg;
	},
	serverStatus: function() {
		getStatus();
		setInterval(getStatus, 1000);
	}
}

onmessage = function(event) {
	var data   = JSON.parse(event.data), // parse the data
	    action = data.action,            // get the requested action
	    args   = data.args,              // get the arguments for the action
	    result = { action: action };     // prepare the result

	if (action in actions) {
		result.returnValue = actions[action].apply(this, args);
	} else {
		result.returnValue = undefined;
	}
	//postMessage(JSON.stringify(result));
}

function getStatus() {
	getServerStatus(config['host']);
	if (config['replicaSet'] == true) {
		getReplicaStatus(config['host']);
	}
}

var hostData = {};
function collectStatus(type, data) {
	if (type == "serverStatus") {
		hostData['serverStatus'] = data;
		hostData['host'] = data.host;
		hostData['lastUpdate'] = new Date().getTime();
	} else {
		hostData['replicaSet'] = data;
	}

	if ("serverStatus" in hostData && config['replicaSet'] === false) {
		var result = { action: "serverStatus", "returnValue" : hostData };
		postMessage(JSON.stringify(result));
	} else if ("serverStatus" in hostData && config['replicaSet'] === true && "replicaSet" in hostData) {
		if (hostData.replicaSet.stateStr == "SECONDARY") {
			hostData.serverStatus.opcounters = hostData.serverStatus.opcountersRepl;
		}
		var result = { action: "serverStatus", "returnValue" : hostData };
		postMessage(JSON.stringify(result));
	}
}

function getReplicaStatus(host) {
	var serverStatusUrl = "../command-proxy.php?host=" + host + "&command=replSetGetStatus";
	getJSON(serverStatusUrl, function(data) {
		collectStatus('replicaStatus', data);
	});
}

function getServerStatus(host) {
	var serverStatusUrl = "../command-proxy.php?host=" + host + "&command=serverStatus";
	getJSON(serverStatusUrl, function(data) {
		collectStatus('serverStatus', data);
	});
}

function log(msg) {
	postMessage(JSON.stringify({
		action: 'log',
		returnValue: msg
	}));
}

function getJSON(url, callback) {
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	http.onreadystatechange = function() {
		if (http.readyState == 4) {
			if (http.status == 200)  {
				var result = "";
				if (http.responseText) result = eval('(' + http.responseText + ')');
				callback(result);
			}
		}
	}
	http.send(null);
}
