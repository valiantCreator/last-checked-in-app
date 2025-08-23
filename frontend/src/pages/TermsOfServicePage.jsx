// src/pages/TermsOfServicePage.jsx

import React from "react";
import { Link } from "react-router-dom";

const TermsOfServicePage = () => {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h1>Terms of Service</h1>
      <p>
        <strong>Last Updated: August 23, 2025</strong>
      </p>

      <h2>Acceptance of Terms</h2>
      <p>
        By accessing and using "Last Checked In" (the "Service"), you accept and
        agree to be bound by the terms and provisions of this agreement.
      </p>

      <h2>User Conduct</h2>
      <ul>
        <li>
          You agree to use the Service only for its intended purpose: to manage
          your personal relationships.
        </li>
        <li>
          You are solely responsible for all data, information, and content that
          you upload, post, or otherwise transmit via the Service.
        </li>
        <li>
          You must not use the Service for any illegal or unauthorized purpose.
        </li>
      </ul>

      <h2>Intellectual Property</h2>
      <p>
        The Service and all original content, features, and functionality are
        and will remain the exclusive property of "Last Checked In" and its
        licensors.
      </p>

      <h2>Disclaimer of Warranties</h2>
      <p>
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make
        no warranties, expressed or implied, regarding the operation or
        availability of the Service.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        In no event shall "Last Checked In," nor its directors, employees,
        partners, agents, suppliers, or affiliates, be liable for any indirect,
        incidental, special, consequential or punitive damages, including
        without limitation, loss of profits, data, use, goodwill, or other
        intangible losses, resulting from your use of the Service.
      </p>

      <h2>Changes to Terms</h2>
      <p>
        We reserve the right to modify these terms at any time. We will provide
        notice of significant changes by posting the new terms on this page.
      </p>

      <div style={{ marginTop: "2rem" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
