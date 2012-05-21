function HostGroupEditor(mmc) {
	
	this.open=function(ref) {
		// Display the dialog
		// Ref.parentNode holds a reference to the host group title in the dropdown menu.
		this.groupName=$(ref.parentNode).text();
		this.rename.val(this.groupName);// Set rename field to current name
		
		this.shardsList.html('');
		this.newShard=$('<input id="newShard" type="text" />').keyup(this.validateShard);
		this.shardValidation=$('<img id="shardValidation" class="shardInvalid" src="images/invalid.png" title="Shard validation\nIf shard is valid, click to add shard to the host group." />').click(this.addShard);
		this.shardsList.append($('<li></li>').append(this.newShard).append(this.shardValidation));
		
		var shards=$(ref.parentNode).nextUntil(':not(.shard)');
		var i=0;
		var c=shards.length;
		var a1,a2;
		while (i<c) {
			this.addShard2List(shards.eq(i).html().slice(12));
			i++;
		}
		
		this.mmc.applyTooltips();
		this.ref.dialog('open');
	}
	
	this.addShard2List=function(host) {
		// Add a shard to the host group list
		// First, check to make sure host is unique
		var shards=this.shardsList.children();
		var i=0;
		var c=shards.length-1;
		while (i<c) {
			if (shards.eq(i++).text()==host) {return;}
		}
		var a1=$('<a href="javascript:void(0);"><img src="images/scan.png" title="Find neighbor shards\nUse the listShards command to find neighboring shards and add them to the host group." /></a>').click(this.getNeighborShards);
		var a2=$('<a href="javascript:void(0);"><img src="images/remove.png" title="Remove shard\nRemove shard from the host group." /></a>').click(this.removeShard);
		this.shardsList.children().eq(-1).before($('<li>'+host+'</li>').append(a1).append(a2));
	}
	
	this.validateShard=function(shard) {
		// Check to see if shard is valid
		_self.shardValidation.attr('class','shardInvalid');// Make sure user can't click on the shard before the shard is validated.
		$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=s&host='+encodeURIComponent($('#newShard').val())}).done(_self.returnValidateShard).fail(_self.errorValidateShard);
	}
	this.returnValidateShard=function(json) {
		// Shard returned ok
		if (json.ok && json.host) {
			// The serverStatus request was successful - the shard is valid
			_self.shardValidation.attr('src','images/add.png').attr('class','shardValid');
		} else {
			_self.errorValidateShard();
		}
	}
	this.errorValidateShard=function() {
		// Shard returned an error
		_self.shardValidation.attr('src','images/invalid.png').attr('class','shardInvalid');
	}
	this.addShard=function() {
		// Add shard from newShard to shard list in editHostGroupDialog
		// Called from shardValid onclick
		if ($(this).hasClass('shardValid')) {
			// Shard is valid
			_self.addShard2List(_self.newShard.val());
		}
	}
	this.getNeighborShards=function(ref) {
		// Use listShards command to get other shards in set.
		var shard=$(this.parentNode).text();
		var pos=shard.indexOf(':');
		if (pos!=-1) {
			var shard2=shard.substr(0,pos);// Remove port
			console.log('Running listShards command on both "'+shard2+'" and "'+shard+'"');
			$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(shard2)}).done(_self.returnGetNeighborShards).fail(_self.errorGetNeighborShards);
			$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(shard)}).done(_self.returnGetNeighborShards).fail(_self.errorGetNeighborShards);
		} else {
			console.log('Running listShards command on '+shard);
			$.ajax({'type': 'GET','dataType': 'json', 'url': 'command-proxy.php?command=l&host='+encodeURIComponent(shard)}).done(_self.returnGetNeighborShards).fail(_self.errorGetNeighborShards);
		}
	}
	this.returnGetNeighborShards=function(json) {
		// listShards command returned
		if (json.ok && json.shards && (c=json.shards.length)) {
			// We have received a list of shards
			var i=0;
			var shard;
			while (i<c) {
				_self.addShard2List(json.shards[i++].host);
			}
		} else {
			// No shards detected
			_self.errorGetNeighborShards(json);
		}
	}
	this.errorGetNeighborShards=function(req) {
		// listShards command threw an error
		console.log('Get Neighbor Shards (listShards command) returned an error:');
		console.log(req);
	}
	
	this.removeShard=function() {
		// Remove a shard from the host group
		$(this.parentNode).remove();
	}
	
	this.remove=function() {
		// Delete this host group
		_self.ref.dialog('close');
		_self.mmc.deleteHostGroup(_self.groupName);
	}
	
	this.save=function() {
		_self.ref.dialog('close');
		var dataArr=[_self.rename.val()];
		var shards=_self.shardsList.children();
		var i=0;
		var c=shards.length-1;
		var shard;
		while (i<c) {
			shard=shards.eq(i++).text();
			dataArr[i]=shard;
		}
		_self.mmc.updateHostGroup(_self.groupName,dataArr);
	}
	this.cancel=function() {
		_self.ref.dialog('close');
	}
	
	var html='<div id="editHostGroupDialog" title="Edit Host Group"><form>';
	html+='<label for="renameGroupName">Group Name: </label><input type="text" id="renameGroupName" />';
	html+='<a id="deleteHostGroup" href="javascript:void(0);"><img src="images/remove.png" title="Delete host group"></a>';
	html+='<ul id="shardsList"></ul>';
	html+='</form></div>';
	this.ref=$(html);
	
	$('BODY').append(this.ref);
	
	this.mmc=mmc;
	
	var _self=this;
	
	this.rename=$('#renameGroupName');
	this.shardsList=$('#shardsList');
	
	$('#deleteHostGroup').click(this.remove);
	
	this.ref.dialog({
		autoOpen: false,
		resizable: false,
		show: 'blind',
		hide: 'blind',
		width: 550,
		buttons: {'Cancel': this.cancel, 'Save Changes': this.save}
	});
}