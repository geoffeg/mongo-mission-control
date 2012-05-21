function Messenger() {
	this.stack=[];
	this.isOpen=false;
	
	var _self=this;
	
	this.message=function(title,body) {
		if (this.isOpen) {
			this.stack[this.stack.length]=[title,body];
		} else {
			this.messenger.dialog('option','title',title).html(body).dialog('open');
			this.isOpen=true;
		}
	}
	
	this.nextMessage=function() {
		if (_self.stack.length) {
			var arr=_self.stack.splice(0,1);
			_self.messenger.dialog('option','title',arr[0][0]).html(arr[0][1]).dialog('open');
		} else {
			_self.isOpen=false;
		}
	}
	
	this.messenger=$('<div id="messageDialog" title="Host Group Creation Successful"></div>');
	$('BODY').append(this.messenger);
	this.messenger.dialog({
		autoOpen: false,
		show: 'blind',
		hide: 'blind',
		width: 800,
		close: this.nextMessage
	});
}