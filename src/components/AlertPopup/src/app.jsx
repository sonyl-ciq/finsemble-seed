import React from "react";
import ReactDOM from "react-dom";
import { Store as AlertPopupStore } from "./stores/AlertPopupStore";
import AlertPopupComponent from "./components/AlertPopupComponent";

class AlertPopup extends React.Component {
	componentDidUpdate() { }
	componentWillMount() {}
	componentDidMount() { }
	componentWillUnmount() { }
	componentWillReceiveProps(nextProps) { }
	render() {
		var self = this;
		return (<div>
			<AlertPopupComponent />
		</div>)
	}
};
//for debugging.
window.AlertPopupStore = AlertPopupStore;

// render component when FSBL is ready.
const FSBLReady = () => {
	ReactDOM.render(
		<AlertPopup />
		, document.getElementById("AlertPopup-component-wrapper"));
}

if (window.FSBL && FSBL.addEventListener) {
	FSBL.addEventListener("onReady", FSBLReady);
} else {
	window.addEventListener("FSBLReady", FSBLReady);
}