(() => {
	/**
		 * The name of the theme store.
		 */
	const storeName = "themeStore";

	/**
	 * Array of IDs for theme variables in the HTML form.
	 */
	const ids = [
		"--primary-accent-color",
		"--secondary-accent-color",
		"--tertiary-accent-color",
		"--primary-negative-color",
		"--secondary-negative-color",
		"--tertiary-negative-color",
		"--primary-background-color",
		"--secondary-background-color",
		"--tertiary-background-color",
		"--scrollbar-color"
	];

	/**
     * Handle to the theme store.
     */
	let themeStore;

	/**
	 * Handles the click on the Apply button.
	 * 
	 * Fetches the theme set in the form and updates the values in the distributed store.
	 */
	const applyHandler = () => {
		const newValues = [];
		ids.forEach((value, index) => {
			const el = document.getElementById(value);
			if (el && el.value && el.value !== "") {
				const field = ids[index];
				const newValue = el.value;
				newValues.push({ "field": field, "value": newValue });
			}
		});

		if (newValues.length > 0) {
			// Update theme in the distributed store.
			themeStore.setValues(newValues, setValuesCB);
		}
	}

	/**
	 * Handles the <code>setValues</code> callback.
	 * 
	 * @param {*} err The error object (<code>null</code> if no error).
	 */
	const setValuesCB = (err) => {
		if (err) {
			FSBL.Clients.Logger.error(err);
		} else {
			FSBL.Clients.Logger.debug("Theme set value successfully.");
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

		// TODO: update values in the form
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
	 * Handles the get values callback fetching the current style values from the store so they can be shown in the UI.
	 * 
	 * @param {*} err The error object (<code>null<code> if no error). 
	 * @param {*} values The values returned from the store.
	 */
	const getValuesCB = (err, values) => {
		if (err) {
			return FSBL.Clients.Logger.error(err);
		}

		ids.forEach((id) => document.getElementById(id).value = values[id]);
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

		themeStore.getValues(ids, getValuesCB);

		themeStore.addListener(themeChangeHandler, themeListenerCB);
	}

	const onReadyCB = () => {
		// Add the apply button handler
		const applyBtn = document.getElementById("apply");
		applyBtn.onclick = applyHandler;

		// Fetch the distributed store
		FSBL.Clients.DistributedStoreClient.getStore({ store: storeName }, fetchStoreCB);
	}

	FSBL.addEventListener("onReady", onReadyCB);
})()