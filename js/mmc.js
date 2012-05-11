/*
Sample HTML:

<div id="[level 0 item]" class="isparent">
	<span>
		<a class="level_0">Parent Row Header</a>
		<a><img src="images/deleteButton.png" /></a>
	</span>
	<br />
	<div>
		<div id="[level 1 item]" class="isnotparent">
			<span>
				<span class="level_1">
					Row Header
					<a><img src="images/deleteButton.png" /></a>
				</span>
			</span>
			<span>Host 1 Value</span>
			<span>Host 2 Value</span>
			<span>...</span>
		</div>
	</div>
</div>

*/

var activeHosts = {};
var numHosts = 0;

function addReplicaSet(config) {
	getReplicaSetStatus(config['host'], addServer);

}


function addServer(config) {
	if (activeHosts[config.host]) {
		// Only add new hosts.
		return;
	}
	console.log("Added server: "+config.host);
	
	numHosts++;
	addCol($('#stats'));
	var widthPerc = Math.floor(100/(numHosts+1));
	$('#spanStyle').html('div div span { width: '+widthPerc+'%; }');
	
	
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
		},
		addServer: function(config) {
			addServer(config);
		},
		setSlowServer: function(arg) {
			setClock(arg[0],arg[1]);
		}
	};

	var worker = new Worker("js/worker.js");
	// worker.postMessage({action: "setHostName", args: ["hostName"]})

	worker.onmessage = function(event) {
		var data        = JSON.parse(event.data), // parse the data
				action      = data.action,            // get the action
				arg = data.returnValue;       // get the returnValue, which is one argument

		// if we understand the action
		if (action in actions) {
			// Run action with one argument
			actions[action].call(this,arg);
		} else {
			// Invalid action
			console.log("Invalid action: "+action);
		}
	};

	config.id=numHosts;
	
	worker.postMessage(JSON.stringify({
		action: 'config',
		args: [config]
	}));
	
	worker.postMessage(JSON.stringify({
		action: 'serverStatus',
		args: []
	}));
	return worker;
}

function addRow(parentId, key, level) {
	// Add a new row
	ensureLevel(level);
	var title=key.charAt(0).toUpperCase() + key.slice(1);// First letter to upper case
	var id=parentId.slice(1)+'_'+key;
	var inside='<span><span class="level_'+level+'">'+title+'<a href="javascript:void(0);" onclick="hideRow(\'#'+id+'\');"><img src="images/deleteButton.png" /></a></span></span>';
	var i=numHosts;
	while (i--) {
		// Add the correct number of columns
		inside+='<span></span>';
	}
	var row='<div id="'+id+'" class="isnotparent">'+inside+'</div>';
	var parentRef=$(parentId);
	var children=parentRef.children();
	if (parentRef.attr('class')=='isparent') {
		// Parent row already has child rows
		children.slice(2,3).append(row);
	} else {
		// Not a parent yet
		var spanTag=children.slice(0,1).children()[0];
		parentRef.html('<span><a href="javascript:void(0);" onclick="contractExpand(\''+parentId+'\');" class="'+spanTag.getAttribute('class')+'"><!--<img src="images/arrowDown.png" />-->'+spanTag.innerHTML+'</a></span><div>&nbsp;</div><div>'+row+'</div>');
		parentRef.attr('class','isparent');
		parentRef.children().slice(2,3).sortable();
	}
	$('#'+id).hover(function (e) {$(this).addClass('rowHover').parent().parent().removeClass('rowHover');}, function (e) {var parent=$(this).removeClass('rowHover').parent().parent();if (parent.attr('id')!='stats'){parent.addClass('rowHover');}});
}

function ensureLevel(level) {
	// Makes sure a style for this level is set.
	if (!$('#levelStyle_'+level).length) {
		// Add level style
		$('HEAD').append('<style id="levelStyle_'+level+'">span.level_'+level+',a.level_'+level+' { padding-left: '+(25*level)+'px; width: 100%; }</style>');
	}
}

function contractExpand(id) {
	// Contract a level div
	$(id).children().slice(2,3).toggle('blind');
}

function hideRow(id) {
	// Hide entire row
	$(id).hide('blind');
}

function getUrlParam(param,s) { 
	s = s ? s : window.location.search; 
	var re = new RegExp('&'+param+'(?:=([^&]*))?(?=&|$)','i'); 
	return (s=s.replace(/^\?/,'&').match(re)) ? (typeof s[1] == 'undefined' ? '' : decodeURIComponent(s[1])) : undefined; 
} 

function getReplicaSetStatus(hostName, callback) {
	return;
	$.ajax({
		url: "command-proxy.php?host=" + hostName + "&command=replSetGetStatus", 
  	timeout: 5000,
	  success: function(data) {
			$.each(data['members'], function(index, val) {
				var config = {host: val['name']};
				callback(config);
			});
	}});
}

var previousData = {};

function addHost(hostData) {
/*
	var all_values = {"previousValues" : hostData, "currentValues" : hostData};
	if (hostData['replicaSet'] && hostData['replicaSet']['stateStr'] == "PRIMARY") {
		$("#hostHeaderTemplate").tmpl(all_values).insertAfter("#updatetime");
		$("#statusTemplate").tmpl(all_values).insertAfter("#mongo-stats-column-labels");
	} else {
		var template = Handlebars.compile($("#hostHeaderTemplate").html());
		$("#mongo-stats-header").append(template(all_values));
		template = Handlebars.compile($("#statusTemplate").html());
		$("#mongo-status-table").append(template(all_values));
	}
	calculateColumnWidths();
	*/
	previousData[hostData.host] = hostData;
}


function updateHost(hostData) {
	if (hostData.host in previousData) {
		updateRowGroup(hostData.id, "#stats", hostData, -1);
		/*
		var all_values = {"previousValues" : previousData[hostData.host], "currentValues" : hostData};
		var template = Handlebars.compile($("#statusTemplate").html());
		$("#host-column-" + getCssHostName(hostData.host)).replaceWith(template(all_values));
		previousData[hostData.host] = hostData;
		calculateColumnWidths();
		*/
	} else {
		addHost(hostData);
	}
}

function updateRowGroup(colId, rowId, data, level) {
	// Recursive function to insert data into correct rows.
	
	level++;
	var id,row;
	var de;// Data element
	for (de in data) {
		// Loop through each element of data
		id=rowId+'_'+de;
		row=$(id);
		if (row.length==0) {
			// Row doesn't exist - add it
			addRow(rowId, de, level);
			row=$(id);
		}
		if (data[de] instanceof Object) {
			// Array
			updateRowGroup(colId, id, data[de], level);
		} else {
			// Value
			row.children()[colId].innerHTML=data[de];
		}
	}
}

function addCol(row) {
	if (row.attr('class')=='isparent') {
		// Is a parent
		var elements=row.children().slice(2,3).children();
		var i=0;
		var c=elements.length;
		while (i<c) {
			addCol(elements[i]);
			i++;
		}
	} else {
		// Is not a parent
		row.append('<span></span>');
	}
}

function expandAll() {
	// Expand all rows
	var parents=$('#stats').find('.isparent');
	var i=0;
	var c=parents.length;
	while (i<c) {
		parents.slice(i,++i).children().slice(2,3).show('blind');
	}
}

function collapseAll() {
	// Collapse all rows
	var parents=$('#stats').find('.isparent');
	var i=0;
	var c=parents.length;
	while (i<c) {
		parents.slice(i,++i).children().slice(2,3).hide('blind');
	}
}

function setClock(hostName, on) {
	// Set the clock icon on or off
	if (on) {
		$("#clock_icon_"+getCssHostName(hostName)).html('<img src="images/icon_clock.gif" class="slow-server"/>');
	} else {
		//$("#clock_icon_"+getCssHostName(hostName)).html('');
	}
}

function calculateColumnWidths() {
/*
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
	*/
}


function getDiffVals(currentValue, previousValue, lastUpdate) {
	var secondsSinceLastRequest = parseInt((new Date().getTime() - lastUpdate) / 1000)
		return parseInt((currentValue - previousValue) / secondsSinceLastRequest);
}

function getCssHostName(hostName) {
	return hostName.replace(/\./ig, "-").replace(/:/,'');
}

/*
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
*/