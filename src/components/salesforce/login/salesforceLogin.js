
if (window.FSBL && FSBL.addEventListener) { 
	FSBL.addEventListener("onReady", FSBLReady); 
} else { 
	window.addEventListener("FSBLReady", FSBLReady); 
}

function FSBLReady (){
	var $ = require('../common/js/jQuery');

	if (window.mindControl) {
		console.warn('Duplicate Injection');
		return;
	}
	let cookies = require("../common/js/jscookie");
	window.mindControl = true;
	var signOnKey = 'salesforce';
	function clearCookies() {
		let cookieKeys = cookies.get();
		for (key in cookieKeys) {
			console.log("Removing ", key);
			cookies.remove(key);
		}
	}
	if (FSBL.Clients.WindowClient.options && FSBL.Clients.WindowClient.options.customData) {


		//If we've failed logging in 4 times, we show an error message saying 'sorry, it's broken.'
		if (FSBL.Clients.WindowClient.options.customData.showErrorScrim) {
			FSBL.Clients.WindowClient.injectHeader();
			let style = `.fsbl-share-scrim {
				font-size: 22px !important;
			}`
			var styleNode = document.createElement("style");
			styleNode.type = "text/css";
			styleNode.appendChild(document.createTextNode(style));
			document.body.appendChild(styleNode);
			let div = document.createElement('div');

			div.className = "fsbl-share-scrim";
			let msg = document.createElement('div');
			msg.className = "error-message";
			msg.innerText = "We are having trouble connecting to Salesforce right now. Restart your computer or try again later. Contact support if you continue to experience issues."
			div.appendChild(msg);
			document.body.appendChild(div);
		}
	}

	function getQueryVariable(variable) {
		var query = window.location.search.substring(1);
		var vars = query.split("&");
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			if (pair[0] == variable) { return pair[1]; }
		}
		return (false);
	}

	if (location.href.includes('identity/verification')) {
		cb('Two Step Verification')
		return;
	}
	let errorText = $("#error").text();
	let queryError = getQueryVariable("error");
	let queryErrorDescription = getQueryVariable("error_description");
	console.log(queryError, queryErrorDescription)

	if (queryError) {
		clearCookies();
		// window.location = FSBL.Clients.WindowClient.options.customData.authorizationUrl;

		FSBL.Clients.AuthenticationClient.completeOAUTH(queryError, null, () => {
			FSBL.Clients.WindowClient.close();
		});
	} else {
		FSBL.Clients.WindowClient.getComponentState({ field: 'loginRequested' }, function (err, state) {
			if (state && state.activeLogin) {
				if (state.validationRequired) {
					FSBL.Clients.AuthenticationClient.appAcceptSignOn(signOnKey);
					//cb(null);
					return;
				}
				FSBL.Clients.WindowClient.setComponentState(
					{
						field: 'loginRequested', value: { activeLogin: false, validationRequired: false }
					},
					function () {
						//	cb(null);
					});
			} else { //active session already
				//	cb(null);
			}
		});
	}
}