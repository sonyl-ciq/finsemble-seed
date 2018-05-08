(() => {
	"use strict";

	// This defaultAuthentication shows a loading gif. If you want the component to be invisible, set 
	// components.defaultAuthentication.window.autoShow to false.

	// Load user configurations from file
	const users = require("./users.json");

	/**
	 * Gets the configuration for a user and applies it to Finsemble application.
	 * 
	 * @param {string} username the username
	 */
	const applyUserConfig = username => {
		// Get user configuration. Replace with get from database/remote service
		const config = users[username];

		if (!config) {
			console.error(`No configuration found for user: ${username}`);
			return;
		}

		// Apply the configuration to Finsemble
		FSBL.Clients.ConfigClient.processAndSet(
			{
				newConfig: config,
				overwrite: true,
				replace: true
			},
			(err, config) => {
				if (err) {
					console.error(err);
					return;
				}

				// Applied successfully, publish authorization and close window
				FSBL.Clients.AuthenticationClient.publishAuthorization(username);
				FSBL.Clients.WindowClient.getCurrentWindow().close();
			});
	};

	window.onload = () => {
		// Fetch the username from the environment variable.
		fin.desktop.System.getEnvironmentVariable("USERNAME", (username) => {
			console.log(`This is the USERNAME value: ${username}`);

			// Fetch the configuration based on username
			// TODO: Fetch configuration from remote service base on username
			username = Object.keys(users)[0];

			// Apply configuration to Finsemble.
			applyUserConfig(username);
		});
	};
})()