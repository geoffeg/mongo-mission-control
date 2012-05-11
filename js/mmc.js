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

var workers = [];
var activeHosts = {};
var numHosts = 0;

var contracts=[];
var hides=[];
var newEdits=true;

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
	var firstWidthPerc = Math.floor(120/(numHosts+1.2));
	var restWidthPerc = Math.floor(100/(numHosts+1));
	$('#spanStyle').html('div>div>span:first-child { width: '+firstWidthPerc+'%; } div>div>span:not(:first-child) { width: '+restWidthPerc+'%; }');
	
	
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
	
	workers[workers.length] = worker;
}

function addRow(parentId, key, level) {
	// There is a new key in a returned set - add a new row
	ensureLevel(level);// Ensure that there is a class definition for the level.
	var title=splitCamelCase(key);// First letter to upper case
	var id=parentId+'_'+key;
	var inside='<span><span class="level_'+level+'">'+title+'<a href="javascript:void(0);" onclick="hideRow(\''+id+'\');"><img src="images/deleteButton.png" /></a></span></span>';
	var i=numHosts;
	while (i--) {
		// Add the correct number of columns
		inside+='<span></span>';
	}
	var row='<div id="'+id.slice(1)+'" class="isnotparent">'+inside+'</div>';
	var parentRef=$(parentId);
	var children=parentRef.children();
	if (parentRef.hasClass('isparent')) {
		// Parent row already has child rows
		if (data['sort'][parentId]) {i=data['sort'][parentId].indexOf(id);}
		else {i=-1;}
		if (i==-1) {
			children.slice(2,3).append(row);
		} else {
			var el;
			while (i-->0 && (el=$(data['sort'][parentId][i])).length==0);
			if (i<0) {
				children.slice(2,3).prepend(row);
			} else {
				el.after(row);
			}
		}
	} else {
		// Not a parent yet - make it a parent and add row
		var spanTag=children.slice(0,1).children()[0];
		parentRef.html('<span><a href="javascript:void(0);" onclick="contractExpand(\''+parentId+'\');" class="'+spanTag.getAttribute('class')+'"><!--<img src="images/arrowDown.png" />-->'+spanTag.innerHTML+'</a></span><div>&nbsp;</div><div>'+row+'</div>');
		parentRef.attr('class','isparent');
		parentRef.children().slice(2,3).sortable({distance: 10});
	}
	$(id).hover(function (e) {$(this).addClass('rowHover').parent().parent().removeClass('rowHover');}, function (e) {var parent=$(this).removeClass('rowHover').parent().parent();if (parent.attr('id') && parent.attr('id')!='stats'){parent.addClass('rowHover');}});
}

function ensureLevel(level) {
	// Makes sure a style for this level is set.
	if (!$('#levelStyle_'+level).length) {
		// Add level style
		$('HEAD').append('<style id="levelStyle_'+level+'">span.level_'+level+',a.level_'+level+' { padding-left: '+(25*level)+'px; width: 100%; }</style>');
	}
}

function splitCamelCase(s) {
	return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3').replace(/^./, function(str){ return str.toUpperCase(); })
}

function contractExpand(id) {
	// Contract a level div
	$(id).children().slice(2,3).toggle('blind');
	var i=0;
	var c=contracts.length;
	while (i<c) {
		if (contracts[i]==id) {
			contracts.splice(i,1);
			return;
		}
		i++;
	}
	contracts[contracts.length]=id;
}

function hideRow(id) {
	// Hide entire row
	$(id).hide('blind');
	hides[hides.length]=id;
}

function restoreHidden() {
	hides=[];
	location.reload(true);
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
		if (newEdits) {applyEdits();newEdits=false;}
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
			// Object
			updateRowGroup(colId, id, data[de], level);
		} else {
			// Value
			row.children()[colId].innerHTML=data[de];
		}
	}
}

function addCol(row) {
	if (row.hasClass('isparent')) {
		// Is a parent
		var elements=row.children().slice(2,3).children();
		var i=0;
		var c=elements.length;
		while (i<c) {
			addCol(elements.slice(i,++i));
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
		var el=parents.slice(i,++i).children().slice(2,3);
		if (el.is(":hidden")) {el.show('blind');}
	}
	// Remove all contractions and expansions
	contracts=[];
}

function collapseAll() {
	// Collapse all rows
	contracts=[];
	var parents=$('#stats').find('.isparent');
	var i=0;
	var j=0;
	var c=parents.length;
	while (i<c) {
		var el=parents.slice(i,++i);
		contracts[j++]='#'+el.attr('id');
		el=el.children().slice(2,3);
		if (el.is(":visible")) {el.hide('blind');}
	}
}

function saveData() {
	// Page is closing - save data for next time
	// Serialize row sorting
	var sort={};
	var parents=$('BODY').find('.isparent');
	var i=0;
	var c=parents.length;
	var parent,parentId,children,j,d;
	while (i<c) {
		parent=parents.slice(i,++i);
		parentId='#'+parent.attr('id');
		sort[parentId]=[];
		children=parent.children().slice(2,3).children();
		j=0;
		d=children.length;
		while (j<d) {
			sort[parentId][j]='#'+children.slice(j,++j).attr('id');
		}
	}
	var url = "command-proxy.php?command=d&data="+encodeURIComponent(JSON.stringify({'hostGroups':data['hostGroups'], 'contracts':contracts, 'hides': hides, 'sort': sort}));
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	http.send(null);
}

function getRowSort(ref,sort) {
	sort[id]=[];
	var j=0;
	console.log(ref);
	var divs=ref.children().splice(2,3).children();
	var i=0;
	var c=divs.length;
	var div,id;
	while (i<c) {
		div=divs.splice(i++,i);
		id=div.attr('id');
		sort[id][j++]=id;
		if (div.hasClass('isparent')) {getRowSort(div,sort);}
		i++;
	}
}

function applyEdits() {
	// Apply edits from saveData.js
	// Apply contracts
	var i=0;
	var c=data['contracts'].length;
	while (i<c) {
		contractExpand(data['contracts'][i]);
		i++;
	}
	// Apply hides
	i=0;
	c=data['hides'].length;
	while (i<c) {
		hideRow(data['hides'][i]);
		i++;
	}
}

function createHostGroupsMenu() {
	var ref=$('#hostGroups');
	var i=0;
	var c=data['hostGroups'].length;
	var group;
	while (i<c) {
		group=data['hostGroups'][i];
		ref.append('<br /><br /><a href="index.html?host='+group+'">'+group+'</a>');
		i++;
	}
}

function createHostGroup() {
	var name=prompt('Enter one host group server:','localhost');
	if (name) {
  		data['hostGroups'][data['hostGroups'].length]=name;
		$('#hostGroups').append('<br /><br /><a href="index.html?host='+name+'">'+name+'</a>');
		alert('The host group has been created. Please select it from the Host Groups menu to view it.');
  	}
}

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
	var regexS = "[\\?&]" + name + "=([^&#]*)";
	var regex = new RegExp(regexS);
	var results = regex.exec(window.location.search);
	if(results == null) {
		return "";
	} else {
		return decodeURIComponent(results[1].replace(/\+/g, " "));
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