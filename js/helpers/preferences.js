function Preferences(mmc,expand,center) {
	var html='<div id="prefsDialog" title="Display Preferences"><form>';
	html+='<input type="checkbox" id="expandRows" /><label for="expandRows" class="fullLabel">Always expand rows</label><br />';
	html+='<input type="checkbox" id="centerColumns" /><label for="centerColumns" class="fullLabel">Center Columns</label>';
	html+='</form></div>';
	var ref=$(html);
	$('BODY').append(ref);
	
	ref.dialog({
		autoOpen: false,
		resizable: false,
		show: 'blind',
		hide: 'blind'
	});
	
	$('#expandRows').change(mmc.setExpandRows);
	$('#centerColumns').change(mmc.setCenterColumns);
	
	if (expand){$('#expandRows').click();}
	if (center){$('#centerColumns').click();}
	
	this.open=function() {
		ref.dialog('open');
	}
}