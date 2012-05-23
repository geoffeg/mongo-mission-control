function HostEditor(mmc) {
	
	this.open=function(arr,id) {
		// Display the dialog
		
		this.oldId=id;
		var i=0;
		while (i<6) {
			this.current[i]=arr[i];
			i++;
		}
		
		this.userInput.val(arr[0]);
		this.passInput.val(arr[1]);
		this.hostInput.val(arr[2]);
		this.portInput.val(arr[3]);
		this.urlRef.html(arr[5]);
		
		this.numShardsRef.html('...');
		this.shardsRef.html('');
		this.numMongodsRef.html('');
		this.isSharded();
		
		this.mmc.applyTooltips();
		this.ref.dialog('open');
	}
	
	this.updateURL=function() {
		// Update URL from input boxes
		_self.current[0]=_self.userInput.val();
		_self.current[1]=_self.passInput.val();
		_self.current[2]=_self.hostInput.val();
		_self.current[3]=_self.portInput.val();
		if (!_self.current[3].length){_self.current[3]='27017';}
		
		_self.getURL(_self.current);
		_self.urlRef.html(_self.current[5]);
		
		_self.numShardsRef.html('...');
		_self.shardsRef.html('');
		_self.numMongodsRef.html('');
		
		// Wait 1 second before getting architecture
		if (_self.timerId!=-1) {
			clearTimeout(_self.timerId);
		}
		_self.timerId=setTimeout(_self.isSharded,500);
	}
	
	this.getURL=function(group) {
		// Get function from host group array
		if (group[0].length && group[1].length) {
			// Username and password
			group[4]=group[0]+':'+group[1]+'@';
		} else {
			group[4]='';
		}
		group[5]=group[4]+group[2]+':'+group[3];
	}
	
	this.isSharded=function() {
		// Get architecture
		// Check if architecture is sharded
		_self.numShards=0;
		$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(_self.current[5])}).done(_self.returnIsSharded).fail(_self.errorIsSharded);
	}
	this.returnIsSharded=function(json) {
		// listShards command returned
		if (json.ok && json.shards && (c=json.shards.length)) {
			// We have received a list of shards
			if (c==1) {
				_self.numShardsRef.html('1 shard detected:');
			} else {
				_self.numShardsRef.html(c+' shards detected:');
			}
			
			// Count replicas
			_self.numShards=c;
			_self.numMongods=0;
			var i=0;
			while (i<c) {
				_self.isReplicaSet(_self.current[4]+json.shards[i].host);
				i++;
			}
		} else {
			// No shards detected
			_self.errorIsSharded(json);
		}
	}
	this.errorIsSharded=function(req) {
		// listShards command threw an error or returned no shards
		_self.numShardsRef.html('No shards detected.');
		_self.numShards=0;
		_self.numMongods=0;
		_self.isReplicaSet(_self.current[5]);
	}
	
	this.isReplicaSet=function(url) {
		// Check to see if a host has shards
		$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=s&host='+encodeURIComponent(url)}).done(_self.returnIsReplicaSet).fail(_self.errorIsReplicaSet);
	}
	this.returnIsReplicaSet=function(json) {
		// serverStatus returned ok
		if (json.ok && json.host) {
			// The serverStatus request was successful - the shard is valid
			if (json.repl && json.repl.hosts) {
				var c=json.repl.hosts.length;
				_self.numMongods+=c;
				_self.shardsRef.append('<li>'+json.host+' - '+c+' replica set member'+((c==1) ? '' : 's')+'</li>');
			} else {
				// No replica sets but is valid host
				_self.numMongods++;
				_self.shardsRef.append('<li>'+json.host+' - not a replica set (1 mongod)</li>');
			}
			_self.numMongodsRef.html(_self.numMongods+' mongod'+((_self.numMongods==1) ? '' : 's')+' total.');
		} else {
			_self.errorIsReplicaSet();
		}
	}
	this.errorIsReplicaSet=function() {
		// serverStatus returned an error
		if (_self.numShards || _self.numReplicas) {
			// If there were mongodbs returned previously
			_self.shardsRef.append('<li>'+json.host+' - Invalid host</li>');
		} else {
			// Only overwrite if there were no valid replica sets returned previously.
			_self.numShardsRef.html('<strong style="color:red;">Invalid URL</strong>');
		}
	}
	
	this.remove=function(event) {
		// Delete this host group
		_self.ref.dialog('close');
		_self.mmc.deleteHost(_self.oldId);
	}
	
	this.save=function() {
		_self.ref.dialog('close');
		_self.mmc.updateHost(_self.oldId,_self.current);
	}
	this.cancel=function() {
		_self.ref.dialog('close');
	}
	
	var html='<div id="editHostDialog" title="Edit Host"><form>';
	html+='<label for="userEdit">Username:</label><input type="text" id="userEdit" class="textEdit" /><br />';
	html+='<label for="passEdit">Password:</label><input type="text" id="passEdit" class="textEdit" /><br />';
	html+='<label for="hostEdit">Host:</label><input type="text" id="hostEdit" value="localhost" class="textEdit" /><br />';
	html+='<label for="portEdit">Port:</label><input type="text" id="portEdit" value="27017" class="textEdit" /><br />';
	html+='<label for="url">URL:</label><span id="url">localhost:27017</span><hr />';
	html+='<span id="numShards"></span><br />';
	html+='<ul id="shards"></ul><br />';
	html+='<span id="numMongods"></span>';
	html+='</form></div>';
	this.ref=$(html);
	
	$('BODY').append(this.ref);
	
	this.mmc=mmc;
	
	var _self=this;
	
	this.userInput=$('#userEdit');
	this.passInput=$('#passEdit');
	this.hostInput=$('#hostEdit');
	this.portInput=$('#portEdit');
	this.urlRef=$('#url');
	this.numShardsRef=$('#numShards');
	this.shardsRef=$('#shards');
	this.numMongodsRef=$('#numMongods');
	
	this.userInput.keyup(this.updateURL);
	this.passInput.keyup(this.updateURL);
	this.hostInput.keyup(this.updateURL);
	this.portInput.keyup(this.updateURL);
	
	this.oldId;
	this.current=['','','',''];
	this.numShards=0;
	this.numMongods=0;
	
	this.timerId=-1;
	
	this.ref.dialog({
		autoOpen: false,
		resizable: false,
		show: 'blind',
		hide: 'blind',
		width: 750,
		buttons: {'Delete Host': this.remove, 'Cancel': this.cancel, 'Save': this.save}
	});
}