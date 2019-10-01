const Finsemble = require("@chartiq/finsemble");

// Initialize clients for service
Finsemble.Clients.Logger.start();
Finsemble.Clients.ConfigClient.initialize();
Finsemble.Clients.DialogManager.initialize();

Finsemble.Clients.Logger.log("fsblVersionCheck Service starting up");

/**
 * Service to check whether the version of Finsemble available of the server has changed, and notify the user if it
 * does.
 */
class FinsembleVersionCheckService extends Finsemble.baseService {
    /**
     * Initialize a new instance of the FinsembleVersionCheckService class.
     */
    constructor() {
        // Call Finsemble.baseService constructor
        super({
            startupDependencies: {
                services: [],
                clients: ["ConfigClient"]
            }
        });

        // Initialize initialize variables
        this.startUpFSBLVersion = "";
        this.configURL = "";
        this.updatePeriod = Number.MAX_SAFE_INTEGER;

        // Bind functions to this for callbacks
        this.compareVersions.bind(this);
        this.getFinsembleVersion.bind(this);
        this.startVersionCheck.bind(this);
    }

    /**
     * Compares Finsemble version with startup version and notifies user if they are different.
     *
     * @param fsblVersionA The first version to compare
     * @param fsblVersionB The second version to compare
     */
    compareVersions(fsblVersionA, fsblVersionB) {
        console.log('versions', fsblVersionA, fsblVersionB)
        if (fsblVersionA !== fsblVersionB) {
            const dialogHandler = (err, response) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if (response.choice === "cancel") {
                    //
                } else {
                    //If we get here, they clicked "Restart Now", so we obey the user.
                    Finsemble.Clients.RouterClient.transmit("Application.restart");
                }
            };

            const params = {
                monitor: "primary",
                question: "The application will restart in one minute. Your workspace will be saved.",
                showTimer: true,
                timerDuration: 60000,
                showNegativeButton: false,
                affirmativeDialogManResponseLabel: "Restart Now"
            };

            // Version changed since startup, notify user.
            Finsemble.Clients.DialogManager.open("yesNo", params, dialogHandler);
        }
    }

    /**
     * Gets the Finsemble version from the server.
     *
     * @param cb Callback function used to return the Finsemble version with it is fetched.
     */
    getFinsembleVersion(cb) {
        // Version copied here because of this scope
        const fsblVersion = this.startUpFSBLVersion;
        fetch(this.configURL)
            .then((res) => res.json())
            .then(config => cb(config.system.FSBLVersion, fsblVersion));
    }

    /**
     * Creates a router endpoint for you service.
     * Add query responders, listeners or pub/sub topic as appropriate.
     */
    startVersionCheck() {
        const processConfig = (err, info) => {
            if (err) {
                Finsemble.Clients.Logger.error(err);
                return;
            }

            // Set default configuration
            this.configURL = `${info.applicationRoot}/finsemble/configs/core/config.json`;
            this.updatePeriod = 60 * 1000;

            if (info.FSBLVersionChecking) {
                // Version checking config exists
                if (info.FSBLVersionChecking.updatePeriod) {
                    this.updatePeriod = info.FSBLVersionChecking.updatePeriod;
                }

                if (info.FSBLVersionChecking.configURL) {
                    this.configURL = info.FSBLVersionChecking.configURL;
                }
            }

            Finsemble.Clients.Logger.log(
                `Using:\n\tURL:${this.configURL}\n\tUpdate period (ms): ${this.updatePeriod}`);

            // Get version at startup
            this.getFinsembleVersion((fsblVersion) => {
                this.startUpFSBLVersion = fsblVersion;

                const self = this;
                setInterval(() => self.getFinsembleVersion(self.compareVersions), this.updatePeriod);
            });
        };

        Finsemble.Clients.ConfigClient.getValue({ field: "finsemble" }, processConfig);
    }
}

const serviceInstance = new FinsembleVersionCheckService("fsblVersionCheckService");

serviceInstance.onBaseServiceReady((callback) => {
    serviceInstance.startVersionCheck();
    Finsemble.Clients.Logger.log("Finsemble Version Check Service ready");
    callback();
});

serviceInstance.start();

module.exports = serviceInstance;
