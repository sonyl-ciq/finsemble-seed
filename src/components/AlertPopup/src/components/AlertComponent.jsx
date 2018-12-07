import React from "react";
export default class AlertPopupComponent extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			alert: {}
		};
		this.bindCorrectContext();
	}
	bindCorrectContext() {
		//this.itemClick = this.itemClick.bind(this);
	}
	componentDidUpdate() { }
	componentWillMount() { }
	componentWillUnmount() { }
	componentWillReceiveProps(nextProps) { }
	render() {
		return (<div className="notification-wrapper">
			<div className="notification-header" id="closer">
				<div className="notification-title-wrapper">
					<div className="notification-title"> {this.props.alert.title} </div>
				</div>
			</div>
			<div className="notification-body">
				<div className="notification-content">
				<div className="notification-description"> {this.props.alert.msg} </div>
				<div className="notification-timestamp"> {"Received at: " + new Date(this.props.alert.receivedTimestamp).toLocaleString()} </div>
				</div>
			</div>
		</div>)
		
	}
}