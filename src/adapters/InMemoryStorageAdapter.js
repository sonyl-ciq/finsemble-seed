/*
* The baseStorage model provides several utility functions, such as `getCombinedKey`, which will produce a compound key string (for use with a simple key:value store) incorporating the username, topic, and key. For example: For the default user, Finsemble topic and activeWorkspace key: `Finsemble:defaultUser:finsemble:activeWorkspace.`
.
*/
var BaseStorage = require("@chartiq/finsemble").models.baseStorage;
var { Clients: { Logger } } = require("@chartiq/finsemble");
//Because calls to this storage adapter will likely come from many different windows, we will log successes and failures in the central logger.
Logger.start();

const InMemoryStorageAdapter = function () {
	// #region Initializes a new instance of the InMemoryStorageAdapter.
	BaseStorage.call(this, arguments);

	this.myStorage = {};

	this.save = (params, cb) => {
		//Retrieves a key that looks like this:
		//applicationUUID:userName:topic:key
		const combinedKey = this.getCombinedKey(this, params);

		//Assign the value to the key on our storage object.
		this.myStorage[combinedKey] = params.value;

		return cb(null, { status: "success" });
	};

	this.get = (params, cb) => {
		const combinedKey = this.getCombinedKey(this, params);
		const data = this.myStorage[combinedKey];
		let err = null;
		if (!data) {
			err = `No data found for key ${params.key}`
		}
		return cb(err, data);
	};

	/**
	 * Returns all keys that we're saving data for.
	 * @param {*} params
	 * @param {*} cb
	 */
	this.keys = (params, cb) => {
		//need to implement
		return cb(null);
	};

	/**
	 * Delete method.
	 * @param {object} params
	 * @param {string} params.topic A topic under which the data should be stored.
	 * @param {string} params.key The key whose value is being deleted.
	 * @param {function} cb callback to be invoked upon completion
	 */
	this.delete = (params, cb) => {
		//need to implement
		cb(err, null);
	};

	/**
	 * This method should be used very, very judiciously. It's essentially a method designed to wipe the database for a particular user.
	 */
	this.clearCache = (params, cb) => {
		//need to implement
		return cb();
	};

	/**
	 * Wipes the storage container.
	 * @param {function} cb
	 */
	this.empty = (cb) => {
		//todo need to implement
	};
}

new InMemoryStorageAdapter("InMemoryStorageAdapter");