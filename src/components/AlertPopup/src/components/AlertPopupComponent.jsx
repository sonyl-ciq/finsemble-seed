import React from "react";
import { Store as AlertPopupStore } from "../stores/AlertPopupStore";
import { Action as AlertPopupActions } from "../stores/AlertPopupStore";
import AlertComponent from "./AlertComponent";

export default class AlertPopupComponent extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			alertList: []
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		this.alertListUpdated = this.alertListUpdated.bind(this);
	}
	componentDidUpdate() { }
	alertListUpdated(err, list) {
		this.setState({ alertList: list.value || [] })
	}
	componentWillMount() {
		AlertPopupStore.addListener(this.alertListUpdated);
	 }
	componentWillUnmount() { }
	componentWillReceiveProps(nextProps) { }
	render() {

		if (this.state.alertList && this.state.alertList.length) {
			let alertRows = [];
			for (let i = 0; i < this.state.alertList.length; i++) {
				// note: we add a key prop here to allow react to uniquely identify each
				// element in this array. see: https://reactjs.org/docs/lists-and-keys.html
				alertRows.push(<AlertComponent key={this.state.alertList[i].id} alert={this.state.alertList[i]} />);
			}
			let out = (
				<div>
					<h1>Alerts ({alertRows.length})</h1>
					<div className="notification-list">
						{alertRows}
					</div>
				</div>);
			return out;
				
		} else {
			return (
				<div>
					<h1>Alerts</h1>
					<div className="notification-list">
						<h2>
							No alerts to display
						</h2>
					</div>
				</div>);
		}
	}
}
