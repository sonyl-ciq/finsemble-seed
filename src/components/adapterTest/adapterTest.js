
const FSBLReady = async () => {
	try {
		// Do things with FSBL in here.
		console.log('fsbl')

		const workspace = await FSBL.Clients.WorkspaceClient.getActiveWorkspace();
		console.log('workspacee.data.name',workspace.data.name)
		const workspaceExport = await FSBL.Clients.WorkspaceClient.export({workspaceName: workspace.data.name})
		console.log('workspaceExport',workspaceExport);
	} catch (e) {
		FSBL.Clients.Logger.error(e);
	}
}

if (window.FSBL && FSBL.addEventListener) {
	console.log('fsbl!')
	FSBL.addEventListener("onReady", FSBLReady)
} else {
	console.log('fsbl :(')

	window.addEventListener("FSBLReady", FSBLReady)
}

function setData(key, value) {
	console.log(key,value)
	const combinedKey = this.getCombinedKey(this, params);
	console.log('combinedKey',combinedKey)
	FSBL.Clients.StorageClient.save({ key: 'fsblWorkspaces', value: value, topic: "finsemble.workspace" }, (err, data) => {		
		console.log("StorageClient.set callback invoked");
		if (err) {
			console.error("StorageClient.save error for key", key, err);
		} else {
			console.log("Data saved successfully!");
		}
	});
}

function getData(key) {
	FSBL.Clients.Logger.log('my key is',key);

	FSBL.Clients.StorageClient.get({ topic: 'finsemble.workspace', key: 'fsblWorkspaces' }, (err, data) => {
		console.log("StorageClient.get callback invoked");
		if (err) {
			console.error("StorageClient.get error for key", key, err);
		} else {
			console.log("Data found for", key, "data:", data);
			return data;
		}
	});
}
//The component gets Webpacked. If you don't explictily make the function global, you won't be able to interact with it in the console later on.
window.getData = getData;
window.setData = setData;