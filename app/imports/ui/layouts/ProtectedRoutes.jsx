import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Route, Redirect } from "react-router-dom";
import { withTracker } from "meteor/react-meteor-data";
import { Meteor } from "meteor/meteor";
import { Profiles } from "../../api/profile/Profile";
import LoadingPage from "../components/LoadingPage";
import { MobileGenericSkeleton } from "../skeleton";
import { MobileOnly, DesktopOnly } from "./Devices";
import { RouteContainer, AuthOverlay } from "../styles/ProtectedRoutes";

/**
 * Main protected route with onboarding logic
 * Checks authentication, email verification, and profile completion
 */
const ProtectedRoutesComponent = ({
  component: Component,
  profileData,
  ready,
  loggedIn,
  emailVerified,
  loggingIn,
  userLoaded,
  ...rest
}) => {
  // Create a functional component to use hooks
  const MainRouteWrapper = (props) => {
    // Dynamic auth overlay state
    const initialOverlayState = !loggedIn && !userLoaded && loggingIn;
    const [showAuthOverlay, setShowAuthOverlay] = useState(initialOverlayState);

    // Update overlay state when auth conditions change
    useEffect(() => {
      const shouldShow = !loggedIn && !userLoaded && loggingIn;

      if (shouldShow !== showAuthOverlay) {
        setShowAuthOverlay(shouldShow);
      }
    }, [loggedIn, userLoaded, loggingIn, showAuthOverlay]);

    // If not logged in, redirect to signin
    if (!loggedIn && userLoaded) {
      return <Redirect to="/login" />;
    }

    // If email not verified, redirect to verify email page
    if (loggedIn && userLoaded && !emailVerified) {
      return <Redirect to="/verify-email" />;
    }

    // If logged in, email verified, but no profile, redirect to onboarding
    if (loggedIn && userLoaded && ready && !profileData) {
      return <Redirect to="/onboarding" />;
    }

    // If logged in, email verified, has profile, but not verified, redirect to verification
    if (loggedIn && userLoaded && ready && profileData && !profileData.verified) {
      return <Redirect to="/verify" />;
    }

    // Always render the component, but show overlay if still authenticating
    return (
      <RouteContainer>
        <Component {...props} />
        {showAuthOverlay && (
          <AuthOverlay>
            <MobileOnly>
              <MobileGenericSkeleton numberOfLines={35} showBackButton={true} lineVariations="default" />
            </MobileOnly>
            <DesktopOnly>
              <LoadingPage message="Authenticating..." />
            </DesktopOnly>
          </AuthOverlay>
        )}
      </RouteContainer>
    );
  };

  return (
    <Route
      {...rest}
      render={(props) => <MainRouteWrapper {...props} />}
    />
  );
};

/**
 * Simple protected route with email verification
 */
export const ProtectedRoute = ({ component: Component, ...rest }) => {
  // Create a functional component to use hooks
  const SimpleRouteWrapper = (props) => {
    const isLoggingIn = Meteor.loggingIn();
    const user = Meteor.user();
    const isLogged = !!user;

    // Dynamic auth overlay state
    const initialOverlayState = !isLogged && isLoggingIn;
    const [showAuthOverlay, setShowAuthOverlay] = useState(initialOverlayState);

    // Update overlay state when auth conditions change
    useEffect(() => {
      const shouldShow = !isLogged && isLoggingIn;

      if (shouldShow !== showAuthOverlay) {
        setShowAuthOverlay(shouldShow);
      }
    }, [isLogged, isLoggingIn, showAuthOverlay]);

    // If no user and not logging in, redirect to signin
    if (!user && !isLoggingIn) {
      return (
        <Redirect
          to={{ pathname: "/login", state: { from: props.location } }}
        />
      );
    }

    // If user exists but email not verified, redirect to verify email
    if (user && !user.emails[0].verified) {
      return <Redirect to="/verify-email" />;
    }

    // Always render the component, but show overlay if still authenticating
    return (
      <RouteContainer>
        <Component {...props} />
        {showAuthOverlay && (
          <AuthOverlay>
            <MobileOnly>
              <MobileGenericSkeleton numberOfLines={35} showBackButton={true} lineVariations="default" />
            </MobileOnly>
            <DesktopOnly>
              <LoadingPage message="Authenticating..." />
            </DesktopOnly>
          </AuthOverlay>
        )}
      </RouteContainer>
    );
  };

  return (
    <Route
      {...rest}
      render={(props) => <SimpleRouteWrapper {...props} />}
    />
  );
};

const ProtectedRouteRequireNotEmailVerifiedComponent = ({
  component: Component,
  isLoggingIn,
  user,
  ...rest
}) => {
  // Create a functional component to use hooks
  const NotEmailVerifiedWrapper = (props) => {
    // Dynamic loading state
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(isLoggingIn);

    // Update loading state when auth conditions change
    useEffect(() => {
      if (isLoggingIn !== showLoadingOverlay) {
        setShowLoadingOverlay(isLoggingIn);
      }
    }, [isLoggingIn, showLoadingOverlay]);

    // Show loading while authentication state is being determined
    if (showLoadingOverlay) {
      return (
        <>
          <MobileOnly>
            <MobileGenericSkeleton numberOfLines={35} showBackButton={true} lineVariations="default" />
          </MobileOnly>
          <DesktopOnly>
            <LoadingPage message="Authenticating..." />
          </DesktopOnly>
        </>
      );
    }

    if (user) {
      if (!user.emails[0].verified) {
        return <Component {...props} />;
      }
      return (
        <Redirect
          to={
            props.location.state && props.location.state.from
              ? props.location.state.from.pathname
              : "/"
          }
        />
      );
    }
    return (
      <Redirect
        to={{ pathname: "/login", state: { from: props.location } }}
      />
    );
  };

  return (
    <Route
      {...rest}
      render={(props) => <NotEmailVerifiedWrapper {...props} />}
    />
  );
};

export const ProtectedRouteRequireNotEmailVerified = withTracker(() => {
  const user = Meteor.user();
  const isLoggingIn = Meteor.loggingIn();

  return {
    isLoggingIn,
    user,
  };
})(ProtectedRouteRequireNotEmailVerifiedComponent);

/** Component for routes that require system role only */
const ProtectedRouteRequireSystemComponent = ({ component: Component, ...rest }) => {
  const SystemWrapper = (props) => {
    const user = Meteor.user();

    if (!user) {
      return <Redirect to="/login" />;
    }

    if (!user.roles || !user.roles.includes("system")) {
      return <Redirect to="/404" />;
    }

    return <Component {...props} />;
  };

  return (
    <Route
      {...rest}
      render={(props) => <SystemWrapper {...props} />}
    />
  );
};

ProtectedRouteRequireSystemComponent.propTypes = {
  component: PropTypes.oneOfType([PropTypes.object, PropTypes.func]).isRequired,
};

export const ProtectedRouteRequireSystem = withTracker(() => {
  const user = Meteor.user();

  return {
    hasSystemRole: user && user.roles && user.roles.includes("system"),
  };
})(ProtectedRouteRequireSystemComponent);

/**
 * Route that requires user to NOT be logged in
 */
const ProtectedRouteRequireNotLoggedInComponent = ({
  component: Component,
  isLoggingIn,
  user,
  ...rest
}) => {
  // Create a functional component to use hooks
  const NotLoggedInWrapper = (props) => {
    // Dynamic loading state
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(isLoggingIn);

    // Update loading state when auth conditions change
    useEffect(() => {
      if (isLoggingIn !== showLoadingOverlay) {
        setShowLoadingOverlay(isLoggingIn);
      }
    }, [isLoggingIn, showLoadingOverlay]);

    // Show loading while authentication state is being determined
    if (showLoadingOverlay) {
      return (
        <>
          <MobileOnly>
            <MobileGenericSkeleton numberOfLines={35} showBackButton={true} lineVariations="default" />
          </MobileOnly>
          <DesktopOnly>
            <LoadingPage message="Authenticating..." />
          </DesktopOnly>
        </>
      );
    }

    if (!user) {
      return <Component {...props} />;
    }
    return (
      <Redirect
        to={
          props.location.state && props.location.state.from
            ? props.location.state.from.pathname
            : "/my-rides"
        }
      />
    );
  };

  return (
    <Route
      {...rest}
      render={(props) => <NotLoggedInWrapper {...props} />}
    />
  );
};

export const ProtectedRouteRequireNotLoggedIn = withTracker(() => {
  const user = Meteor.user();
  const isLoggingIn = Meteor.loggingIn();

  return {
    isLoggingIn,
    user,
  };
})(ProtectedRouteRequireNotLoggedInComponent);

/**
 * Route that requires admin privileges
 */
export const ProtectedRouteRequireAdmin = ({
  component: Component,
  ...rest
}) => {
  // Create a functional component to use hooks
  const AdminRouteWrapper = (props) => {
    const user = Meteor.user();
    const userId = Meteor.userId();
    const isLoggingIn = Meteor.loggingIn();
    const isLogged = userId !== null;
    const isAdmin = user?.roles?.includes("system") ||
                    user?.roles?.some(role => role.startsWith("admin."));
    const userLoaded = user !== undefined;

    // Dynamic auth overlay state
    const initialOverlayState = !isLogged && isLoggingIn;
    const [showAuthOverlay, setShowAuthOverlay] = useState(initialOverlayState);

    // Update overlay state when auth conditions change
    useEffect(() => {
      const shouldShow = !isLogged && isLoggingIn;

      if (shouldShow !== showAuthOverlay) {
        setShowAuthOverlay(shouldShow);
      }
    }, [isLogged, isLoggingIn, showAuthOverlay]);

    // If we don't have a userId, we're definitely not logged in
    if (!userId) {
      return (
        <Redirect
          to={{ pathname: "/login", state: { from: props.location } }}
        />
      );
    }

    // If user object exists but no admin role, redirect
    if (userLoaded && !isAdmin) {
      return (
        <Redirect
          to={{ pathname: "/login", state: { from: props.location } }}
        />
      );
    }

    // Always render the component, but show overlay if still authenticating
    return (
      <RouteContainer>
        <Component {...props} />
        {showAuthOverlay && (
          <AuthOverlay>
            <MobileOnly>
              <MobileGenericSkeleton numberOfLines={35} showBackButton={true} lineVariations="default" />
            </MobileOnly>
            <DesktopOnly>
              <LoadingPage message="Verifying admin access..." />
            </DesktopOnly>
          </AuthOverlay>
        )}
      </RouteContainer>
    );
  };

  return (
    <Route
      {...rest}
      render={(props) => <AdminRouteWrapper {...props} />}
    />
  );
};

ProtectedRoutesComponent.propTypes = {
  component: PropTypes.oneOfType([PropTypes.object, PropTypes.func]),
  profileData: PropTypes.object,
  ready: PropTypes.bool.isRequired,
  loggedIn: PropTypes.bool.isRequired,
  emailVerified: PropTypes.bool.isRequired,
  loggingIn: PropTypes.bool.isRequired,
  userLoaded: PropTypes.bool.isRequired,
};

ProtectedRoute.propTypes = {
  component: PropTypes.func.isRequired,
  location: PropTypes.object,
};

ProtectedRouteRequireNotLoggedInComponent.propTypes = {
  component: PropTypes.func.isRequired,
  isLoggingIn: PropTypes.bool.isRequired,
  user: PropTypes.object,
  location: PropTypes.object,
};

ProtectedRouteRequireAdmin.propTypes = {
  component: PropTypes.func.isRequired,
  location: PropTypes.object,
};

ProtectedRouteRequireNotEmailVerifiedComponent.propTypes = {
  component: PropTypes.func.isRequired,
  isLoggingIn: PropTypes.bool.isRequired,
  user: PropTypes.object,
  location: PropTypes.object,
};

// Main export with tracker for onboarding logic
const ProtectedRoutes = withTracker(() => {
  const subscription = Meteor.subscribe("Profiles");
  const user = Meteor.user();
  const userId = Meteor.userId();

  return {
    profileData: Profiles.findOne({ Owner: userId }),
    ready: subscription.ready(),
    loggedIn: !!userId,
    emailVerified: user
      ? user.emails && user.emails[0] && user.emails[0].verified
      : false,
    loggingIn: Meteor.loggingIn(),
    userLoaded: user !== undefined, // Check if user data is loaded (null means not logged in, undefined means loading)
  };
})(ProtectedRoutesComponent);

export default ProtectedRoutes;
