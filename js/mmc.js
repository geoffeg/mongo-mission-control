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

if (data==undefined){var data={};}

function Mmc(data) {
	
	this.workers = [];// Array of workers. There is one worker for each host.
	this.activeHosts = {};// One key for each host.
	
	this.restoreSort=false;// Whether to restore original sort (true) or store current row sort to saveData.js (false) in saveData().
	
	// Set default data
	if (data['hostGroups']==undefined){data['hostGroups']=[];}
	if (data['collapses']==undefined){data['collapses']=[];}
	if (data['hides']==undefined){data['hides']=[];}
	if (data['sort']==undefined){data['sort']={};}
	if (data['expandRows']==undefined){data['expandRows']=false;}
	if (data['centerColumns']==undefined){data['centerColumns']=false;}
	
	this.data=data;
	
	var _self=this;
	
	this.addServer=function(name) {
		if (this.activeHosts[name]) {
			// Only add new hosts.
			return false;
		}
		this.activeHosts[name] = true;
		
		console.log("Added server: "+name);
		
		// Highlight shard in Host Groups dropdown menu
		this.hostGroupsManager.highlightHost(name);
		
		var actions = {
			log: function(message) {
				console.log(message);
			},
			serverStatus: function(hostData) {
				this.mmc.tableManager.update(hostData.id, "#stats", hostData, -1);
			},
			addServer: function(name) {
				if (this.mmc.addServer(name)) {
					this.mmc.setUrl();
				}
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
		
		worker.mmc=this;
	
		var config={'host': name};
		config.id=this.tableManager.addCol();
		config.speed=refreshSpeed*1000;// Refresh speed
		
		// Start our worker
		worker.postMessage(JSON.stringify({
			action: 'start',
			args: [config]
		}));
		
		this.workers[this.workers.length] = worker;
		
		return true;
	}
	
	this.setUrl=function() {
		// Usually called right after addServer or a removal of servers.
		var hosts='';
		var host;
		for (host in this.activeHosts) {
			hosts+=','+host;
		}
		history.pushState({}, 'Mongo Mission Control', 'index.html?hosts='+hosts.slice(1)+'&refresh='+refreshSpeed);
	}
	
	this.restoreSorting=function() {
		// Restore original sorting. Called from menu.
		this.tableManager.sorting={};
		this.tableManager.reset();
	}
	this.changeRefreshSpeed=function() {
		// Change refresh speed. Called from menu.
		var speed=prompt('Enter new refresh speed in seconds:','5');
		if (speed) {
			refreshSpeed=speed;
			this.setUrl();
			location.reload(true);
		}
	}
	this.setExpandRows=function() {
		// Set whether to expand rows all the time or just on hover
		if (this.checked) {
			// All the time
			$('#rowExpandStyle').html('div.isnotparent>span {height:inherit; white-space:normal;}');
		} else {
			// Just on hover
			$('#rowExpandStyle').html('div.isnotparent>span {height:18px; white-space:nowrap;}');
		}
		_self.data['expandRows']=this.checked;
	}
	this.setCenterColumns=function() {
		// Set whether to center column contents
		if (this.checked) {
			// Center
			$('#centerColumnsStyle').html('div.isnotparent>span:not(:first-child) {text-align: center;}');
		} else {
			// Don't center
			$('#centerColumnsStyle').html('');
		}
		_self.data['centerColumns']=this.checked;
	}
	
	this.saveData=function() {
		// Page is closing - save data for next time
		// Send ajax request that will save data to saveData.js
		var url = "command-proxy.php?command=d&data="+encodeURIComponent(JSON.stringify({'hostGroups':data['hostGroups'], 'collapses': _self.tableManager.collapses, 'hides': _self.tableManager.hides, 'sort': _self.tableManager.saveSort(), 'expandRows': _self.data['expandRows'], 'centerColumns': _self.data['centerColumns']}));
		var http = new XMLHttpRequest();
		http.open("GET", url, false);
		http.send(null);
	}
	
	this.applyTooltips=function() {
		$('[title]').tooltip({ 
			track: true,
			delay: 500,
			showURL: false,
			showBody: "\n",
			fade: 0
		});
	}
	
	// Simple routing functions
	this.addTemporaryHost=function() { this.temporaryHostAdder.open(); }
	this.openCreateHostGroup=function() { _self.hostGroupCreator.open(); }
	this.createHostGroup=function(name,host) { this.hostGroupsManager.listShards(name,host); }
	this.updateHostGroup=function(name,data) { this.hostGroupsManager.updateHostGroup(name,data); }
	this.deleteHostGroup=function(name) { this.hostGroupsManager.deleteHostGroup(name); }
	this.openEditHostGroup=function(ref) { _self.hostGroupEditor.open(ref); }
	this.openPreferences=function() { this.preferences.open(); }
	this.message=function(title,body) { _self.messenger.message(title,body); };
	
	this.expandRows=function() { this.tableManager.expandAll(); }
	this.collapseRows=function() { this.tableManager.collapseAll(); }
	this.restoreHidden=function() { this.tableManager.restoreHidden(); }
	
	this.reset=function() {
		var i=this.tableManager.numCols;
		while (i--) {
			this.workers[i].terminate();
		}
		this.workers=[];
		this.activeHosts={};
		this.tableManager.numCols=0;
		this.tableManager.reset();
		this.setUrl();
	}
	
	this.getParameterByName=function(name) {
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
	
	var refreshSpeed=this.getParameterByName('refresh');
	if (!refreshSpeed){refreshSpeed=1;}
	
	this.tableManager=new TableManager(this, data['collapses'], data['hides'], data['sort']);
	this.temporaryHostAdder=new TemporaryHostAdder(this);
	this.hostGroupCreator=new HostGroupCreator(this);
	this.hostGroupEditor=new HostGroupEditor(this);
	this.hostGroupsManager=new HostGroupsManager(this,$('#hostGroups'),data['hostGroups']);
	this.preferences=new Preferences(this, data['expandRows'], data['centerColumns']);
	this.messenger=new Messenger();
	
	var hosts=this.getParameterByName('hosts').split(',');
	var i=0;
	var c=hosts.length;
	var host;
	while (i<c) {
		if (host=hosts[i]) {
			this.addServer(host);
		}
		i++;
	}
			
	collapses=data['collapses'];
	
	this.applyTooltips();
	
	$(window).unload( this.saveData );
}