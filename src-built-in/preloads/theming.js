/**
 * Preload that updates the Finsemble theme at runtime.
 */
(() => {
    /**
     * The name of the theme store.
     */
    const storeName = "themeStore";

    /** 
     * The name of the window that will create the theme store.
     */
    const storeOwner = "Toolbar-1";

    /**
     * Handle to the theme store.
     */
    let themeStore;

    /**
     * Gets the default theme from the running system.
     */
    const getDefaultTheme = () => {
        // TODO: Is it possible to read the theme variables from the running system?
        // Returns an empty object for now.
        return {};
    }

    /**
     * Initializes the store.
     * 
     * This either creates the store if the loading window is the first toolbar, or it fetches the already created store
     * from the <code>DistributedStoreClient</code>.
     */
    const initializeStore = () => {
        if (themeStore) {
            // Already initialized
            return;
        }

        const name = FSBL.Clients.WindowClient.getCurrentWindow().name;
        if (name === storeOwner) {
            // If the first toolbar, create the distributed store.
            const values = getDefaultTheme();

            const params = { store: storeName, global: true, values: values };
            FSBL.Clients.DistributedStoreClient.createStore(params, fetchStoreCB);
        } else {
            // Get the already created distributed store
            FSBL.Clients.DistributedStoreClient.getStore({ store: storeName }, fetchStoreCB);
        }
    }

    /**
     * Handles the themeListener callback.
     * @param {*} err The error object.
     */
    const themeListenerCB = (err) => {
        if (err) {
            FSBL.Clients.Logger.error(err);
        } else {
            FSBL.Clients.Logger.debug("Theme listener successfully added.");
        }
    }

    /**
     * Handles changes to the theme store.
     * 
     * @param {*} err The error object
     * @param {*} data The data object
     */
    const themeChangeHandler = (err, data) => {
        if (err) {
            return FSBL.Clients.Logger.error(err);
        }

        FSBL.Clients.Logger.debug("Theme change received: ", data);

        // Apply theme to window
        // TODO: Read theme data from received data and apply to window.
        document.documentElement.style.setProperty("--toolbar-background-color", "red")
    }

    /**
     * Handles the <code>createStore</code> and <code>getStore</code> callbacks.
     * 
     * @param {*} err Error object. Null if no error.
     * @param {*} storeObject The created store object.
     */
    const fetchStoreCB = (err, storeObject) => {
        if (err) {
            return FSBL.Clients.Logger.error(err);
        }

        // Save store object to script level variable for later use.
        themeStore = storeObject;

        store.addListener(themeChangeHandler, themeListenerCB);
    }

    FSBL.addEventListener("onReady", initializeStore);
})()