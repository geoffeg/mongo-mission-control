function HostGroupCreator(mmc) {
	var html='<div id="createHostGroupDialog" title="Create Host Group"><form>';
	html+='<label for="groupName">Group Name: </label><input type="text" id="groupName" /><br />';
	html+='<label for="host">Host: </label><input type="text" id="host" />';
	html+='</form></div>';
	var ref=$(html);
	$('BODY').append(ref);
	
	this.mmc=mmc;
	
	var _self=this;
	
	this.open=function() {
		ref.dialog('open');
	}
	
	this.createHostGroup=function() {
		// Add temporary host
		ref.dialog('close');
		_self.mmc.createHostGroup($('#groupName').val(),$('#host').val());
	}
	
	ref.dialog({
		autoOpen: false,
		resizable: false,
		show: 'blind',
		hide: 'blind',
		width: 500,
		buttons: {'Create Host Group': this.createHostGroup}
	});
}