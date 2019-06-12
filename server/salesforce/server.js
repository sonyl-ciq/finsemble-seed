const express = require("express");
const jsforce = require("jsforce");
const path = require("path");
var app;

const SALESFORCE_SECRET = '276799787349052072';
const CLIENT_ID = '3MVG9zlTNB8o8BA1I4NIH8YcOPcorXzXvGcxzl554nhiWcIVtXjiXyd6wQTQxbSvzmC4CkR5mETAcll5q9CQR';

/**
*
*
* @param {any} params
*/
function main(params) {
    if (params !== undefined) {
        app = params.app;
    } else {
        console.log("create server..........")
        app = express();
        var server = require('http').createServer(app);
        server.listen(3375);
    }

    /*****************************************************************
    *                          AUTHENTICATION
    ******************************************************************/

    function handleErrorsAndRequestReauthorization(err, expressParams, functionName) {
        let { req, res } = expressParams
        if (err) {
            let errMessage = `Error in ${functionName}, ${JSON.stringify(err)}`;
            console.log("Requesting reauthorization.", errMessage);
            res.status(500).send({ error: errMessage });
        }
    }

    app.all('/salesforce/oauth2/OAuthBackchannel', function (req, res) {
        var hostname = req.headers.host;
        // If behind a proxy, then the hostname will be in the forwarded headers
        if (req.headers["x-forwarded-host"]) hostname = req.headers["x-forwarded-host"];

        // req.body.redirect_uri will contain the uri requested by our client, but how do we know it's not spoofed?
        // Instead, we'll generate the redirect_uri ourselves, knowing that it should be on this host.
        const REDIRECT_URI = `https://${hostname}/components/salesforce/oauth2/authed.html`;

        let { code, grant_type } = req.body;
        let results = {
            code: code,
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI
        };
        let credentials = Object.assign({}, results);
        credentials.clientSecret = SALESFORCE_SECRET;

        let oauth2 = new jsforce.OAuth2(credentials);
        let conn = new jsforce.Connection({ oauth2: oauth2 });
        conn.authorize(code, function (err, userInfo) {
            if (err) {
                console.error("Salesforce server: OAuthBackchannel error: " + err);
            } else {
                console.log('Salesforce server: authed: userInfo', userInfo);
            }
            results.err = err;
            if (userInfo) {
                results.accessToken = conn.accessToken;
                results.refreshToken = conn.refreshToken;
                results.instanceUrl = conn.instanceUrl;
            }
            console.log("Sending connection information to finsemble.", results);
            res.send(results)
        });
    });

    /*****************************************************************
    *                          CORS WRANGLING
    ******************************************************************/

    /**
    * This route handles requests for our data table component. Their static resources are resolving locally instead of remotely.
    */
    app.get('/resource/ldt__*', function (req, res) {

        if (req.originalUrl === '/resource/ldt__lodash/js/lodash.min.js') {
            res.redirect(`https://finsemble-dev-dev-ed.lightning.force.com/resource/datatable_lodash/js/lodash.min.js`)
        } else if (req.originalUrl.includes('ldt__momenttz')) {
            let url = "https://finsemble-dev-dev-ed.lightning.force.com";
            res.redirect(url + req.originalUrl.replace('ldt__momenttz', 'datatable_momenttz'));
        } else {
            res.redirect(`https://finsemble-dev-dev-ed.lightning.force.com${req.originalUrl}`)
        }
    });

    /**
     * Our component is also looking for fonts and icons..but these are remote. so we redirect them to a local version so CORS doesn't bite us.
     */
    app.get('/_slds*', function (req, res) {
        let fixedURL = req.originalUrl.replace('_slds/', '');
        fixedURL = fixedURL.replace('/v7.31.0/', '/');
        res.redirect(`/components/salesforce/common/assets/${fixedURL}`)
    });
    /**
    * Our component is also looking for fonts and icons..but these are remote. so we redirect them to a local version so CORS doesn't bite us.
    */
    app.get('/services/images/photo*', function (req, res) {
        res.redirect(`https://finsemble-dev-dev-ed.lightning.force.com${req.originalUrl}`);
    });


}
module.exports = main;