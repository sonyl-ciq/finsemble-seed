#!/usr/bin/env node

/*!
* Copyright 2017 by ChartIQ, Inc.
* All rights reserved.
*/

//This file is referenced in the environment switching tutorial

(() => {
	"use strict";
	if (!process.send) process.send = console.log;
	// #region Imports
	// NPM
	const chalk = require("chalk");
	const errorColor = chalk.red;
	const outputColor = chalk.white;
	chalk.enabled = true;
	//force color output
	chalk.level = 1;
	const express = require("express");
	const fs = require("fs");
	const path = require("path");
	const compression = require("compression");
	// Local

	const handleError = e => {
		if (e) {
			console.error(e);
			process.send({ "action": "serverFailed" });
			process.exit(1);
		}
	}

	const extensions = fs.existsSync(path.join(__dirname, "server-extensions.js")) ?
		require("./server-extensions") :
		{
			/**
			 * Method called before starting the server.
			 *
			 * @param {function} done Function can take one argument; an error message if one occurred.
			 			 * @example
			 * const pre => {
			 * 	try {
			 * 		// do something that could throw an error
			 *  } catch(e) {
			 *		done(e);
			 *  }
			 * }*/
			pre: done => { done(); },

			/**
			 * Method called after the server has started.
			 *
			 * @param {function} done Function can take one argument; an error message if one occurred.
			 *
			 * @example
			 * const post => {
			 * 	try {
			 * 		// do something that could throw an error
			 *  } catch(e) {
			 *		done(e);
			 *  }
			 * }
			 */
			post: done => { done(); },

			/**
			 * Method called to update the server.
			 *
			 * @param {express} app The express server.
			 * @param {function} cb The function to call once finished adding functionality to the server.
			 * @example
			 * const cb => {
			 * 	try {
			 * 		// do something that could throw an error
			 *  } catch(e) {
			 *		done(e);
			 *  }
			 * }*/
			updateServer: (app, cb) => {
				const server = app.listen(
					PORT,
					e => {
						handleError(e);

						logToTerminal(outputColor(`Listening on port ${PORT} `));

						global.host = server.address().address;
						global.port = server.address().port;
					});

				app.use(compression());

				// Sample server root set to "/" -- must align with paths throughout
				app.use("/", express.static(rootDir, options));
				// Open up the Finsemble Components,services, and clients
				app.use("/finsemble", express.static(moduleDirectory, options));
				app.use("/installers", express.static(path.join(__dirname, "..", "installers"), options));
				// For Assimilation
				app.use("/hosted", express.static(path.join(__dirname, "..", "hosted"), options));

				// configs/openfin/manifest-local.json and configs/other/server-environment-startup.json
				// Make the config public
				app.use("/configs", express.static("./configs", options));
				app.use("/pkg", express.static('./pkg', options));
				cb();
			}
		};
	// #endregion

	// #region Constants
	const app = express();
	const rootDir = path.join(__dirname, "..", "dist");
	const moduleDirectory = path.join(__dirname, "..", "finsemble");
	const ONE_DAY = 24 * 3600 * 1000;
	const cacheAge = process.env.NODE_ENV === "development" ? 0 : ONE_DAY;
	const PORT = process.env.PORT || 3375;
	// #endregion
	const logToTerminal = (msg, color = "white", bgcolor = "bgBlack") => {
		if (!chalk[color]) color = "white";
		if (!chalk[color][bgcolor]) bg = "black";
		console.log(`[${new Date().toLocaleTimeString()}] ${chalk[color][bgcolor](msg)}.`);
	}

	logToTerminal(outputColor(`Server serving from ${rootDir} with caching maxAge = ${cacheAge} ms.`));

	let options = { maxAge: cacheAge };
	//This will prevent config files from being cached by the server, allowing an application restart instead of a rebuild.
	if (cacheAge === 0) {
		options.setHeaders = function (res, path, stat) {
			res.set("cache-control", "no-cache")
		}
	}
	logToTerminal(outputColor("Starting Server"));
	if (process.env.NODE_ENV === "development") {
		//Listens for the first time that the config and the serviceManager are retrieved, and logs output to the console.
		let notified_config = false, notified_sm = false;
		let serviceManagerRetrievedTimeout;
		app.get("/configs/openfin/manifest-local.json", (req, res, next) => {
			if (!notified_config) {

				// Send a timestamp back to the parent process
				process.send({ "action": "timestamp", "milestone": "Application manifest retrieved", "timestamp": Date.now() });
				notified_config = true;
				serviceManagerRetrievedTimeout = setTimeout(() => {
					logToTerminal(errorColor(`ERROR: Finsemble application manifest has been retrieved from the server, but the Finsemble Service Manager has not. This can be caused by a slow internet connection (e.g., downloading assets). This can also be a symptom that you have a hanging openfin process. Please inspect your task manager to ensure that there are no lingering processes. Alternatively, run 'finsemble-cli kill'`))
				}, 10000);
			}
			next();
		});

		app.get("/finsemble/components/system/serviceManager/serviceManager.html", (req, res, next) => {
			if (!notified_sm) {
				clearTimeout(serviceManagerRetrievedTimeout);

				// Send a timestamp back to the parent process
				process.send({ "action": "timestamp", "milestone": "Application started", "timestamp": Date.now() });
				notified_sm = true;
			}
			next();
		});

		app.get("/file/txt", (req, res, next) => {
			res.download(`${__dirname}/../assets/files/test.txt`)
		})

	}
	/**
	 * Builds the server.
	 *
	 * @param {string} err Error message, if an error occurred.
	 */
	const buildServer = err => {
		if (err) {
			console.error(err);
			return;
		}

		extensions.updateServer(app, err => {
			handleError(err);
			const done = () => {
				logToTerminal(chalk.green("Server started"));
				extensions.post(err => {
					if (err) {
						handleError(err);
					} else {
						process.send({ "action": "serverStarted" });
					}
				});
			};
			done();
		});
	}

	extensions.pre(buildServer);
})();
