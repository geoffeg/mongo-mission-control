function HostGroupsManager(mmc,menuRef,hostGroups) {
	
	this.currentName='';
	this.currentHost='';
	
	this.mmc=mmc;
	this.menuRef=menuRef;
	this.hostGroups=hostGroups;
	
	var _self=this;
	
	this.createMenu=function() {
		// Add items to host groups dropdown menu
		menuRef.html($('<span>Create Host Group</span>').click(mmc.openCreateHostGroup));
		var i=0;
		var c=this.hostGroups.length;
		var group;
		while (i<c) {
			group=this.hostGroups[i];
			if (group && group.length>0) {
				this.showHostGroup(group);
				i++;
			} else {
				this.hostGroups.splice(i,1);
				c--;
			}
		}
	}
	
	this.showHostGroup=function(group) {
		// Add host group to menu from data
		var icon=$('<a href="javascript:void(0);"><img src="images/edit.png" /></a>').click(this.editHostGroup);
		menuRef.append($('<span>'+group[0]+'</span>').click(this.addServers).append(icon));
		var i=1;
		var c=group.length;
		var shard;
		while (i<c) {
			menuRef.append($('<span class="shard">&nbsp;&nbsp;'+group[i]+'</span>').click(this.addServer));
			i++;
		}
	}
	
	this.addHostGroup=function(group) {
		// Add host group
		
		// Make sure that the name is unique.
		var i=0;
		var c=this.hostGroups.length;
		while (i<c) {
			if (group[0]==this.hostGroups[i][0]) {
				// Non-unique name
				this.mmc.message('I take that back.','Actually, the host group has not been created because that name has already been used. Please try again and choose a unique name.');
				return;
			}
			i++;
		}
		
		// Add host group
		this.showHostGroup(group);
		this.hostGroups[_self.hostGroups.length]=group;
	}
	
	this.updateHostGroup=function(name,dataArr) {
		// Update host group
		// Called from hostGroupEditor
		var shards=$('#hostGroups:not(.shard)').children();
		var i=1;
		var c=shards.length;
		var shard;
		while (i<c) {
			shard=shards.eq(i);
			if (shard.text()==name) {
				// Update dropdown menu
				shard.contents().first().replaceWith(document.createTextNode(dataArr[0]));// Change host group name
				shard.nextUntil(':not(.shard)').remove();
				i=dataArr.length;
				while (i>1) {
					i--;
					console.log(dataArr[i]);
					shard.after($('<span class="shard">&nbsp;&nbsp;'+dataArr[i]+'</span>').click(this.addServer));
				}
				
				// Replace hostGroups
				i=0;
				c=this.hostGroups.length;
				while (i<c) {
					if (this.hostGroups[i][0]==name) {
						this.hostGroups[i]=dataArr;
					}
					i++;
				}
				return;
			}
			i++;
		}
	}
	
	this.deleteHostGroup=function(name) {
		// Delete host group
		// Called from hostGroupEditor
		var shards=$('#hostGroups:not(.shard)').children();
		var i=1;
		var c=shards.length;
		var shard;
		while (i<c) {
			shard=shards.eq(i);
			if (shard.text()==name) {
				// Remove host group and child shards
				shard.nextUntil(':not(.shard)').remove();
				shard.remove();
			}
			i++;
		}
		i=0;
		c=this.hostGroups.length;
		while (i<c) {
			if (this.hostGroups[i][0]==name) {
				this.hostGroups.splice(i,1);
				c--;
			} else {
				i++;
			}
		}
	}
	
	this.highlightHost=function(host) {
		menuRef.children('a.shard:contains('+host+')').addClass('this');
	}
	
	this.listShards=function(name, host) {
		// Create host group from name and host.
		if (name.length && host.length) {
			// First, try running the listShards command to get a list of shards connected.
			// If this does not work, check if the supplied host is a valid shard.
			// If it is, add it as the sole shard in the host group.
			// Otherwise, fail and return an error.
			this.currentName=name;
			this.currentHost=host;
			$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(host)}).done(this.returnListShards).fail(this.errorListShards);
		}
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
			_self.addHostGroup(dataArr);
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
			var dataArr=[_self.currentName,json.host];
			_self.mmc.message('Host Group Creation Successful','<p>listShards command did not return any shards or an error occurred. However, the specified host is a valid shard, so it has been added to the Host Groups dropdown menu. Further information is in the console log.</p>');
			_self.addHostGroup(dataArr);
		} else {
			errorServerStatus();
		}
	}
	this.errorServerStatus=function() {
		// The serverStatus request was not successful
		mmc.message('Host Group Creation Successful','<p>Error: listShards command did not return any shards or an error occurred. Also, running serverStatus on the specified host did not return a valid object. Further information is in the console log.</p>');
	}
	
	this.editHostGroup=function(event) {
		// Edit host group
		event.stopPropagation();
		_self.mmc.openEditHostGroup(this);
	}
	
	this.addServers=function(event) {
		// Add all servers in a host group
		event.stopPropagation();
		var shards=$(this).nextUntil(':not(.shard)');
		var i=0;
		var c=shards.length;
		var shard;
		while (i<c) {
			mmc.addServer(shards[i].innerHTML.slice(12));
			i++;
		}
		mmc.setUrl();
	}
	this.addServer=function() {
		// Add one server
		mmc.addServer(this.innerHTML.slice(12));
		mmc.setUrl();
	}
	
	this.createMenu();
}