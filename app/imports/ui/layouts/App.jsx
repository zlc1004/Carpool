import React from "react";
import "semantic-ui-css/semantic.css";
import {
  HashRouter as Router,
  Route,
  Switch,
  Redirect,
} from "react-router-dom";
import MobileAdminRides from "../mobile/pages/AdminRides";
import MobileAdminUsers from "../mobile/pages/AdminUsers";
import MobileTestImageUpload from "../mobile/pages/TestImageUpload";
import MobileNotFound from "../mobile/pages/NotFound";
import MobileSignIn from "../mobile/pages/SignIn";
import MobileSignup from "../mobile/pages/Signup";
import MobileForgotPassword from "../mobile/pages/ForgotPassword";
import MobileLanding from "../mobile/pages/Landing";
import MobileImDriving from "../mobile/pages/ImDriving";
import MobileImRiding from "../mobile/pages/ImRiding";
import MobileNavBar from "../mobile/components/NavBar";
import MobileFooter from "../mobile/components/Footer";
import MobileChat from "../mobile/pages/Chat";
import MobileSignout from "../mobile/pages/Signout";
import MobileVerifyEmail from "../mobile/pages/VerifyEmail";
import MobileEditProfile from "../mobile/pages/EditProfile";
import MobileOnboarding from "../mobile/pages/Onboarding";
import ProtectedRoutes, {
  ProtectedRoute,
  ProtectedRouteRequireNotLoggedIn,
  ProtectedRouteRequireAdmin,
  ProtectedRouteRequireNotEmailVerified,
} from "./ProtectedRoutes";

/** Top-level layout component for this application. Called in imports/startup/client/startup.jsx. */
class App extends React.Component {
  render() {
    const appStyle = {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
    };

    const mainContentStyle = {
      flex: "1",
    };

    return (
      <Router>
        <div style={appStyle}>
          <MobileNavBar />
          <main style={mainContentStyle}>
            <Switch>
              <Route exact path="/" component={MobileLanding} />
              <Route exact path="/404" component={MobileNotFound} />
              <ProtectedRouteRequireNotLoggedIn
                path="/signin"
                component={MobileSignIn}
              />
              <ProtectedRouteRequireNotLoggedIn
                path="/signup"
                component={MobileSignup}
              />
              <ProtectedRouteRequireNotLoggedIn
                path="/forgot"
                component={MobileForgotPassword}
              />
              <ProtectedRouteRequireNotEmailVerified
                path="/verify-email"
                component={MobileVerifyEmail}
              />

              {/* Onboarding route - simple auth check without profile requirement */}
              <ProtectedRoute path="/onboarding" component={MobileOnboarding} />

              {/* Main app routes with full onboarding flow */}
              <ProtectedRoutes path="/imDriving" component={MobileImDriving} />
              <ProtectedRoutes path="/imRiding" component={MobileImRiding} />
              <ProtectedRoutes
                path="/editProfile"
                component={MobileEditProfile}
              />
              <ProtectedRoutes path="/chat" component={MobileChat} />

              {/* Admin routes */}
              <ProtectedRouteRequireAdmin
                path="/adminRides"
                component={MobileAdminRides}
              />
              <ProtectedRouteRequireAdmin
                path="/adminUsers"
                component={MobileAdminUsers}
              />

              {/* Test routes */}
              <ProtectedRoute
                path="/testImageUpload"
                component={MobileTestImageUpload}
              />
              <ProtectedRoute path="/signout" component={MobileSignout} />

              {/* Catch-all route for 404 */}
              <Redirect to="/404" />
            </Switch>
          </main>
          <MobileFooter />
        </div>
      </Router>
    );
  }
}

export default App;
