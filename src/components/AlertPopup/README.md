# Pop Up Alert Example

## Files included

- Alert Manager service
    - _src/services/alertmanager/alertmanager.html_
    - _src/services/alertmanager/alertmanagerService.js_
- Alert Pop Up component
    - _src/components/AlertPopup/AlertPopup.css_
    - _src/components/AlertPopup/AlertPopup.html_
    - _src/components/AlertPopup/config.json_
    - _src/components/AlertPopup/finsemble.webpack.json_
    - _src/components/AlertPopup/src/app.jsx_
    - _src/components/AlertPopup/src/components/AlertComponent.jsx_
    - _src/components/AlertPopup/src/components/AlertPopupComponent.jsx_
    - _src/components/AlertPopup/src/components/OptionButton.jsx_
    - _src/components/AlertPopup/src/stores/AlertPopupStore.jsx_
- Alert Count toolbar button
    - src-built-in/components/toolbar/components/AlertCount.jsx

## Installation

**NOTE:** Installation instructions are based off of the [Finsemble Seed project](https://github.com/ChartIQ/finsemble-seed), some alteration may be necessary based on your project setup.

1. Install the Alert Manager service:
    1. Copy the contents of _src/services/alertmanager_ to the same folder in your project.
    2. Add the `alertmanagerService` configuration to _configs/application/services.json_:
        ``` JSON
            "alertmanagerService": {
                "useWindow": true,
                "active": true,
                "name": "alertmanagerService",
                "visible": false,
                "html": "$applicationRoot/services/alertmanager/alertmanager.html"
            }
        ```
2. Install the Alert Pop Up component:
    1. Copy the contents of _src/components/AlertPopup_ to the same folder in your project.
    2. Import the component configuration by adding it to _configs/openfin/manifest-local.json_:
        ``` JSON
        "finsemble": {
            "applicationRoot": "http://localhost:3375",
            "moduleRoot": "http://localhost:3375/finsemble",
            "servicesRoot": "http://localhost:3375/finsemble/services",
            "notificationURL": "http://localhost:3375/components/notification/notification.html",
            "importConfig": [
                "$applicationRoot/configs/application/config.json",
                "$applicationRoot/components/AlertPopup/config.json" // Added config
            ],
            "IAC": {
                "serverAddress" : "wss://127.0.0.1:3376"
            }
        }
        ```
        **NOTE:** The contents of _src/components/AlertPopup/config.json_ can also be added to _configs/application/components.json_ or to the application config after authentication [using dynamic configuration](https://documentation.chartiq.com/finsemble/ConfigClient.html#processAndSet).
3. Add Alert Count button to the toolbar
    1. Copy the contents of _src-built-in/components/toolbar_ to _src/components/toolbar_

        **Note:** It is recommended to copy built-in components from _src-built-in_ to _src_ before modifying and extending them.
    2. Copy _src-built-in/components/toolbar/components/AlertCount.jsx_ to _src/components/toolbar/components/AlertCount.jsx_ in your project
    3. Update _src/components/toolbar/src/dynamicToolbar.jsx_ to:
        - Import `AlertCount`:
            ``` JavaScript
            import AlertCount from "../components/AlertCount";
            ```
        - Add `AlertCount` to the list of custom components:
            ``` JavaScript
            customComponents["AlertCount"] = AlertCount;
            ```
    4. Add the Alert Count button to the toolbar
        - Add the following configuration to _src/components/toolbar/config.json_ (typically after the `BringToFront` component)
            ``` JSON
                {
                    "align": "right",
                    "type": "reactComponent",
                    "reactComponent": "AlertCount"
                },
            ```

            **NOTE:** This configuration can also be added to `finsemble.menus` after authentication [using dynamic configuration](https://documentation.chartiq.com/finsemble/ConfigClient.html#processAndSet).

4. The seed project can now be started using `npm run dev`

