import React, { useState } from "react";
import { Meteor } from "meteor/meteor";
import { Redirect } from "react-router-dom";
import {
  VerifyContainer,
  VerifyHeader,
  VerifyTitle,
  VerifyContent,
  VerifyText,
  VerifyDescription,
  VerifyButton,
  VerifyIcon,
  SuccessMessage,
  ErrorMessage,
} from "../styles/Verify";
import BackButton from "../mobile/components/BackButton";

const RiderVerify = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [redirectToProfile, setRedirectToProfile] = useState(false);

  const handleFinishVerification = () => {
    setIsVerifying(true);
    setError("");
    setSuccess("");

    Meteor.call("verify.finish", (err, result) => {
      setIsVerifying(false);
      
      if (err) {
        setError(err.reason || "Verification failed. Please try again.");
      } else {
        setSuccess(result.message);
        // Redirect after 2 seconds
        setTimeout(() => {
          setRedirectToProfile(true);
        }, 2000);
      }
    });
  };

  if (redirectToProfile) {
    return <Redirect to="/edit-profile" />;
  }

  return (
    <VerifyContainer>
      <BackButton />
      
      <VerifyHeader>
        <VerifyIcon>🚗</VerifyIcon>
        <VerifyTitle>Rider Verification</VerifyTitle>
      </VerifyHeader>

      <VerifyContent>
        <VerifyText>
          Complete your rider verification to access all features
        </VerifyText>
        
        <VerifyDescription>
          As a rider, you'll be able to:
          • Find and join rides from verified drivers
          • Contact drivers for ride arrangements
          • Access all rider-specific features
          • Build your rider reputation
        </VerifyDescription>

        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <VerifyButton
          onClick={handleFinishVerification}
          disabled={isVerifying || success}
        >
          {isVerifying ? "Verifying..." : success ? "Verified!" : "Finish Rider Verification"}
        </VerifyButton>
      </VerifyContent>
    </VerifyContainer>
  );
};

export default RiderVerify;
