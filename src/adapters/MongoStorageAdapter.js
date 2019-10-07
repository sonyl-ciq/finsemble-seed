/*
* The baseStorage model provides several utility functions, such as `getCombinedKey`, which will produce a compound key string (for use with a simple key:value store) incorporating the username, topic, and key. For example: For the default user, Finsemble topic and activeWorkspace key: `Finsemble:defaultUser:finsemble:activeWorkspace.`
.
*/
const BaseStorage = require("@chartiq/finsemble").models.baseStorage;
const { Clients: { Logger } } = require("@chartiq/finsemble");

const baseURL = "http://localhost:3001";

//Because calls to this storage adapter will likely come from many different windows, we will log successes and failures in the central logger.
Logger.start();

const MongoStorageAdapter = function () {
	// #region Initializes a new instance of the InMemoryStorageAdapter.
	BaseStorage.call(this, arguments);

	this.myStorage = {};

	this.save = (params, cb) => {
		console.log(`Saving ${params}`)
		/*//Retrieves a key that looks like this:
		//applicationUUID:userName:topic:key
		const combinedKey = this.getCombinedKey(this, params);

		//Assign the value to the key on our storage object.
		this.myStorage[combinedKey] = params.value;
		console.log('mystorage', this.myStorage)
		return cb(null, { status: "success" });*/

		const combinedKey = this.getCombinedKey(this, params);
		console.log(combinedKey)
		fetch(baseURL + "/save", {
			method: 'POST',
			body: JSON.stringify(combinedKey),
			headers: {
				'Content-Type': 'application/json'
			}
		})
		.then(response => {
			console.log(response.json());
		});
		
	};


	
/*
const request = async () => {
    const response = await fetch('https://api.com/values/1');
    const json = await response.json();
    console.log(json);
}

request();
*/

	this.get = async (params, cb) => {
		console.log('get')

		const data = await fetch(baseURL + `/get?topic=${params.topic}&key=${params.key}`);		
		let returnValue;
		let err;
		try {
			returnValue = await data.json();
		} catch(e) {
			err = `No data found for key ${params.key}, ${e}`	
			const workspace = await FSBL.Clients.WorkspaceClient.createWorkspace();
			const name = await workspace.name();
			console.log('workspacename',name);
			
			this.save(workspace, (e) => {
				console.log(e)
			});
		}
		



		return cb(err, returnValue);
	};

	/**
	 * Returns all keys that we're saving data for.
	 * @param {*} params
	 * @param {*} cb
	 */
	this.keys = (params, cb) => {
		this.get('keys',null)
		return cb(null);
	};

	/**
	 * Delete method.
	 * @param {object} params
	 * @param {string} params.topic A topic under which the data should be stored.
	 * @param {string} params.key The key whose value is being deleted.
	 * @param {function} cb callback to be invoked upon completion
	 */

/*	this.get = async (params, cb) => {
		const data = await fetch(baseURL + `/get?topic=${params.topic}&key=${params.key}`);
		const returnValue = await data.json();
		return cb(null, returnValue);
	};*/

	this.delete = async (params, cb) => {
		const data = await fetch(baseURL + "/delete", {
			method: 'DELETE',
			body: JSON.stringify(params),
			headers: {
				'Content-Type': 'application/json'
			}
			
		});
		const returnValue = await data.json();
		Logger.log('delete',returnValue)
		cb(err, null);
	};

	/**
	 * This method should be used very, very judiciously. It's essentially a method designed to wipe the database for a particular user.
	 */
	this.clearCache = (params, cb) => {
		//need to implement
		this.get('clearCache',null)
		return cb();
	};

	/**
	 * Wipes the storage container.
	 * @param {function} cb
	 */
	this.empty = (cb) => {
		this.get('empty',null)
		//todo need to implement
	};
}

new MongoStorageAdapter("MongoStorageAdapter");