const path = require("path");
const fs = require("fs");
const PORT = process.env.PORT || 3375;
const chalk = require('chalk');
const compression = require("compression");
const express = require("express");
const https = require('https');
const bodyParser = require("body-parser");

const rootDir = path.join(__dirname, "..", "dist");
const moduleDirectory = path.join(__dirname, "..", "finsemble");
const options = {};

const logToTerminal = (msg, color = "white", bgcolor = "bgBlack") => {
    if (!chalk[color]) color = "white";
    if (!chalk[color][bgcolor]) bgcolor = "bgBlack";
    console.log(`[${new Date().toLocaleTimeString()}] ${chalk[color][bgcolor](msg)}.`);
}

const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs/localhost.chartiq.com.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.chartiq.com.crt')),
    ca: fs.readFileSync(path.join(__dirname, 'certs/intermediate.crt')),
    requestCert: false,
    rejectUnauthorized: false
};

(module => {
    "use strict";
    
        module.exports = {
            /**
             * Method called before starting the server.
             * 
             * @param done Function used to signal when pre function has finished. Can optionally pass an error message if 
             * one occurs.
             */
            pre: done => { console.log("pre server startup"); done(); },
    
            /**
             * Method called after the server has started.
             * 
             * @param done Function used to signal when pre function has finished. Can optionally pass an error message if 
             * one occurs.
             */
            post: done => { console.log("post server startup"); done(); },
    
            /**
             * Method called to update the server.
             * 
             * @param {express} app The express server.
             * @param {function} cb The function to call once finished adding functionality to the server. Can optionally 
             * pass an error message if one occurs.
             */
            updateServer: (app, cb) => { console.log("modifying server");

                app.use(bodyParser.urlencoded({
                    extended: true
                }));
            
                const shouldCompress = (req, res) => {
                    if (req.originalUrl.toLowerCase().includes("installers")) {
                        // don't compress responses from the installers folder
                        return false
                    }
            
                    // fallback to standard filter function
                    return compression.filter(req, res)
                }
            
                app.use(compression({ filter: shouldCompress }));

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
                
                // Log all requests coming in, for debugging purposes
                app.use("*", (req, res, next) => {
                    console.log(req.originalUrl);
                    next();
                });
                
                var server = https.createServer(sslOptions, app);
                
                server.listen(PORT, function () {
                    // Salesforce server plugin
                    let salesforceServerSetup = require("./salesforce/server");
                    salesforceServerSetup({ app });
            
                    global.host = server.address().address;
                    global.port = server.address().port;
                    logToTerminal(`Salesforce server extension running.`);
                });

				cb();
            }
        }
    })(module);