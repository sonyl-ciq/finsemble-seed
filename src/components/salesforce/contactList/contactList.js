let sfConfig = require('../common/js/common.config.json');
let common = require('../common/js/common.js');

sfConfig.lightning_component = 'c:FinsembleContactsList';
window.addEventListener('sf:data-received', tryRender)

function tryRender(e) {
	window.removeEventListener('sf:data-received', tryRender);
	let colLabels = e.detail.headerDefs.map((def) => {
		return {
			title: def.label,
			data: def.name,
			render: (data, type, row, meta) => {
				val = common.getValueFromObjectByString(row, def.name);
				if (val) {
					if (def.type === "reference") {
						if (def.value) {
							return `<a data-recordid="${common.getValueFromObjectByString(row, def.value)}">${val}</a>`
						} else {
							return `<a href="${val}">${val}<a>`
						}
					} else {
						return val;
					}
				} else {
					return "";
				}

			}
		}
	})
	var table = $("#dataTable").DataTable({
		data: e.detail.records,
		columns: colLabels,
		responsive: true
	});
	common.swapClicks(table);

}
var headerDefs = [{
	label: 'Name',
	name: 'Name',
	type: 'reference',
	value: 'Id'
},
{
	label: 'Account Name',
	name: 'Account.Name',
	type: 'reference',
	value: 'Account.Id'
},
{
	label: 'Account Site',
	name: 'Account.Site'
},
{
	label: 'Phone',
	name: 'Phone',
	type: 'phone'
},
{
	label: 'Email',
	name: 'Email',
	type: 'phone'
},
{
	label: 'Contact Owner',
	name: 'Owner.Name'
	}];

	const SalesforceConnection = require("../salesforceConnection").default;

	if (window.FSBL && FSBL.addEventListener) { 
		FSBL.addEventListener("onReady", FSBLReady); 
	} else { 
		window.addEventListener("FSBLReady", FSBLReady) 
	}

	function FSBLReady (){
		let MyConnection = new SalesforceConnection(null, FSBL.Clients.RouterClient);
		MyConnection.onConnected(() => {
			MyConnection.query('SELECT Id, Name, Contact.Account.Name, Contact.Account.Site, Contact.Account.Id, Phone, Email, Contact.Owner.Name FROM Contact ORDER BY Name ASC', (err, res) => {
				let evt = new CustomEvent('sf:data-received', {
					detail: {
						records: res.records,
						headerDefs: headerDefs
					}
				});
				window.dispatchEvent(evt);
				document.getElementById('record-icon').innerHTML = common.getIconForRecordType('Contact', true)
				setTimeout(function () {
					document.querySelector('#loadingWrapper').style = 'display:none';
					document.querySelector('#lightningLocator').style = '';
					window.SalesforceHasRendered = true;
				}, 400);
			});
		});

		MyConnection.onConnectionError(() => {
			document.querySelector('#loadingWrapper').style = 'display:none';
		});

		FSBL.Clients.WindowClient.setWindowTitle('Salesforce Contacts');
	}
