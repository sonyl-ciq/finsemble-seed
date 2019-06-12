//Requiring finsemble will put FSBL on the window.
const Finsemble = require("@chartiq/finsemble");
const baseService = Finsemble.baseService;
const RouterClient = Finsemble.Clients.RouterClient;
const Logger = Finsemble.Clients.Logger;
const LauncherClient = Finsemble.Clients.LauncherClient;
const AuthenticationClient = Finsemble.Clients.AuthenticationClient;
const util = Finsemble.Util;
const jsforce = require('jsforce');
const SalesforceConnection = require("./salesforceConnection.js").default;

function jsonToQueryString(json) {
	return '?' +
		Object.keys(json).map(function (key) {
			return encodeURIComponent(key) + '=' +
				encodeURIComponent(json[key]);
		}).join('&');
}

/**
 * The salesforce Service receives calls from the salesforceClient.
 * @constructor
 */
var SalesforceService = function () {
	const self = this;
	this.isAuthenticating = false;
	this.SalesforceConnection = null;

	/**
	 * This variable just caches information from the connection that we have open to the salesforceAPI. The information is sent out to instances of `SalesforceConnection` when they come online.
	 * */
	this.salesForceConnectionInfo = {
		accessToken: null,
		refreshToken: null,
		instanceUrl: null
	};

	/**
	 * This method calls auth up to 4 times. Right now, the component comes up and tries to connect. If there's an error, the component clears its local cookies and passes the error back to the service. Then it shuts down (it doesn't know the original authorizationURL that kicked off the OAuth redirect cycle) If the error is "invalid_grant", we try again.
	 * @todo shouldn't need to do this. if the client can redirect itself back to the original authorizationURL, I don't need to re-spawn the component. Hack for now.
	 **/
	this.authenticate = function () {
		//Don't want to end up with 12 different logins running at once. :-)
		if (this.isAuthenticating) {
			console.info("Authentication request: Already trying to authenticate. Request will be dropped.");
		} else {
			this.isAuthenticating = true;

			//Counter that is incremented inside of the callback to beingAuthentication.
			let attempts = 0;
			function auth() {
				AuthenticationClient.beginAuthentication({
					profile: "salesforce",
					spawnParams: {
						options: {
							customData: {
								showErrorScrim: false,
								clearCookies: true
							}
						}
					}
				}, (err, connectionInfo) => {
					console.log("Authentication response", err, connectionInfo);
					//If there's an error, try to reauthenticate. If we've tried 4 times, give up and log the error.
					if (err) {
						if (err === "invalid_grant") {
							if (attempts < 5) {
								attempts++;
								//Return here so that isAuthenticating remains `true`.
								return auth();
							} else {
								console.error(err);
							}
						} else {
							console.error(err);
						}
					} else {
						Logger.system.info("Salesforce accessToken received:", connectionInfo.accessToken);
						//If there's no error, we have new information to create our connection. Set the info an create the connection.
						self.salesForceConnectionInfo = connectionInfo;
						//Publish so that any client that may have requested authentication or reauthentication will receive the updated credentials.
						RouterClient.publish("Finsemble.SalesforceService.salesforceConnectionInfoUpdate", self.salesForceConnectionInfo);
						self.createConnection();
					}
					//Now we can reauthenticate when the next request comes in.
					self.isAuthenticating = false;
				});
			}
			auth();
		}
	}
	/**
	 * Just a wrapper for authenticate that also sets the token null. Used when a query/search comes back with an error of some kind. (usually invalid_grant, which is an expired access token.)
	 */
	this.reauthenticate = function () {
		if (self.isAuthenticating) {
			console.info("Reauthentication request: Already trying to authenticate. Request will be dropped.");
		} else {
			Logger.system.info(`SALESFORCE LOGIN: Salesforce Reauthorization requested. Discarding token ${self.accessToken}`);
			console.info(`SALESFORCE LOGIN: Salesforce Reauthorization requested. Discarding token ${self.accessToken}`);
			self.salesForceConnectionInfo.accessToken = null;
			self.authenticate();
		}
	}

	/***
	 * Using the local connection information, it updates the jsforce object with the proper access token. If we don't have a connection, it creates a new one.
	 */
	this.createConnection = function () {
		if (this.SalesforceConnection) {
			//new access token.
			this.SalesforceConnection.conn.initialize({
				accessToken: this.SalesforceConnection.accessToken
			});
			return;
		};
		//Creates a connection here that acts as the go-between for the entire application. All windows that come online will request the access token from the service so that they can connect to the salesforce API.
		let opts = JSON.parse(JSON.stringify(this.salesForceConnectionInfo));
		//checks every minute to see if the access token is valid.
		this.SalesforceConnection = new SalesforceConnection(opts, RouterClient);
	}

	/**
	 * Creates router endpoints for all of our client APIs. Add servers or listeners for requests coming from your clients.
	 * @private
	 */
	this.createRouterEndpoints = function () {

		RouterClient.addResponder("SalesforceService.create.task", (err, message) => {
			if (err) {
				return message.sendQueryResponse(err);
			}
			const apiEndpoint = "/salesforce/api/create/task"
			let queryString = jsonToQueryString(message.data);

			fetch(apiEndpoint + queryString, { credentials: 'include' }).then((response) => {
				response.json().then(function (data) {
					message.sendQueryResponse(null, data.data);
				})
			})
				.catch((err) => { Logger.system.error(err); });
		});

		RouterClient.addResponder("SalesforceService.getConnectionInfo", function (err, message) {
			if (err) return console.error(err);
			if (serviceInstance.salesForceConnectionInfo.accessToken) {
				return message.sendQueryResponse(null, serviceInstance.salesForceConnectionInfo);
			}
			Logger.system.info("SalesforceService.getConnectionInfo: authenticating.");
			//If we get here, we have no connection info, which means we haven't authenticated yet.
			serviceInstance.authenticate()
			//Check to make
			var waitThisLong = Date.now()+ (604 * 1000 * 1000); // Wait about a week for a connection.
			let myInterval = setInterval(() => {
				if (serviceInstance.salesForceConnectionInfo.accessToken !== null) {
					console.log("Sending out a queued connection message");
					message.sendQueryResponse(null, serviceInstance.salesForceConnectionInfo);
					clearInterval(myInterval);
				} else {
					if (Date.now() > waitThisLong) {
						Logger.system.error("SalesforceService.getConnectionInfo: Timed out waiting for salesforce service to authenticate");
						message.sendQueryResponse("Timed out waiting for salesforce service to authenticate");
						clearInterval(myInterval);							
					}
				}
			}, 500);
		});
		RouterClient.addListener("SalesforceService.reauthenticate", serviceInstance.reauthenticate);
	};
}

LauncherClient.initialize();
SalesforceService.prototype = new baseService({
	startupDependencies: {
		clients: ["launcherClient"]
	}
});
var serviceInstance = new SalesforceService('salesforceService');

fin.desktop.main(function () {
	serviceInstance.onBaseServiceReady(function (callback) {
		Logger.start();
		serviceInstance.createRouterEndpoints();
		callback();
	});
});
serviceInstance.start();
window.salesforceService = serviceInstance;
module.exports = serviceInstance;