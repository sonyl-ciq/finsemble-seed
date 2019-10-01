const { launch, connect } = require('hadouken-js-adapter');

(() => {
	"use strict";

	// #region Imports
	// NPM
	const chalk = require("chalk");
	chalk.enabled = true;
	//setting the level to 1 will force color output.
	chalk.level = 1;
	const async = require("async");
	const { exec, spawn } = require("child_process");
	const ON_DEATH = require("death")({ debug: false });
	const del = require("del");
	const fs = require("fs");
	const gulp = require("gulp");
	const prettyHrtime = require("pretty-hrtime");
	const shell = require("shelljs");
	const path = require("path");
	const webpack = require("webpack");

	const FEA_PATH = path.join(__dirname, "node_modules", "@chartiq", "finsemble-electron-adapter");
	const FEA_PATH_EXISTS = fs.existsSync(FEA_PATH);
	const FEA = FEA_PATH_EXISTS ? require("@chartiq/finsemble-electron-adapter/exports") : undefined;
	const FEAPackager = FEA_PATH_EXISTS ? require("@chartiq/finsemble-electron-adapter/deploy/deploymentHelpers") : undefined;

	// local
	const extensions = fs.existsSync("./gulpfile-extensions.js") ? require("./gulpfile-extensions.js") : undefined;
	const isMacOrNix = process.platform !== "win32";
	// #endregion

	const killApp = (processName, callback = () => { }) => {
		const command = isMacOrNix ? `killall -9 ${processName}` : `taskkill /F /IM ${processName.toLowerCase()}.* /T`;
		const error = isMacOrNix ? "No matching processes belonging to you were found" : `The process "${processName.toLowerCase()}.*" not found.`;

		logToTerminal(`kill: running: ${command}...`);

		exec(command, err => {
			if (err && !err.includes(error)) {
				console.error(errorOutColor(err));
			}

			callback(err);
		});
	};

	const logToTerminal = (msg, color = "white", bgcolor = "bgBlack") => {
		if (!chalk[color]) color = "white";
		if (!chalk[color][bgcolor]) bgcolor = "bgBlack";
		console.log(`[${new Date().toLocaleTimeString()}] ${chalk[color][bgcolor](msg)}.`);
	}

	let angularComponents;
	try {
		angularComponents = require("./build/angular-components.json");
	} catch (ex) {
		logToTerminal("No Angular component configuration found", "yellow");
		angularComponents = null;
	}
	// #region Constants
	const startupConfig = require("./configs/other/server-environment-startup");

	//Force colors on terminals.
	const errorOutColor = chalk.hex("#FF667E");

	// #endregion

	// #region Script variables
	let watchClose;
	// If you specify environment variables to child_process, it overwrites all environment variables, including
	// PATH. So, copy based on our existing env variables.
	const env = process.env;

	if (!env.NODE_ENV) {
		env.NODE_ENV = "development";
	}

	if (!env.PORT) {
		env.PORT = startupConfig[env.NODE_ENV].serverPort;
	}

	// This variable controls whether the build should watch files for changes. This `startsWith` catches all of the
	// tasks that are dev * (dev, dev: fresh, dev: nolaunch), but excludes build:dev because it is intended to only
	// build for a development environment and not watch for changes.
	const isRunningDevTask = process.argv[2].startsWith("dev");

	/**
	 * Returns the value for the given name, looking in (1) environment variables, (2) command line args
	 * and (3) startupConfig. For instance, `set BLAH_BLAH=electron` or `npx gulp dev --blah_blah:electron`
	 * This will search for both all caps, all lowercase and camelcase.
	 * @param {string} name The name to look for in env variables and args
	 * @param {string} defaultValue The default value to return if the name isn't found as an env variable or arg
	 */
	function envOrArg(name, defaultValue) {
		let lc = name.toLowerCase();
		let uc = name.toUpperCase();
		let cc = name.replace(/(-|_)([a-z])/g, function (g) { return g[1].toUpperCase(); });

		// Check environment variables
		if (env[lc]) return env[lc];
		if (env[uc]) return env[uc];

		// Check command line arguments
		lc = "--" + lc + ":";
		uc = "--" + uc + ":";
		let rc = null;
		process.argv.forEach(arg => {
			if (arg.startsWith(lc)) rc = arg.split(lc)[1];
			if (arg.startsWith(uc)) rc = arg.split(uc)[1];
		});

		// Look in startupConfig
		if (!rc) {
			rc = startupConfig[env.NODE_ENV][cc] || startupConfig[env.NODE_ENV][lc] || startupConfig[env.NODE_ENV][uc];
		}
		rc = rc || defaultValue;
		return rc;
	}

	// Currently supported desktop agents include "openfin" and "electron". This can be set either
	// with the environment variable container or by command line argument `npx gulp dev --container:electron`
	let container = envOrArg("container", "openfin");
	container = container.toLowerCase();

	// This is a reference to the server process that is spawned. The server process is located in server/server.js
	// and is an Express server that runs in its own node process (via spawn() command).
	let serverProcess = null;

	// This will get set when the container (Electron or Openfin) is launched. This is used to calculate how long it takes to start up the app.
	let launchTimestamp = 0;

	// #endregion

	// #region Task Methods
	/**
	 * Object containing all of the methods used by the gulp tasks.
	 */
	const taskMethods = {
		/**
		 * Attach some variables to the taskMethods so that they are available to gulp-extensions.
		 */
		distPath: path.join(__dirname, "dist"),
		srcPath: path.join(__dirname, "src"),
		startupConfig: startupConfig,

		/**
		 * Builds the application in the distribution directory. Internal only, don't use because no environment is set!!!!
		 */
		build: done => {
			async.series([
				taskMethods.buildWebpack,
				taskMethods.buildSass,
				taskMethods.buildAngular
			], done);
		},
		buildAngular: done => {
			if (!angularComponents) return done();
			let processRow = row => {
				const compName = row.source.split("/").pop();
				const cwd = path.join(__dirname, row.source);
				const outputPath = path.join(__dirname, row.source, row["output-directory"]);
				const command = `ng build --base-href "/angular-components/${compName}/" --outputPath "${outputPath}"`;

				// switch to components folder
				const dir = shell.pwd();
				shell.cd(cwd);
				logToTerminal(`Executing: ${command}\nin directory: ${cwd}`);

				const output = shell.exec(command);
				logToTerminal(`Built Angular Component, exit code = ${output.code}`, "green");
				shell.cd(dir);
			};

			if (angularComponents) {
				angularComponents.forEach(comp => {
					processRow(comp);
				});
			} else {
				logToTerminal("No Angular components found to build", "yellow");
			}

			done();
		},
		"build:dev": done => {
			async.series([
				taskMethods.setDevEnvironment,
				taskMethods.build
			], done);
		},
		"build:prod": done => {
			async.series([
				taskMethods.setProdEnvironment,
				taskMethods.build
			], done);
		},
		/**
		 * Builds the SASS files for the project.
		 */
		buildSass: done => {
			return done();
		},
		/**
		 * Builds files using webpack.
		 */
		buildWebpack: done => {
			logToTerminal(`Starting webpack. Environment:"${process.env.NODE_ENV}"`)
			//Helper function that builds webpack, logs errors, and notifies user of start/finish of the webpack task.
			function packFiles(config, bundleName, callback) {
				logToTerminal(`Starting to build ${bundleName}`);
				config.watch = isRunningDevTask;
				config.bail = true; // Causes webpack to break upon first encountered error. Pretty annoying when build errors scroll off the screen.
				let startTime = process.hrtime();
				webpack(config, (err, stats) => {
					if (!err) {
						let msg = `Finished building ${bundleName}`;
						//first run, add nice timer.
						if (callback) {
							let end = process.hrtime(startTime);
							msg += ` after ${chalk.magenta(prettyHrtime(end))}`;
						}
						logToTerminal(msg, "cyan");
					} else {
						console.error(errorOutColor("Webpack Error.", err));
					}
					if (stats.hasErrors()) {
						console.error(errorOutColor(stats.toJson().errors));
					}
					// Webpack will call this function every time the bundle is built.
					// Webpack is run in "watch" mode which means this function will be called over and over and over.
					// We only want to invoke the async callback back to the gulp file once - the initial webpack build.
					if (callback) {
						callback();
						callback = undefined;
					}
				});
			}

			//Requires are done in the function because webpack.components.js will error out if there's no vendor-manifest. The first webpack function generates the vendor manifest.
			async.series([
				(cb) => {
					const webpackAdaptersConfig = require("./build/webpack/webpack.adapters");
					packFiles(webpackAdaptersConfig, "adapters bundle", cb);
				},
				(cb) => {
					const webpackVendorConfig = require("./build/webpack/webpack.vendor.js")
					packFiles(webpackVendorConfig, "vendor bundle", cb);
				},
				(cb) => {
					const webpackPreloadsConfig = require("./build/webpack/webpack.preloads.js")
					packFiles(webpackPreloadsConfig, "preload bundle", cb);
				},
				(cb) => {
					const webpackTitleBarConfig = require("./build/webpack/webpack.titleBar.js")
					packFiles(webpackTitleBarConfig, "titlebar bundle", cb);
				},
				(cb) => {
					const webpackServicesConfig = require("./build/webpack/webpack.services.js")
					if (webpackServicesConfig) {
						packFiles(webpackServicesConfig, "services bundle", cb);
					} else {
						cb();
					}
				},
				(cb) => {
					const webpackComponentsConfig = require("./build/webpack/webpack.components.js")
					packFiles(webpackComponentsConfig, "component bundle", cb);
				}
			],
				done
			);
		},

		/**
		 * Cleans the project folder of generated files.
		 */
		clean: done => {
			del(taskMethods.distPath, { force: true });
			del(".babel_cache", { force: true });
			del(path.join(__dirname, "build/webpack/vendor-manifest.json"), { force: true });
			del(".webpack-file-cache", { force: true });
			done();
		},
		checkSymbolicLinks: done => {
			const FINSEMBLE_PATH = path.join(__dirname, "node_modules", "@chartiq", "finsemble");
			const FINSEMBLE_VERSION = require(path.join(FINSEMBLE_PATH, "package.json")).version;
			const CLI_PATH = path.join(__dirname, "node_modules", "@chartiq", "finsemble-cli");
			const CLI_VERSION = require(path.join(CLI_PATH, "package.json")).version;
			const CONTROLS_PATH = path.join(__dirname, "node_modules", "@chartiq", "finsemble-react-controls");
			const CONTROLS_VERSION = require(path.join(CONTROLS_PATH, "package.json")).version;

			// Check version before require so optionalDependency can stay optional
			const FEA_VERSION = FEA_PATH_EXISTS ? require(path.join(FEA_PATH, "package.json")).version : undefined;

			function checkLink(params, cb) {
				let { path, name, version } = params;
				if (fs.existsSync(path)) {
					fs.readlink(path, (err, str) => {
						if (str) {
							logToTerminal(`LINK DETECTED: ${name}. @Version ${version} Path: ${str}.`, "yellow");
						} else {
							logToTerminal(`Using: @chartiq/${name} @Version ${version}`, "magenta");
						}
						cb();
					});
				} else {
					logToTerminal(`MISSING FINSEMBLE DEPENDENCY!: ${name}.\nPath: ${path}`, "red");
					process.exit(1);
				}
			};
			async.parallel([
				(cb) => {
					checkLink({
						path: FINSEMBLE_PATH,
						name: "finsemble",
						version: FINSEMBLE_VERSION
					}, cb)
				},
				(cb) => {
					checkLink({
						path: CLI_PATH,
						name: "finsemble-cli",
						version: CLI_VERSION
					}, cb)
				},
				(cb) => {
					checkLink({
						path: CONTROLS_PATH,
						name: "finsemble-react-controls",
						version: CONTROLS_VERSION
					}, cb)
				},
				(cb) => {
					if (!FEA_VERSION) {
						// electron not found so skip check
						return cb();
					}

					checkLink({
						path: FEA_PATH,
						name: "finsemble-electron-adapter",
						version: FEA_VERSION
					}, cb)
				}
			], done)
		},

		/**
		 * Builds the application, starts the server, launches the Finsemble application and watches for file changes.
		 */
		"dev": done => {
			async.series([
				taskMethods["build:dev"],
				taskMethods.startServer,
				taskMethods.launchApplication
			], done);
		},
		/**
		 * Wipes the babel cache and webpack cache, clears dist, rebuilds the application, and starts the server.
		 */
		"dev:fresh": done => {
			async.series([
				taskMethods.setDevEnvironment,
				taskMethods.rebuild,
				taskMethods.startServer,
				taskMethods.launchApplication
			], done);
		},
		/**
		 * Builds the application and runs the server *without* launching openfin.
		 */
		"dev:noLaunch": done => {
			async.series([
				taskMethods["build:dev"],
				taskMethods.startServer
			], done);
		},
		launchOpenFin: async (done) => {
			ON_DEATH(() => {
				killApp("OpenFin", () => {
					if (watchClose) watchClose();
					process.exit();
				});
			});
			try {
				const manifestUrl = taskMethods.startupConfig[env.NODE_ENV].serverConfig;
				// Once the server is running we can launch OpenFin and retrieve the port.
				const port = await launch({ manifestUrl });
				// Use the port to connect and determine when OpenFin exists.
				const fin = await connect({
					uuid: 'server-connection',
					// Connect to the given port.
					address: `ws://localhost:${port}`,
					// We want OpenFin to exit as our application exists.
					nonPersistent: true
				});
				if (watchClose) watchClose();
				// Once OpenFin exits we shut down the server.
				fin.once('disconnected', process.exit);
			} catch (error) {
				console.error(`Unable to launch and connect to OpenFin: ${error.message}`);
				process.exit();
			}

			if (done) done();
		},
		launchElectron: done => {
			const cfg = taskMethods.startupConfig[env.NODE_ENV];
			const USING_ELECTRON = container === "electron";
			if (USING_ELECTRON && !FEA_PATH_EXISTS) {
				throw "Cannot use electron container unless finsemble-electron-adapter optional dependency is installed. Please run npm i @chartiq/finsemble-electron-adapter";
			}

			let config = {
				manifest: cfg.serverConfig,
				chromiumFlags: JSON.stringify(cfg.chromiumFlags),
			}

			// set breakpointOnStart variable so FEA knows whether to pause initial code execution
			process.env.breakpointOnStart = cfg.breakpointOnStart;

			if (!FEA) {
				console.error("Could not launch ");
				process.exit(1);
			}

			return FEA.e2oLauncher(config, done);
		},
		makeInstaller: async (done) => {
			if (!env.NODE_ENV) throw new Error("NODE_ENV must be set to generate an installer.");
			function resolveRelativePaths(obj, properties, rootPath) {
				properties.forEach(prop => {
					obj[prop] = path.resolve(rootPath, obj[prop]);
				});
				return obj;
			}

			// Inline require because this file is so large, it reduces the amount of scrolling the user has to do.
			let installerConfig = require("./configs/other/installer.json");

			// need absolute paths for certain installer configs
			installerConfig = resolveRelativePaths(installerConfig, ['icon'], './');

			const manifestUrl = taskMethods.startupConfig[env.NODE_ENV].serverConfig;
			let updateUrl = taskMethods.startupConfig[env.NODE_ENV].updateUrl;
			const chromiumFlags = taskMethods.startupConfig[env.NODE_ENV].chromiumFlags;

			// Installer won't work without a proper manifest. Throw a helpful error.
			if (!manifestUrl) {
				throw new Error(`Installer misconfigured. No property in 'serverConfig' in configs/other/server-environment-startup.json under ${env.NODE_ENV}. This is required in order to generate the proper config.`)
			}

			// If an installer is pointing to localhost, it's likely an error. Let the dev know with a helpful error.
			if (manifestUrl.includes("localhost")) {
				logToTerminal(`>>>> WARNING: Installer is pointing to a manifest hosted at ${manifestUrl}. Was this accidental?
				NODE_ENV: ${env.NODE_ENV}`, "yellow");
			}

			// UpdateURL isn't required, but we let them know in case they're expecting it to work.
			if (!updateUrl) {
				logToTerminal(`[Info] Did not find 'updateUrl' in configs/other/server-environment-startup.json under ${env.NODE_ENV}. The application will still work, but it will not update itself with new versions of the finsemble-electron-adapter.`, "white");
				updateUrl = null;
			}

			if (!FEAPackager) {
				console.error("Cannot create installer because Finsemble Electron Adapter is not installed");
					process.exit(1);
			}

			await FEAPackager.setManifestURL(manifestUrl);
			await FEAPackager.setUpdateURL(updateUrl);
			await FEAPackager.setChromiumFlags(chromiumFlags || {});
			await FEAPackager.createFullInstaller(installerConfig);
			done();
		},
		launchApplication: done => {
			logToTerminal("Launching Finsemble", "black", "bgCyan");

			launchTimestamp = Date.now();
			if (container === "openfin") {
				taskMethods.launchOpenFin(done);
			} else {
				taskMethods.launchElectron(done);
			}
		},

		logToTerminal: (...args) => logToTerminal.apply(this, args),

		envOrArg: (...args) => envOrArg.apply(this, args),

		/**
		 * Starts the server, launches the Finsemble application. Use this for a quick launch, for instance when working on finsemble-electron-adapter.
		 */
		"nobuild:dev": done => {
			async.series([
				taskMethods.setDevEnvironment,
				taskMethods.startServer,
				taskMethods.launchApplication
			], done);
		},

		/**
		 * Method called after tasks are defined.
		 * @param done Callback function used to signal function completion to support asynchronous execution. Can
		 * optionally return an error, if one occurs.
		 */
		post: done => { done(); },

		/**
		 * Method called before tasks are defined.
		 * @param done Callback function used to signal function completion to support asynchronous execution. Can
		 * optionally return an error, if one occurs.
		 */
		pre: done => {
			taskMethods.checkSymbolicLinks();
			done();
		},

		/**
		 * Builds the application, starts the server and launches openfin. Use this to test production mode on your local machine.
		 */
		prod: done => {
			async.series([
				taskMethods["build:prod"],
				taskMethods.startServer,
				taskMethods.launchApplication
			], done);
		},
		/**
		 * Builds the application in production mode and starts the server without launching openfin.
		 */
		"prod:nolaunch": done => {
			async.series([
				taskMethods["build:prod"],
				taskMethods.startServer
			], done);
		},
		rebuild: done => {
			async.series([
				taskMethods.clean,
				taskMethods.build
			], done);
		},
		/**
		 * Launches the server in dev environment. No build, no openfin launch.
		 */
		server: done => {
			async.series([
				taskMethods.setDevEnvironment,
				taskMethods.startServer
			], done);
		},
		/**
		 * Launches the server in prod environment. No build, no openfin launch.
		 */
		"server:prod": done => {
			async.series([
				taskMethods.setProdEnvironment,
				taskMethods.startServer
			], done);
		},
		/**
		 * Starts the server.
		 *
		 * @param {function} done Function called when execution has completed.
		 */
		startServer: done => {
			const serverPath = path.join(__dirname, "server", "server.js");

			serverProcess = spawn(
				"node",
				[
					serverPath,
					{
						stdio: "inherit"
					}
				],
				{
					env: env,
					stdio: [
						process.stdin,
						process.stdout,
						"pipe",
						"ipc"
					]
				}
			);

			serverProcess.on("message", data => {
				if (!data || !data.action) {
					console.log("Unproperly formatted message from server:", data);
					return;
				}
				if (data.action === "serverStarted") {
					done();
				} else if (data.action === "serverFailed") {
					process.exit(1);
				} else if (data.action === "timestamp") {
					// The server process can send timestamps back to us. We will output the results here.
					let duration = (data.timestamp - launchTimestamp) / 1000;
					logToTerminal(`${data.milestone} ${duration}s after launch`);
				} else {
					console.log("Unhandled message from server: ", data);
				}
			});

			serverProcess.on("exit", code => logToTerminal(`Server closed: exit code ${code}`, "magenta"));

			// Prints server errors to your terminal.
			serverProcess.stderr.on("data", data => { console.error(errorOutColor(`ERROR: ${data}`)); });
		},

		setDevEnvironment: done => {
			process.env.NODE_ENV = "development";
			done();
		},

		setProdEnvironment: done => {
			process.env.NODE_ENV = "production";
			done();
		}
	};
	// #endregion

	// Update task methods with extensions
	if (extensions) {
		extensions(taskMethods);
	}

	// #region Task definitions
	const defineTasks = err => {
		if (err) {
			console.error(errorOutColor(err));
			process.exit(1);
		}

		// Convert every taskMethod into a gulp task that can be run
		for (var taskName in taskMethods) {
			var task = taskMethods[taskName];
			if (typeof task === "function") gulp.task(taskName, taskMethods[taskName]);
		}

		// By default run dev
		gulp.task("default", taskMethods["dev"]);

		taskMethods.post(err => {
			if (err) {
				console.error(errorOutColor(err));
				process.exit(1);
			}
		});
	}
	// #endregion

	// Run anything that we need to do before the gulp task is run
	taskMethods.pre(defineTasks);
})();
