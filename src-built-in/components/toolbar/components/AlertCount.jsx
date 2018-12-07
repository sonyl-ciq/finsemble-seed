import React from "react";
import { FinsembleButton } from "@chartiq/finsemble-react-controls";

const COUNTS_PUBSUB_TOPIC = "notification counts";


export default class AlertCount extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
            alertCount: 0
		};
		this.storeObject = null;
        this.bindCorrectContext();
    }
    bindCorrectContext() {
        this.receiveAlertCount = this.receiveAlertCount.bind(this);
        this.addListeners = this.addListeners.bind(this);
        this.removeListeners = this.removeListeners.bind(this);
    }
    componentDidMount() {
        this.addListeners(this);
    }
    componentWillUnmount() {
        this.removeListeners(this);
    }
    receiveAlertCount(err, response) {
		console.log("Received alert count: ", response.value);
        this.setState({
            alertCount: response.value
        });
    }
    addListeners(self) {
		FSBL.Clients.DistributedStoreClient.getStore({
			store: "AlertStore",
			global: true
		}, function (err, storeObject_) {
			if (err) {
				console.error("AlertStore Distributed Store setup failed");
			}
			self.storeObject = storeObject_;
			self.storeObject.addListener ({field:"numAlerts"}, self.receiveAlertCount );
		});
    }
    removeListeners(self) {
		self.storeObject.removeListener({field:'numAlerts'}, this.receiveAlertCount);
    }
	
	openAlertPopup() {
		let windowIdentifier = {componentType: "AlertPopup", windowName: "AlertPopup"};
		FSBL.Clients.LauncherClient.showWindow(windowIdentifier, {
			spawnIfNotFound: true
		});
	}
	render() {
		//console.log('rendero')
		let tooltip = "Open the Alert Popup";
		let buttonClass = "ff-list finsemble-toolbar-button-icon";
		//TODO: move style for count to CSS and improve
		const countStyle = {
			"fontSize": "9px",
			"fontWeight": "bold",
			"width": "15px",
			"height": "15px",
			"background": "rgba(148, 33, 33, 0.70)",
			"color": "white", 
			"borderRadius": "33%",
			"textAlign": "center",
			"verticalAlign": "middle"
		};
		return (<FinsembleButton className={this.props.classes + " icon-only"} buttonType={["Toolbar"]} title={tooltip} onClick={this.openAlertPopup}>
			<i className={buttonClass}></i><div id="alertCount" style={countStyle}>{this.state.alertCount}</div>
		</FinsembleButton>);
	}
}