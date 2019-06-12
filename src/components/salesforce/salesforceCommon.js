window.console.log("mindcontrol - salesforce common");

// Make sure we are logged in to salesforce
FSBL.Clients.RouterClient.subscribe("Finsemble.SalesforceService.accessTokenUpdate", (err, response) => {
	console.log("Received token from salesforce Service.", response);
});

var $ = require('./common/js/jQuery');
var salesforce = function () { };
let SalesforceConnection = require("./salesforceConnection").default;
let MySalesforceConnection = new SalesforceConnection(null, FSBL.Clients.RouterClient);
salesforce.getSalesforceObjectIdFromUrl = function (url) {
	try {
		return url.split("sObject/")[1].split("/")[0];
	} catch (e) {

	}
}

salesforce.getSalesforcerecordType = function (objectId) {
	var prefix = objectId.substring(0, 3);
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

salesforce._createTask = function (params, cb) {
	const recordType = salesforce.getSalesforcerecordType(params.objectId);

	var task = {
		Subject: params.subject,
		Status: (params.status ? params.status : 'Completed'),
		ActivityDate: (params.date ? params.date : new Date()),
		Description: params.description ? params.description : ""
	}

	switch (recordType) {
		case 'Contact':
		case 'Lead':
			task.WhoId = params.objectId;
			break;
		default:
			task.WhatId = params.objectId;
			break;
	}

	console.info("Creating salesforce task", task);
	MySalesforceConnection.onConnected(() => {
		MySalesforceConnection.conn.sobject('Task').create(task, function (err, ret) {
			cb(err, ret);
		});
	});
	//https://localhost.chartiq.com:3375/salesforce/api/create/task?subject=Brad%20test&recordType=Contact&recordId=003f4000003QK7IAAW&description=Testing
}

salesforce.createTask = function (params, cb) {
	// Find the salesforce object
	console.log("CREATE TASK", params);

	if (!params.objectId) {
		salesforce.findObject(params, function (err, response) {
			params.objectId = response ? response[0].Id : null;
			salesforce._createTask(params, cb);
		});
	} else {
		salesforce._createTask(params, cb);
	}

}

salesforce.findObject = function (params, cb) {
	var search = {
		searchTerm: params.searchTerm,
		recordType: params.recordType
	}
	if (!params.searchTerm) {
		return console.error(new Error("No searchTerm passed to salesforce.findObject."));
	}
	MySalesforceConnection.onConnected(() => {
		MySalesforceConnection.search(`FIND {${params.searchTerm}} IN ALL FIELDS RETURNING ${params.recordType}(Id)`, function (err, ret) {
			if (ret && ret.searchRecords.length == 1) {
				cb(null, ret.searchRecords );
			} else if (ret && ret.searchRecords.length > 1) {
				cb("Multiple Records Found in Salesforce.", ret.searchRecords);
			} else {
				cb("No Records Found in Salesforce for this " + params.recordType + ": " + params.searchTerm, null);
			}
		});
	});
}

module.exports = salesforce;
