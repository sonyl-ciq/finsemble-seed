var Dispatcher = require("flux").Dispatcher;
Dispatcher = new Dispatcher();

var EventEmitter = require("events").EventEmitter;
var assign = require("object-assign");
var request = require("superagent");
const constants = {};

var AlertPopupStore = assign({}, EventEmitter.prototype, {
	storeObject: null,
	initialize: function () {
		//initialize whatever you want.
	},
	addListener: function (cb){
		//assume alertmanagerService has created the store
		FSBL.Clients.DistributedStoreClient.getStore({
			store: "AlertStore",
			global: true
		}, function (err, storeObject_) {
			if (err) {
				console.error("AlertStore Distributed Store setup failed");
			}
			this.storeObject = storeObject_;

			//listen for updates to the alert data and pass back to listener
			this.storeObject.addListener({field:"alerts"}, function(err, data) { 
				cb(err, data);
			});
		});
	}
});

var Actions = {
	respondToAlert: function (id, response, cb) {
		FSBL.Clients.RouterClient.query("alertmanager functions", {query: "respondToAlert", alert: {id: id}, response}, cb);
	}
};

// wait for FSBL to be ready before initializing.
const  FSBLReady = () => { 
	let self = this;
	AlertPopupStore.initialize();
}

if (window.FSBL && FSBL.addEventListener) {
	FSBL.addEventListener("onReady", FSBLReady);
} else {
	window.addEventListener("FSBLReady", FSBLReady);
}

module.exports.Store = AlertPopupStore;
module.exports.Actions = Actions;