import React from "react";
import { FinsembleButton, FinsembleButtonLabel, FinsembleFontIcon } from "@chartiq/finsemble-react-controls"

export default class OptionButton extends React.Component {

	constructor(props) {
		super(props);
		this.bindCorrectContext();
	}
	bindCorrectContext() { 
		this.itemClick = this.itemClick.bind(this);
	}
	componentDidUpdate() { }
	componentWillMount() { }
	componentWillUnmount() { }
	componentWillReceiveProps(nextProps) { }
	itemClick() { 
		console.log("Alert id: " + this.props.alertId + ": " + this.props.label + " clicked");
	}
	render() {
		return (
			<button className="option-button" onClick={this.itemClick}>
				<i className={"option-icon " + this.props.icon} ></i>
				<span className="option-label">{this.props.label}</span>
			</button>);
	}
}

