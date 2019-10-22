![](https://camo.githubusercontent.com/9f79c4429557ebcf88d4efd9710f0dae7f473d95/68747470733a2f2f646f63756d656e746174696f6e2e636861727469712e636f6d2f66696e73656d626c652f7374796c65732f696d672f46696e73656d626c655f4c6f676f5f4461726b2e737667
)

---

# Example of Forcing a File Download via JavaScript from Within a Finsemble Component

## Installation

1. `npm install` to ensure all dependencies are available.
1. `npm run dev`
1. Create a `downloadTestComponent` in the workspace:
    ![](https://gist.githubusercontent.com/sonyl-ciq/566d5f3ee1421c031c722eca73db618f/raw/27e8f44d141221637d77ab3798ea6877e52017e3/downloadTestComponent.png)

## Method 1

1. Use the "Download Local" link to demonstrate downloading a file from Finsemble. A route in `server.js` provides this:

    ```js
    app.get("/file/excel", (req, res, next) => {
        res.download(`${__dirname}/../assets/files/luke.xlsx`)
	})
    ```

## Method 2

1. To test a file download from a remote source, stand up a basic Express server. You can use [this example](https://github.com/sonyl-ciq/express-download-file-test).
1. Use the "Download Foreign" link to demonstrate a file download from another server.

## Mechanism

The process to force a download is basic JavaScript using `window.location`.