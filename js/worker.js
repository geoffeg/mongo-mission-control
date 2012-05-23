var slowSpeed=500;

// var hostName = false;
var config = {hostname: '?'};
var actions = {
	sum: function(a, b) {
		log('Summing: ' + a + ' + ' + b);
		return a + b;
	},
	start: function(cfg) {
		config = cfg;
		getStatus();
		setInterval(getStatus, cfg.speed);
	}
};

var reqTimer=-1;
var reqTime=0;

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
	reqTimer=setTimeout('slowServer();',slowSpeed);
	reqTime=new Date().getTime();
	getServerStatus(config['host']);
}

function getServerStatus(host) {
	// This is called on hosts that have replicaSet false
	var serverStatusUrl = "../command-proxy.php?host=" + host + "&command=s";
	getJSON(serverStatusUrl, function(data) {
		collectStatus(data);
	});
}

function getJSON(url, callback) {
	// Executes an asynchronous ajax request.
	// When finished, parses result text to JSON, and calls callback with the JSON as the single argument.
	var http = new XMLHttpRequest();
	http.open("GET", url, true);
	http.onreadystatechange = function() {
		if (http.readyState == 4) {
			if (http.status == 200)  {
				if (http.responseText) {
					var result = eval('(' + http.responseText + ')');
					if (reqTimer!=-1) {
						// Server is fast
						clearTimeout(reqTimer);
						reqTimer=-1;
						result.requestTime=(new Date().getTime()-reqTime)+'ms';
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
			var result = { action: 'serverStatus', 'returnValue' : {'host': prevData.host, 'id': config.id, 'requestTime': '<img src="images/slowServer.png" width="16" /> &gt;'+slowSpeed+'ms'} };
			postMessage(JSON.stringify(result));
		}
	}
}

var prevData = {};
function collectStatus(data) {

	data['id'] = config.id;
	data['lastUpdateString'] = new Date().toLocaleString();
	data['lastUpdate'] = new Date().getTime();
	var dataClone=clone(data);
	processData(data);
	var newConfig, result, server;
	if (data.repl && data.repl.hosts) {
		for (server in data.repl.hosts) {
			result = { action: "addServer", "returnValue": data.repl.hosts[server] };
			postMessage(JSON.stringify(result));
		}
	}
		
	var result = { action: "serverStatus", "returnValue" : data };
	postMessage(JSON.stringify(result));
	
	prevData=dataClone;
}

function processData(data) {
	var stateStrings=['Starting up, phase 1', 'Primary', 'Secondary', 'Recovering', 'Fatal error', 'Starting up, phase 2', 'Unknown state', 'Arbiter', 'Down', 'Rollback', 'Removed'];
	if (data['MyState']) {
		data['stateString']=stateStrings[data['MyState']];
	}
	
	if (data['globalLock'] && data['globalLock']['ratio']) {
		data['globalLock']['ratio']=(Math.round(data['globalLock']['ratio']*1e4)/1e2).toString()+'%';
	}
	
	if (data['indexCounters'] && data['indexCounters']['btree'] && data['indexCounters']['btree']['missRatio']) {
		data['indexCounters']['btree']['missRatio']=(Math.round(data['indexCounters']['btree']['missRatio']*1e4)/1e2).toString()+'%';
	}
	
	if (prevData['lastUpdate']) {
		// If prevData is set, lastUpdate should be set
		var timeDiff=(data['lastUpdate']-prevData['lastUpdate'])/1000;
	}
	
	var val,op,i,c;
	if (data['opcounters']) {
		for (op in data['opcounters']) {
			if (prevData['opcounters'] && prevData['opcounters'][op]) {
				data['opcounters'][op+'sPerSec']=Math.round((data['opcounters'][op]-prevData['opcounters'][op])/timeDiff*1e2)/1e2;
			}
			data['opcounters'][op]=prettyNum(data['opcounters'][op]);
		}
	}
	if (data['opcountersRepl']) {
		for (op in data['opcountersRepl']) {
			if (prevData['opcountersRepl'] && prevData['opcountersRepl'][op]) {
				data['opcountersRepl'][op+'sPerSec']=Math.round((data['opcountersRepl'][op]-prevData['opcountersRepl'][op])/timeDiff*1e2)/1e2;
			}
			data['opcountersRepl'][op]=prettyNum(data['opcountersRepl'][op]);
		}
	}
		
	if (data['globalLock'] && data['globalLock']['lockTime'] && data['globalLock']['totalTime'] && prevData['globalLock'] && prevData['globalLock']['lockTime'] && prevData['globalLock']['totalTime']) {
		data['globalLock']['currentRatio']=(Math.round((data['globalLock']['lockTime']-prevData['globalLock']['lockTime'])/(data['globalLock']['totalTime']-prevData['globalLock']['totalTime'])*1e4)/1e2).toString()+'%';
	}
		
	if (data['network']) {
		var val;
		if (val=data['network']['bytesIn']) {
			if (prevData['network'] && prevData['network']['bytesIn']) {
				data['network']['dataIn']=prettyBytesRate((val-prevData['network']['bytesIn'])/timeDiff);
			}
			data['network']['bytesIn']=prettyBytes(val);
		}
		if (val=data['network']['bytesOut']) {
			if (prevData['network'] && prevData['network']['bytesOut']) {
				data['network']['dataOut']=prettyBytesRate((val-prevData['network']['bytesOut'])/timeDiff);
			}
			data['network']['bytesOut']=prettyBytes(val);
		}
		
		if (data['network']['numRequests']) {
			if (prevData['network'] && prevData['network']['numRequests']) {
				data['network']['numReqsPerSec']=(Math.round((data['network']['numRequests']-prevData['network']['numRequests'])/timeDiff*1e2)/1e2).toString()+'/sec';
			}
			data['network']['numRequests']=prettyNum(data['network']['numRequests']);
		}
	}
	
	if (data['MyState']) {
		if (data['MyState']==1 && data['opcounters']) {
			// Primary
			data['relevantOpcounters']=data['opcounters'];
		} else if (data['MyState']==2 && data['opcountersRepl']) {
			// Secondary
			data['relevantOpcounters']=data['opcountersRepl'];
		}
	}
}
function toScientific(data) {
	var val;
	var de;// Data element
	for (de in data) {
		// Loop through each element of data
		val=data[de];
		if (val instanceof Object) {
			// Object
			toScientific(val);
		} else if (val.toExponential && val && (val>=1e6 || val<=1e-3)) {
			// Large or small value
			data[de]=val.toExponential(2);
		}
	}
}

function prettyBytes(val) {
	return prettyVal(val, [' B',' kB',' MB',' GB',' TB']);
}
function prettyBytesRate(val) {
	return prettyVal(val, [' B/sec',' kB/sec',' MB/sec',' GB/sec',' TB/sec']);
}
function prettyNum(val) {
	return prettyVal(val, ['',' thousand',' million',' billion',' trillion']);
}
function prettyVal(val, suffixes) {
	var i=0;
	var c=suffixes.length-1;
	while (val>1e3 && i<c){val/=1e3;i++;}
	return (Math.round(val*1e2)/1e2).toString()+suffixes[i];
}

function clone(obj) {
	var c = {};
	for(var i in obj) {
		if(obj[i] instanceof Object) {
			c[i] = clone(obj[i]);
		} else {
			c[i] = obj[i];
		}
	}
	return c;
}

function isEmpty(ob) {
	for(var i in ob){ return false; }
  	return true;
}

function log(msg) {
	postMessage(JSON.stringify({
		action: 'log',
		returnValue: msg
	}));
}