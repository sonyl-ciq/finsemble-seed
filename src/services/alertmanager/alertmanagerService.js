const Finsemble = require("@chartiq/finsemble");
const RouterClient = Finsemble.Clients.RouterClient;
const Logger = Finsemble.Clients.Logger;
Logger.start();
Logger.log("alertmanager Service starting up");

// Add and initialize any other clients you need to use 
//   (services are initialised by the system, clients are not)
let WindowClient = Finsemble.Clients.WindowClient;
WindowClient.initialize();
let LauncherClient = Finsemble.Clients.WindowClient;
LauncherClient.initialize();

//TODO: Remove me, used to mock remotely triggered alert
const HotkeyClient = Finsemble.Clients.HotkeyClient
HotkeyClient.initialize();
const keyMap = FSBL.Clients.HotkeyClient.keyMap,
hotkeys = [keyMap.ctrl, keyMap.shift, keyMap.m];
let idCounter = 0;

/**
 * 
 * @constructor
 */
function alertmanagerService() {
	const self = this;
	let storeObject = null;

	//Implement service functionality
	
	this.respondToAlert = function () {
		
		//remove the alert from store

		//send something back to the remote service

	}

	this.receiveAlert = function (alertData) {
		//add the alert to the store

		//show the alert component window with showWindow (and pass spawn data if not using Distributed store to drive it)

		//(optional) if not using the Distributed store to drive the AlertPopup component the transmit something on the router to update the UI

	}

	this.init = function(cb) {
		//(Optional) set up a Distributed store to drive the AlertPopup component
		FSBL.Clients.DistributedStoreClient.createStore({
			store:"AlertStore",
			global:true,
			values:{ alerts: [] }
		}, function(err,storeObject_) {
			if (err) {
				Logger.error("AlertStore Distributed Sotre setup failed");
			}
			storeObject = storeObject_;
			cb();
		});
	}

	this.setupConnections = function () {
		//TODO: Setup a websocket connection or long polling etc. to check for new alerts, set it up here
		//mocked with a hot key (Ctrl + Shift + M)
		HotkeyClient.addGlobalHotkey(hotkeys, 
			function(err,response) { // On triggered
				if(err){
					return console.error(err);
				}
				self.receiveAlert({id: idCounter++, msg: "Dummy alert " + idCounter, triggered: "via a hotkey"});
			}, 
			function(err) {  //On registered
				if(err){
					return console.error(err);
				}
			});

		this.createRouterEndpoints();
	}

	/**
	 * Creates a router endpoint for you service. 
	 * Add query responders, listeners or pub/sub topic as appropriate. 
	 * @private
	 */
	this.createRouterEndpoints = function () {
		//Example router integration which uses a single query responder to expose multiple functions
		RouterClient.addResponder("alertmanager functions", function(error, queryMessage) {
			if (!error) {
				Logger.log('alertmanager Query: ',queryMessage);
				
				if (queryMessage.data.query === "respondToAlert") {
					try {
						queryMessage.sendQueryResponse(null, self.respondToAlert());
					} catch (err) {
						queryMessage.sendQueryResponse(err);
					}

					//Add other query functions here
				} else {
					queryMessage.sendQueryResponse("Unknown alertmanager query function: " + queryMessage, null);
					Logger.error("Unknown alertmanager query function: ", queryMessage);
				}
			} else {
				Logger.error("Failed to setup alertmanager query responder", error);
			}
		});	
	};

	return this;
};

alertmanagerService.prototype = new Finsemble.baseService({
	startupDependencies: {
		// add any services or clients that should be started before your service
		services: [/* "dockingService", "authenticationService" */],
		clients: [WindowClient, LauncherClient]
	}
});
const serviceInstance = new alertmanagerService('alertmanagerService');

serviceInstance.onBaseServiceReady(function (callback) {
	serviceInstance.init(serviceInstance.setupConnections);
	Logger.log("alertmanager Service ready");
	callback();
});

serviceInstance.start();
module.exports = serviceInstance;