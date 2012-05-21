function TableManager(mmc, collapses, hides, sorting) {

	this.makeSortable=function(ref) {
		// Make ref sortable
		return ref.sortable({'distance': 10, 'axis': 'y', 'update': function() {_self.newSort=true;}});
	}
	
	var stats=$('<div id="stats" class="isparent"><span></span><span></span></div>').append(this.makeSortable($('<div></div>')));
	$('BODY').append(stats);
	
	var spanStyle=$('<style></style>');
	$('HEAD').append(spanStyle);
	
	this.numCols=0;
	
	this.collapses=collapses;
	this.hides=hides;
	this.sorting=sorting;
	
	this.newSort=true;
	
	var _self=this;
	
	this.update=function(colId, rowId, data, level) {
		// Recursive function to insert data into correct rows.
		
		level++;
		var id,row;
		var de;// Data element
		for (de in data) {
			// Loop through each element of data
			id=rowId+'_'+de;
			if (this.hides.indexOf(id)!=-1){continue;}
			row=$(id);
			if (row.length==0) {
				// Row doesn't exist - add it
				this.addRow(rowId, de, level);
				row=$(id);
			}
			if (data[de] instanceof Object) {
				// Object
				this.update(colId, id, data[de], level);
			} else {
				// Value
				row.children()[colId].innerHTML=(data[de]==='' ? '&nbsp;' : data[de]);
			}
		}
	}
	
	this.addCol=function() {
		// Add column to table
		// Calculate correct column widths
		this.numCols++;
		this.addCol2Row(stats);
		var firstWidthPerc = Math.floor(1100/(this.numCols+1.1))/10;
		var restWidthPerc = Math.floor(1000/(this.numCols+1.1))/10-2;
		spanStyle.html('div>div.isparent>span:first-child, div>div.isnotparent>span:first-child { width: '+firstWidthPerc+'%; } div>div>span:not(:first-child) { width: '+restWidthPerc+'%; margin-right: 2%; }');
		return this.numCols;
	}
	
	this.addCol2Row=function(row) {
		// Recursive function to add a new column.
		if (row.hasClass('isparent')) {
			// Is a parent
			var elements=row.children().eq(2).children();
			var i=0;
			var c=elements.length;
			while (i<c) {
				this.addCol2Row(elements.slice(i,++i));
			}
		} else {
			// Is not a parent
			row.append('<span></span>');// Add column
		}
	}
	
	this.expandAll=function() {
		// Expand all rows
		var parents=stats.find('.isparent');
		var i=0;
		var c=parents.length;
		while (i<c) {
			var el=parents.slice(i,++i).children().slice(2,3);
			if (el.is(":hidden")) {el.show('blind');}
		}
		// Remove all collapseions
		this.collapses=[];
	}
	
	this.collapseAll=function() {
		// Collapse all rows
		this.collapses=[];
		var parents=stats.find('.isparent');
		var i=0;
		var j=0;
		var c=parents.length;
		while (i<c) {
			var el=parents.slice(i,++i);
			this.collapses[j++]='#'+el.attr('id');
			el=el.children().slice(2,3);
			if (el.is(":visible")) {el.hide('blind');}
		}
	}
	
	this.addRow=function(parentId, key, level) {
		// There is a new key in a returned set - add a new row
		ensureLevel(level);// Ensure that there is a class definition for the level.
		var title=splitCamelCase(key);// Make title
		var id=parentId+'_'+key;// Id of row with # at beginning
		var inside='<span><span class="level_'+level+'">'+title+'</span></span>';
		var i=this.numCols;
		while (i--) {
			// Add the correct number of columns
			inside+='<span>&nbsp;</span>';
		}
		var deleteButton=$('<a href="javascript:void(0);"><img src="images/deleteButton.png" /></a>').click(this.hideRow);
		var spans=$(inside);
		spans.children().eq(0).append(deleteButton);
		var row=$('<div id="'+id.slice(1)+'" class="isnotparent"></div>').append(spans);// Append delete button right after title.
		var parentRef=$(parentId);
		if (!parentRef.hasClass('isparent')) {
			// Parent row is not a parent yet - make it a parent and add row
			var children=parentRef.children();
			$(parentRef[0].firstChild.firstChild).click(this.collapseExpand);
			//parentRef.html('<span><a href="javascript:void(0);" onclick="collapseExpand(\''+parentId+'\');" class="'+spanTag.getAttribute('class')+'"><!--<img src="images/arrowDown.png" />-->'+spanTag.innerHTML+'</a></span><div>&nbsp;</div><div>'+row+'</div>');
			parentRef.children().slice(1).remove();// Remove everything after the first span (the header)
			parentRef.append('<div>&nbsp;</div><div></div>');// Add the div that contains the child rows and the first child row
			parentRef.attr('class','isparent');
			children=parentRef.children().slice(2,3);
			this.makeSortable(children);
			if (this.collapses.indexOf(parentId)!=-1){children.hide();}// If the parent should be collapseed, collapse it.
		} else {
			// Parent row already has child rows
		}
		var children=parentRef.children().slice(2,3);
		
		// Append the row to the HTML after the correct row (to preserve sorting order from previous session).
		if (this.sorting[parentId]) {i=this.sorting[parentId].indexOf(id);}
		else {i=-1;}
		if (i==-1) {
			// This row is not in the sorting order, so just append it to the end of the div.
			children.append(row);
		} else {
			// This row is at position i in the sorting order.
			var el;
			while ((i--)>0 && (el=$(this.sorting[parentId][i])).length==0);// Get the row that this row is right after in the sorting order.
			if (i<0) {
				// No row is before this one in the sorting order.
				children.prepend(row);
			} else {
				// Append this row right after the previous row in the sorting order.
				el.after(row);
			}
		}
		
		// Row hovering
		$(id).hover(function (e) {$(this).addClass('rowHover').parent().parent().removeClass('rowHover');}, function (e) {var parent=$(this).removeClass('rowHover').parent().parent();if (parent.attr('id') && parent.attr('id')!='stats'){parent.addClass('rowHover');}});
	}
	
	var ensureLevel=function(level) {
		// Makes sure a style for this level is set.
		if (!$('#levelStyle_'+level).length) {
			// Add level style
			$('HEAD').append('<style id="levelStyle_'+level+'">span.level_'+level+',a.level_'+level+' { padding-left: '+(25*level)+'px; width: 100%; }</style>');
		}
	}
	
	var splitCamelCase=function(s) {
		// Some crazy regex to split camel case and underscore separated words with a space and capitalize words.
		return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3').replace(/(_+)(\w)/g,function($1,$2,$3){return ' '+$3.toUpperCase();}).replace(/^./, function(str){ return str.toUpperCase(); });
	}
	
	this.collapseExpand=function() {
		// collapse or expand a level div (hide child rows).
		var parent=$(this.parentNode.parentNode);
		parent.children().eq(2).toggle('blind');
		
		// If there is a collapse already in the collapses array, remove it.
		var id='#'+parent.attr('id');
		var i=0;
		var c=_self.collapses.length;
		while (i<c) {
			if (_self.collapses[i]==id) {
				_self.collapses.splice(i,1);
				return;
			}
			i++;
		}
		// Otherwise, add it.
		_self.collapses[_self.collapses.length]=id;
	}
	
	this.hideRow=function() {
		// Hide entire row
		_self.saveSort();
		var parent=$(this.parentNode.parentNode.parentNode);
		parent.hide('blind',function(){$(this).remove();});
		_self.hides[_self.hides.length]='#'+parent.attr('id');
	}
	
	this.restoreHidden=function() {
		// Restore all hidden rows. Called from menu.
		_self.hides=[];
	}
	
	this.saveSort=function() {
		// Serialize sorting so it can be restored later
		if (!this.newSort){return this.sorting;}
		var sort={};
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
				sort[parentId][j]='#'+children.eq(j++).attr('id');
			}
		}
		this.sorting=sort;
		this.newSort=false;
		return sort;
	}
	
	this.reset=function() {
		stats.html('<span></span><span></span>').append(this.makeSortable($('<div></div>')));
		this.newSort=true;
	}
}