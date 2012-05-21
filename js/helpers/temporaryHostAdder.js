function TemporaryHostAdder(mmc) {
	var html='<div id="addHostDialog" title="Add Temporary Host"><form>';
	html+='<label for="tempHost">Host: </label><input type="text" id="tempHost" />';
	html+='</form></div>';
	var ref=$(html);
	$('BODY').append(ref);
	
	this.mmc=mmc;
	
	var _self=this;
	
	this.open=function() {
		ref.dialog('open');
	}
	
	this.addHost=function() {
		// Add temporary host
		ref.dialog('close');
		_self.mmc.addServer($('#tempHost').val());
		_self.mmc.setUrl();
	}
	
	ref.dialog({
		autoOpen: false,
		resizable: false,
		show: 'blind',
		hide: 'blind',
		width: 500,
		buttons: {'Add Host': this.addHost}
	});
}