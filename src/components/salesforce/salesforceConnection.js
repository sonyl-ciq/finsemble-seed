const redirectUriBasePath = "localhost.chartiq.com:3375";
const EventEmitter = require("events").EventEmitter;
const jsforce = require("jsforce");
const Logger = require("@chartiq/finsemble").Clients.Logger;
Logger.start();
let defaultConnectionOpts = {
    instanceUrl: null,
    accessToken: null,
    refreshToken: null
}
let RouterClient;
/**
 * Wrapper for jsforce's connection object. In the service, this object will handle refreshing and getting new tokens. In the client, it will receive token updates from the service, and handle errors thrown by the salesforce API (e.g., invalid_grant).
 *
 * @export
 * @class SalesforceConnection
 * @extends {EventEmitter}
 */
export default class SalesforceConnection extends EventEmitter {
    constructor(opts = defaultConnectionOpts, rc) {
        super();
        //Pass in the routerCLient to the constructor to avoid pesky bugs that currently exist when having multiple instances of the router with the same name.
        RouterClient = rc;

        //Allow for the application to pass in default tokens.
        opts = Object.assign(defaultConnectionOpts, opts);

        Logger.system.debug("SalesforceConnection", "Salesforce Connection Constructor, options:", opts);
        //sets defaults for accessToken, instanceUrl, etc.
        this.setConnectionInfo(opts);
        let self = this;
            this.getConnectionInfo((err, response) => {
                if (err) {
                    FSBL.UserNotification.alert("component", "ALWAYS", "Salesforce-Connection-Error", "Salesforce Connection Error " + err);
                    this.emit("connectionError");
                    return;
                }

                //If we already have an access token (which could happen because of the subscriber inside of `listenForUpdates`) return.
                if (this.accessToken) return;

                //If the service (which uses pub/sub) sends back nothing return.
                if (response.data === null || !response.data.accessToken) {
                    FSBL.UserNotification.alert("component", "ALWAYS", "Salesforce-Connection-Error", "Salesforce Connection Error, no access token received");
                    this.emit("connectionError");
                    return;
                }

                //Set our local variables, create the connection, and listen for updates.
                console.log("SalesforceConnection", "Received token from salesforce Service.", response);
                Logger.system.info("SalesforceConnection", "Received token from salesforce Service.");
                this.setConnectionInfo(response.data);
                this.createNewJSForceConnection();
                this.listenForUpdates();
            });
    }

    /**
     * Listens for updates from the salesforce Service. if a connection sends off a query/search to salesforce, and it comes back with an error, the service will fetch a new access token. Afterwards, it will send an update here.
     *
     * @memberof SalesforceConnection
     */
    listenForUpdates() {
        RouterClient.subscribe("Finsemble.SalesforceService.salesforceConnectionInfoUpdate", (err, response) => {
            if (!response.data.accessToken) return;
            Logger.system.debug("SalesforceConnection", "Salesforce Connection Information received", response.data);
            this.setConnectionInfo(response.data);
            this.emit("refreshed");
        });
    }

    /**
     * Convenience method to allow clients to do things once we have a valid connection to salesforce.
     *
     * @param {any} callback
     * @memberof SalesforceConnection
     */
    onConnected(callback) {
        if (this.conn) {
            callback();
        } else {
            this.addListener("connected", callback);
        }
    }

    /**
     * Respond to connection error events
     *
     * @param {any} callback
     * @memberof SalesforceConnection
     */
    onConnectionError(callback) {
        if (this.conn) {
            callback();
        } else {
            this.addListener("connectionError", callback);
        }
    }


    /**
     * Requests currently active connectionInfo that the service has saved. If none exist, the service will request authorizaiton using the AuthenticationClient.
     *
     * @param {any} callback
     * @memberof SalesforceConnection
     */
    getConnectionInfo(callback) {
        RouterClient.query("SalesforceService.getConnectionInfo", null, callback);
    }

    /**
     * Simple setter.
     *
     * @param {any} data
     * @memberof SalesforceConnection
     */
    setConnectionInfo(data) {
        //Defaults; if setConnectionInfo is called and any property is null or undefined, default to what's currently on `this`
        let { instanceUrl, accessToken, refreshToken } = this;
        this.instanceUrl = data.instanceUrl || instanceUrl;
        this.accessToken = data.accessToken || accessToken;
        this.refreshToken = data.refreshToken || refreshToken;
    }

    /**
     * Creates a new JSForce connection object that can be used to query/search salesforce.
     *
     * @memberof SalesforceConnection
     */
    createNewJSForceConnection() {
        Logger.system.debug("SalesforceConnection", "Creating a Salesforce Connection.");
        this.conn = new jsforce.Connection({
            instanceUrl: this.instanceUrl,
            accessToken: this.accessToken
        });
        this.emit("connected");
    }

    /**
     * IF a request comes back with "invalid_grant", this function will be invoked. It will send a message to the service, which kicks off the OAuth process.
     *
     * @memberof SalesforceConnection
     */
    requestNewToken() {
        Logger.system.info("SalesforceConnection", "Requesting new salesforce access token.");
        RouterClient.transmit("SalesforceService.reauthenticate", null)
    }

    /**
     * Handler for query and search. If we have an invalid token or were otherwise denied access to the API, we request a new token.
     *
     * @param {any} err
     * @param {any} ret
     * @memberof SalesforceConnection
     */
    handleQueryErrors(err, ret) {
        if (err.message === "Access Declined") {
            Logger.system.log("SalesforceConnection", "Salesforce API error. Checking if token is valid.");
            //token expired.
            this.requestNewToken();
        } else {
            console.error("Unexpected error in salesforce query.")
        }
    }

  /**
     * Wrapper for search. Handles errors and queues the requested callback if there are problems with the request.
     *
     * @param {any} query
     * @param {any} callback
     * @memberof SalesforceConnection
     */
    search(search, callback) {
        this.conn.search(search, (err, ret) => {
            if (err && err.message === "Access Declined") {
                Logger.system.debug("SalesforceConnection", "Access denied on salesforce search. Queuing request until token is refreshed.");
                //token expired.
                var onRefresh = () => {
                    this.conn.query(search, callback);
                    this.removeListener("refreshed", onRefresh);
                }
                this.addListener("refreshed", onRefresh);
                this.handleQueryErrors(err, ret);
            } else {
                callback(err, ret);
            }
        });
    }

    /**
     * Wrapper for query. Handles errors and queues the requested callback if there are problems with the request.
     *
     * @param {any} query
     * @param {any} callback
     * @memberof SalesforceConnection
     */
    query(query, callback) {
        this.conn.query(query, (err, ret) => {
            if (err && err.message === "Access Declined") {
                Logger.system.debug("SalesforceConnection", "Access denied on salesforce query. Queuing request until token is refreshed.");
                //token expired.
                var onRefresh = () => {
                    this.conn.query(query, callback);
                    this.removeListener("refreshed", onRefresh);
                }
                this.addListener("refreshed", onRefresh);
                this.handleQueryErrors(err, ret);
            } else {
                callback(err, ret);
            }
        });
    }


}