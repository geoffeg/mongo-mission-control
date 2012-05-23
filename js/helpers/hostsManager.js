function HostsManager(mmc,menuRef,hosts) {
	
	this.currentName='';
	this.currentHost=['','','',''];
	this.currentPath='';
	
	this.mmc=mmc;
	this.menuRef=menuRef;
	this.hosts=hosts;
	
	var _self=this;
	
	this.createMenu=function() {
		// Add items to host groups dropdown menu
		menuRef.html($('<span>Create Host Group</span>').click(mmc.openCreateHost));
		var i=0;
		var c=this.hosts.length;
		var group;
		while (i<c) {
			group=this.hosts[i];
			if (group && group.length==6) {
				this.displayHost(group,i);
				i++;
			} else {
				// Invalid group - remove it
				this.hosts.splice(i,1);
				c--;
			}
		}
	}
	
	this.displayHost=function(group,id) {
		// Add host group to menu from data
		var icon=$('<a href="javascript:void(0);"><img src="images/edit.png" /></a>').click(this.editHost);
		var item=$('<span class="shard" groupid="'+id+'">'+group[2]+'</span>').click(this.addServer).append(icon);
		this.menuRef.append(item);
	}
	
	this.addHost=function(group) {
		// Add host group
		var id=hosts.length;
		this.displayHost(group,id);
		hosts[id]=group;
		return id;
	}
	
	this.updateHost=function(id,arr) {
		// Update host group
		// Called from hostEditor
		$('span.shard[groupid='+id+']').contents().first().replaceWith(document.createTextNode(arr[2]));
		var i=0;
		while (i<6) {
			this.hosts[id][i]=arr[i];
			i++;
		}
	}
	
	this.deleteHost=function(id) {
		// Delete host group
		// Called from hostEditor
		$('span.shard[groupid='+id+']').remove();
		this.hosts.splice(id,1);
	}
	
	this.highlightHost=function(host) {
		menuRef.children('a.shard:contains('+host+')').addClass('this');
	}
	
	this.listShards=function(name, username, password, host, port) {
		// Create host group from name and host.
		// First, try running the listShards command to get a list of shards connected.
		// If this does not work, check if the supplied host is a valid shard.
		// If it is, add it as the sole shard in the host group.
		// Otherwise, fail and return an error.
		this.currentName=name;
		this.currentHost=[username,password,host,port];
		
		if (username.length && password.length) {
			this.currentPath=username+':'+password+'@'+host+':'+port;
		} else {
			this.currentPath=host+':'+port;
		}
		
		$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(this.currentPath)}).done(this.returnListShards).fail(this.errorListShards);
	}
	this.returnListShards=function(json) {
		var c;
		if (json.ok && json.shards && (c=json.shards.length)) {
			// We have received a list of shards
			var dataArr=[_self.currentName];
			var message='<p>A host group has been created and the following shards have been detected:</p><ul>';
			var i=0;
			var shard;
			while (i<c) {
				shard=json.shards[i++];
				dataArr[i]=shard.host;
				message+='<li>'+shard.host+' ('+shard._id+')</li>';
			}
			message+='</ul><p>To add a shard to the current display, click on it under the Host Groups dropdown menu, or click on the group title to add all shards in the group.</p>';
			_self.mmc.message('Host Group Creation Successful',message);
			_self.addHost(dataArr);
		} else {
			// No shards detected
			console.log('listShards command did not return any shards. Here is the output:');
			console.log(json);
			$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=s&host='+encodeURIComponent(_self.currentHost)}).done(_self.returnServerStatus).fail(_self.errorServerStatus);
		}
	}
	this.errorListShards=function(req) {
		// Error occurred with request
		console.log('listShards command returned with an error:');
		console.log(req);
		$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=s&host='+encodeURIComponent(_self.currentHost)}).done(_self.returnServerStatus).fail(_self.errorServerStatus);
	}
	this.returnServerStatus=function(json) {
		if (json.ok && json.host) {
			// The serverStatus request was successful
			var dataArr=[_self.currentName,_self.currentHost];
			_self.mmc.message('Host Group Creation Successful','<p>listShards command did not return any shards or an error occurred. However, the specified host is a valid shard, so it has been added to the Host Groups dropdown menu. Further information is in the console log.</p>');
			_self.addHost(dataArr);
		} else {
			errorServerStatus();
		}
	}
	this.errorServerStatus=function() {
		// The serverStatus request was not successful
		mmc.message('Host Group Creation Successful','<p>Error: listShards command did not return any shards or an error occurred. Also, running serverStatus on the specified host did not return a valid object. Further information is in the console log.</p>');
	}
	
	this.editHost=function(event) {
		// Edit host group
		event.stopPropagation();
		var id=$(this.parentNode).attr('groupid');
		console.log(id);
		_self.mmc.openEditHost(_self.hosts[id],id);
	}
	
	this.addServer=function() {
		// Add one server
		var arr=_self.hosts[$(this).attr('groupid')];
		mmc.addMongoS(arr[5],arr[4]);
		mmc.setUrl();
	}
	
	this.createMenu();
}