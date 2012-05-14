/*
Sample HTML of a row

<div id="[level 0 item]" class="isparent"><!-- Parent Row -->
	<span>
		<a class="level_0">Parent Row Header</a>
		<a><img src="images/deleteButton.png" /></a>
	</span>
	<br />
	<div>
		<div id="[level 1 item]" class="isnotparent"><!-- Child Row -->
			<span>
				<span class="level_1">
					Row Header
					<a><img src="images/deleteButton.png" /></a>
				</span>
			</span>
			<span>Host 1 Value</span><!-- Column 1 -->
			<span>Host 2 Value</span><!-- Column 2 -->
			<span>...</span>
		</div>
	</div>
</div>

*/

var workers = [];// Array of workers. There is one worker for each host.
var activeHosts = {};// One key for each host.
var numHosts = 0;// Number of hosts

var contracts=[];// Array of row contractions.
var hides=[];// Array of row hides
var restoreSort=false;// Wether to restore original sort (true) or store current row sort to saveData.js (false) in saveData().

var refreshSpeed=getParameterByName('refresh');
if (!refreshSpeed){refreshSpeed=1;}

function addServer(config) {
	if (activeHosts[config.host]) {
		// Only add new hosts.
		return;
	}
	activeHosts[config.host] = true;
	
	console.log("Added server: "+config.host);
	
	// Calculate correct column widths
	numHosts++;
	addCol($('#stats'));
	var firstWidthPerc = Math.floor(110/(numHosts+1.1));
	var restWidthPerc = Math.floor(100/(numHosts+1))-2;
	$('#spanStyle').html('div>div>span:first-child { width: '+firstWidthPerc+'%; } div>div>span:not(:first-child) { width: '+restWidthPerc+'%; margin-right: 2%; }');
	
	var actions = {
		log: function(message) {
			console.log(message);
		},
		serverStatus: function(hostData) {
			updateRowGroup(hostData.id, "#stats", hostData, -1);
		},
		addServer: function(config) {
			addServer(config);
		}
	};

	// Create new worker
	var worker = new Worker("js/worker.js");

	worker.onmessage = function(event) {
		// Called when we receive a message from our worker.
		var data = JSON.parse(event.data);
		var action = data.action;// Action to call
		var arg = data.returnValue;// Arguments

		// If the action is defined
		if (action in actions) {
			// Run action with one argument
			actions[action].call(this,arg);
		} else {
			// Invalid action
			console.log('Invalid action: '+action);
		}
	};

	config.id=numHosts;
	config.speed=refreshSpeed*1000;// Refresh speed
	
	// Start our worker
	worker.postMessage(JSON.stringify({
		action: 'start',
		args: [config]
	}));
	
	workers[workers.length] = worker;
}

function addRow(parentId, key, level) {
	// There is a new key in a returned set - add a new row
	ensureLevel(level);// Ensure that there is a class definition for the level.
	var title=splitCamelCase(key);// Make title
	var id=parentId+'_'+key;// Id of row
	var inside='<span><span class="level_'+level+'">'+title+'<a href="javascript:void(0);" onclick="hideRow(\''+id+'\');"><img src="images/deleteButton.png" /></a></span></span>';
	var i=numHosts;
	while (i--) {
		// Add the correct number of columns
		inside+='<span>&nbsp;</span>';
	}
	var row='<div id="'+id.slice(1)+'" class="isnotparent">'+inside+'</div>';
	var parentRef=$(parentId);
	if (parentRef.hasClass('isparent')) {
		// Parent row already has child rows
		
		var children=parentRef.children().slice(2,3);
		if (data['sort'][parentId]) {i=data['sort'][parentId].indexOf(id);}
		else {i=-1;}
		if (i==-1) {
			children.append(row);
		} else {
			var el;
			while (i-->0 && (el=$(data['sort'][parentId][i])).length==0);
			if (i<0) {
				children.prepend(row);
			} else {
				el.after(row);
			}
		}
	} else {
		// Parent row is not a parent yet - make it a parent and add row
		
		var children=parentRef.children();
		var spanTag=children.slice(0,1).children()[0];
		parentRef.html('<span><a href="javascript:void(0);" onclick="contractExpand(\''+parentId+'\');" class="'+spanTag.getAttribute('class')+'"><!--<img src="images/arrowDown.png" />-->'+spanTag.innerHTML+'</a></span><div>&nbsp;</div><div>'+row+'</div>');
		parentRef.attr('class','isparent');
		children=parentRef.children().slice(2,3);
		children.sortable({'distance': 10, 'axis': 'y'});// Make the parent sortable.
		if (contracts.indexOf(parentId)!=-1){children.hide();}// If the parent should be contracted, contract it.
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
	// Some crazy regex to split camel case and underscore separated words with a space and capitalize words.
	return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3').replace(/(_+)(\w)/g,function($1,$2,$3){return ' '+$3.toUpperCase();}).replace(/^./, function(str){ return str.toUpperCase(); });
}

function contractExpand(id) {
	// Contract or expand a level div (hide child rows).
	$(id).children().slice(2,3).toggle('blind');
	
	// If there is a contract already in the contracts array, remove it.
	var i=0;
	var c=contracts.length;
	while (i<c) {
		if (contracts[i]==id) {
			contracts.splice(i,1);
			return;
		}
		i++;
	}
	// Otherwise, add it.
	contracts[contracts.length]=id;
}

function hideRow(id) {
	// Hide entire row
	$(id).hide('blind',function(){$(this).remove();});
	hides[hides.length]=id;
}

function restoreHidden() {
	// Restore all hidden rows. Called from menu.
	hides=[];
	location.reload(true);
}
function restoreSorting() {
	// Restore original sorting. Called from menu.
	restoreSort=true;
	location.reload(true);
}
function changeRefreshSpeed() {
	// Change refresh speed. Called from menu.
	var speed=prompt('Enter new refresh speed in seconds:','5');
	if (speed) {
  		var loc=window.location.pathname;
  		var host=getParameterByName('host');
  		if (host) {loc+='?host='+host+'&refresh='+speed;}
  		else {loc+='?refresh='+speed;}
  		window.location=loc;
  		
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
		if (hides.indexOf(id)!=-1){continue;}
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
			row.children()[colId].innerHTML=(data[de]==='' ? '&nbsp;' : data[de]);
		}
	}
}

function addCol(row) {
	// Recursive function to add a new column.
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
		row.append('<span></span>');// Add column
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
	// Remove all contractions
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
	if (!restoreSort) {
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
	}
	
	// Send ajax request that will save data to saveData.js
	var url = "command-proxy.php?command=d&data="+encodeURIComponent(JSON.stringify({'hostGroups':data['hostGroups'], 'contracts':contracts, 'hides': hides, 'sort': sort}));
	var http = new XMLHttpRequest();
	http.open("GET", url, false);
	http.send(null);
}

function createHostGroupsMenu() {
	// Add items to host groups dropdown menu
	var ref=$('#hostGroups');
	var i=0;
	var c=data['hostGroups'].length;
	var group;
	while (i<c) {
		group=data['hostGroups'][i];
		ref.append('<br /><br /><a href="index.html?host='+group+'&refresh='+refreshSpeed+'">'+group+'</a>');
		i++;
	}
}

function createHostGroup() {
	// Add a host group
	var name=prompt('Enter one host group server:','localhost');
	if (name) {
  		data['hostGroups'][data['hostGroups'].length]=name;
  		window.location='index.html?host='+name+'&refresh='+refreshSpeed;
  	}
}

function getParameterByName(name) {
	// Get query from the url
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