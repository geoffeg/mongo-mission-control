var slowSpeed=500;
var refreshTime=1000;

// var hostName = false;
var config = {hostname: '?'};
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
		setInterval(getStatus, refreshTime);
	}
};

var reqTimer=-1;

onmessage = function(event) {
	var data   = JSON.parse(event.data), // parse the data
	    action = data.action,            // get the requested action
	    args   = data.args,              // get the arguments for the action
	    result = { action: action };     // prepare the result

	if (action in actions) {
		// Run action with multiple arguments as an array
		result.returnValue = actions[action].apply(this, args);
	} else {
		// Invalid action
		console.log("Invalid Action: "+action);
		result.returnValue = undefined;
	}
}

function getStatus() {
	reqTimer=setTimeout(slowServer,slowSpeed);
	getServerStatus(config['host']);
	if (config['replicaSet']) {
		getReplicaStatus(config['host']);
	}
}

var prevData = {};
function collectStatus(type, data) {
	if (type == "serverStatus") {
		// Server status
		data['id'] = config.id;
		data['LastUpdate'] = new Date().toLocaleString();
		processData(data);
		var newConfig, result, server;
		for (server in data.repl.hosts) {
			newConfig = {host: data.repl.hosts[server], replicaSet: false};
			result = { action: "addServer", "returnValue": newConfig };
			postMessage(JSON.stringify(result));
		}
	} else {
		// Replica set status
		//hostData['replicaSet'] = data;
	}
	
	if ("serverStatus" in data && config['replicaSet'] === true && "replicaSet" in data && data.replicaSet.stateStr == "SECONDARY") {
		// Secondary
		data.opcounters = data.opcountersRepl;
	}
	var result = { action: "serverStatus", "returnValue" : data };
	postMessage(JSON.stringify(result));
}

function getReplicaStatus(host) {
	// This function gets the secondary servers of hosts that have replicaSet true
	var serverStatusUrl = "../command-proxy.php?host=" + host + "&command=replSetGetStatus";
	getJSON(serverStatusUrl, function(data) {
		collectStatus('replicaStatus', data);
	});
}

function getServerStatus(host) {
	// This is called on hosts that have replicaSet false
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
	// Executes an asynchronous ajax request.
	// When finished, parses result text to JSON, and calls callback with the JSON as the single argument.
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	http.onreadystatechange = function() {
		if (http.readyState == 4) {
			if (http.status == 200)  {
				if (http.responseText) {
					var result = eval('(' + http.responseText + ')');
					if (reqTimer!=-1) {
						// Server is fast
						clearTimeout(reqTimer);
						reqTimer=-1;
						postMessage(JSON.stringify({
							action: 'setSlowServer',
							returnValue: [result.host, false]
						}));
					}
					callback(result);
				}
			}
		}
	}
	http.send(null);
}

function slowServer() {
	// Server is slow
	if (reqTimer!=-1) {
		reqTimer=-1;
		if (prevData.host) {
			postMessage(JSON.stringify({
				action: 'setSlowServer',
				returnValue: [prevData.host, true]
			}));
		}
	}
}

function processData(data) {
	// Creates difference and ratio items
	var stateStrings=['Starting up, phase 1', 'Primary', 'Secondary', 'Recovering', 'Fatal error', 'Starting up, phase 2', 'Unknown state', 'Arbiter', 'Down', 'Rollback', 'Removed'];
	data['StateString']=stateStrings[data['MyState']];
}