var $ = require('./jQuery');
let config = require("./common.config.json");
const SALESFORCE_INSTANCE_URL = config.lightning_instance_url;
/**
 * This file has some common functionality, particularly for the list views.
 */
let common = {};
common.getValueFromObjectByString = function (o, s) {//Object,String
	s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
	s = s.replace(/^\./, '');           // strip a leading dot
	var a = s.split('.');
	for (var i = 0, n = a.length; i < a.length; ++i) {// Loop through and find the attribute that matches the string passed in
		var k = a[i];
		if (!o) { return null; }
		if (k in o) {
			o = o[k];
		} else {
			return null;
		}
	}
	return o;
};
common.getSalesforceObjectType = function (recordId) {
	var prefix = recordId.substring(0, 3);
	switch (prefix) {
		case '001':
			return 'Account';
			break;
		case '006':
			return 'Opportunity';
			break;
		case '00Q':
			return 'Lead';
			break;
		case '003':
			return 'Contact';
			break;
		default:
			return 'Other';
			break;
	}
}

common.getIconForRecordType = function(recordType, isCircle) {
	if (!recordType) {
		recordType = common.getRecordType();
	}
	let iconMap = {
		Account: 'account_120',
		Contact: 'contact_120',
		Opportunity: 'opportunity_120'
	}
	let colorMap = {
		Account: '#7F8DE1',
		Contact: '#a094ed',
		Opportunity: '#fcb95b'
	}
	let iconFilename = iconMap[recordType];
	let wrapperClasses = "small roundedSquare forceEntityIcon";
	if (isCircle) {
		wrapperClasses += " circleIcon";
	}
	let iconHTML = `<div class="${wrapperClasses}" style="background-color: ${colorMap[recordType]}">
		<span class="uiImage">
			<img src="${SALESFORCE_INSTANCE_URL}/img/icon/t4v35/standard/${iconFilename}.png" class="icon " alt="" title="">
		</span>
	</div>
	`
	return iconHTML;
}
common.getRecordType = function () {
	return FSBL.Clients.WindowClient.options.customData.component.advertiseReceivers[0].replace('salesforce.', '').toProperCase();
}
/**
 * This guy makes links inoperable; instead of opening a new window, they will open finsemble components with the appropriate initialziation data.
 */
common.swapClicks = function (table) {
	table.on('draw', makeLinksDraggable);
	function makeLinksDraggable() {
		setTimeout(function () {
			$('a').attr('draggable', true);
		}, 300);
	}
	makeLinksDraggable();
	function getObjectForSharing(recordId, title) {
		var objectType = common.getSalesforceObjectType(recordId)
		var data = {}
		data['salesforce.' + objectType.toLowerCase()] = {
			recordId: recordId,
			description: 'Salesforce ' + objectType + (title ? ': ' + title : '')
		}
		return data;

	}
	//Opens a new component, unless there's a linked one that can handle this recordType.
	function handleSalesforceLinkClick(recordId) {
		var data = getObjectForSharing(recordId);
		FSBL.Clients.DragAndDropClient.openSharedData({
			data: data
		});
	}

	//Does something with symphony...@sidd, what does this do??
	function handleSymphonyLink(data) {
		if (data.objectType == 'Contact') {
			FSBL.Clients.DragAndDropClient.openSharedData({
				data: {
					"symphony.chat": {
						chatDescriptor: {
							userName: data.userName,
							header: data.userName
						}
					}
				},
				publishOnly: true
			})
		}
	}

	//Prevent clicks from opening new windows. Force them to open components.
	$("body").get(0).addEventListener('click', function (e) {
		var target = $(e.target);
		let recordId = target.data('recordid');
		if (recordId) {
			e.preventDefault();
			e.stopPropagation();
			handleSalesforceLinkClick(recordId);
			handleSymphonyLink({
				objectType: common.getSalesforceObjectType(recordId),
				userName: target.text(),
				header: target.text()
			});
			return false;
		}
	}, true);

	//When user goes to a different page of the table, have to make those links draggable.
	$(document).on("click", '.pagenumbers', (e) => {
		makeLinksDraggable();
	});

	//When dragging links, fire DragAndDrop events
	$(document).on("dragstart", "a", function (event) {
		var recordId = $(event.currentTarget).data('recordid');
		var objectType = common.getSalesforceObjectType(recordId)
		if (["Account", "Contact", "Opportunity"].includes(objectType)) {
			var data = getObjectForSharing(recordId, $(event.currentTarget).text());
			FSBL.Clients.DragAndDropClient.dragStartWithData(event.originalEvent, data);
		}
	});
}

common.getRecordName = function (recordInfo) {
	return recordInfo.filter((info) => info.name === "Name")[0].value;
}
module.exports = common;