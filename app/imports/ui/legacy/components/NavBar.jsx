import React from "react";
import PropTypes from "prop-types";
import { Meteor } from "meteor/meteor";
import { withTracker } from "meteor/react-meteor-data";
import { withRouter, NavLink } from "react-router-dom";
import { Menu, Dropdown, Image, Icon } from "semantic-ui-react";
import JoinRideModal from "./JoinRideModal";

/** The NavBar appears at the top of every page. Rendered by the App Layout component. */
class NavBar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      joinRideModalOpen: false,
    };
  }

  handleJoinRideClick = () => {
    this.setState({ joinRideModalOpen: true });
  };

  handleJoinRideClose = () => {
    this.setState({ joinRideModalOpen: false });
  };

  render() {
    const menuStyle = { marginBottom: "10px", backgroundColor: "#024731" };
    return (
      <>
        <Menu style={menuStyle} attached="top" borderless inverted>
          <Menu.Item
            position="left"
            as={NavLink}
            activeClassName=""
            exact
            to={this.props.currentUser ? "/listMyRides" : "/"}
          >
            <Image size="small" src="/staticimages/Carpool.png" />
          </Menu.Item>
          {this.props.currentUser
            ? [
                <Dropdown item text="My Rides" position="left" key="myRides">
                  <Dropdown.Menu>
                    <Dropdown.Item
                      text="All Rides"
                      as={NavLink}
                      exact
                      to="/listMyRides"
                      key="myRides"
                    />
                    <Dropdown.Item
                      text="My Rides"
                      as={NavLink}
                      exact
                      to="/myRides"
                    />
                  </Dropdown.Menu>
                </Dropdown>,

                <Menu.Item
                  position="left"
                  as={NavLink}
                  activeClassName="active"
                  exact
                  to="/add/"
                  key="add"
                >
                  <Icon name="plus square outline" size="large" />
                  Create Ride
                </Menu.Item>,
                <Menu.Item
                  position="left"
                  onClick={this.handleJoinRideClick}
                  key="joinRide"
                  style={{ cursor: "pointer" }}
                >
                  <Icon name="code" size="large" />
                  Join Ride
                </Menu.Item>,
              ]
            : ""}
          {this.props.isAdmin ? (
            <Dropdown item text="Admin" key="admin">
              <Dropdown.Menu>
                <Dropdown.Item
                  as={NavLink}
                  exact
                  to="/list"
                  text="All Available Rides"
                />
                <Dropdown.Item
                  as={NavLink}
                  exact
                  to="/adminRides"
                  text="Manage Rides"
                />
                <Dropdown.Item
                  as={NavLink}
                  exact
                  to="/adminUsers"
                  text="Manage Users"
                />
                <Dropdown.Item
                  as={NavLink}
                  exact
                  to="/testImageUpload"
                  text="Test Image Upload"
                />
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            ""
          )}

          <Menu.Item position="right">
            {this.props.currentUser === "" ? (
              <Dropdown text="Login" pointing="top right" icon={"caret down"}>
                <Dropdown.Menu>
                  <Dropdown.Item
                    icon="sign-in"
                    text="Sign In"
                    as={NavLink}
                    exact
                    to="/signin"
                  />
                  <Dropdown.Item
                    icon="add user"
                    text="Sign Up"
                    as={NavLink}
                    exact
                    to="/signup"
                  />
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Dropdown
                text={this.props.currentUser}
                pointing="top right"
                icon={"user"}
              >
                <Dropdown.Menu>
                  <Dropdown.Item
                    icon="chat"
                    text="Messages"
                    as={NavLink}
                    exact
                    to="/chat"
                  />
                  <Dropdown.Item
                    icon="address card"
                    text="Profile"
                    as={NavLink}
                    exact
                    to={`/addprofile/${this.props.currentId}`}
                  />
                  <Dropdown.Item
                    icon="sign out"
                    text="Sign Out"
                    as={NavLink}
                    exact
                    to="/signout"
                  />
                </Dropdown.Menu>
              </Dropdown>
            )}
          </Menu.Item>
        </Menu>

        <JoinRideModal
          open={this.state.joinRideModalOpen}
          onClose={this.handleJoinRideClose}
          prefillCode=""
        />
      </>
    );
  }
}

/** Declare the types of all properties. */
NavBar.propTypes = {
  currentUser: PropTypes.string,
  currentId: PropTypes.string,
  isAdmin: PropTypes.bool,
};

/** withTracker connects Meteor data to React components. https://guide.meteor.com/react.html#using-withTracker */
const NavBarContainer = withTracker(() =>
  // The null publication should automatically publish roles
  // eslint-disable-next-line implicit-arrow-linebreak
  ({
    currentUser: Meteor.user() ? Meteor.user().username : "",
    currentId: Meteor.user() ? Meteor.user()._id : "",
    isAdmin: Meteor.user()
      ? Meteor.user().roles && Meteor.user().roles.includes("admin")
      : false,
  }),
)(NavBar);

/** Enable ReactRouter for this component. https://reacttraining.com/react-router/web/api/withRouter */
export default withRouter(NavBarContainer);
