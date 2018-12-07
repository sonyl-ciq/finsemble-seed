import React from "react";
import OptionButton from  "./OptionButton";
export default class AlertPopupComponent extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			alert: {}
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() { }
	componentDidUpdate() { }
	componentWillMount() { }
	componentWillUnmount() { }
	componentWillReceiveProps(nextProps) { }
	render() {
		let options = <OptionButton key="DISMISS" alertId={this.props.alert.id} label="DISMISS" icon="ff-close-2 option-black"/>;

		if (this.props.alert.options) {
			let opts = [];
			for (let o = 0; o < this.props.alert.options.length; o++) {
				opts.push(<OptionButton key={this.props.alert.options[o]} alertId={this.props.alert.id} label={this.props.alert.options[o]} icon={this.props.alert.options[o] == "APPROVE" ? "ff-check-mark option-green" : "ff-close-2 option-red"}/>);
			}
			options = opts;
		}
		return (<div className="notification-wrapper">
			<div className="notification-header" id="closer">
				<div className="notification-title-wrapper">
					<div className="notification-title"> {this.props.alert.title} </div>
				</div>
			</div>
			<div className="notification-body">
				<div className="notification-content">
				<div className="notification-description"> {this.props.alert.msg} </div>
				<div className="notification-options">
					{options}
				</div>
				<div className="notification-timestamp"> {"Received at: " + new Date(this.props.alert.receivedTimestamp).toLocaleString()} </div>
				</div>
			</div>
		</div>)
		
	}
}