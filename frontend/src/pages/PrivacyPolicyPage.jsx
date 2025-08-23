// src/pages/PrivacyPolicyPage.jsx

import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicyPage = () => {
  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h1>Privacy Policy</h1>
      <p>
        <strong>Last Updated: August 23, 2025</strong>
      </p>

      <h2>Introduction</h2>
      <p>
        "Last Checked In" is a private, intentional tool designed to empower
        users to be more consistent and thoughtful in nurturing their personal
        and professional relationships. This privacy policy is intended to
        inform you about the information we collect, how we use it, and the
        steps we take to protect it.
      </p>

      <h2>Information We Collect</h2>
      <p>
        We collect information you provide directly to us when you create an
        account, manage your contacts, and use our services.
      </p>
      <ul>
        <li>
          <strong>Account Information:</strong> When you register, we collect
          your email address and a hashed password. We do not store your
          password in plain text.
        </li>
        <li>
          <strong>Contact & Note Data:</strong> You can add contacts, notes,
          check-in dates, and other details. This data is stored securely and is
          strictly sandboxed to your account. We do not access, share, or sell
          this information.
        </li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>
        The information we collect is used solely to provide and improve the
        "Last Checked In" service.
      </p>
      <ul>
        <li>
          To provide you with access to your account and personalized data.
        </li>
        <li>
          To send you push notifications for overdue check-ins, if you opt-in.
        </li>
        <li>
          To provide customer support and respond to your feedback or inquiries.
        </li>
      </ul>

      <h2>Data Security</h2>
      <p>
        We take reasonable measures to protect your personal information from
        loss, theft, misuse, unauthorized access, disclosure, alteration, and
        destruction. Your data is scoped to your user ID, and all authentication
        is handled via JSON Web Tokens (JWTs).
      </p>

      <h2>Data Deletion</h2>
      <p>
        You can delete your account and all associated data at any time from
        within the application settings.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this privacy policy from time to time. We will notify you
        of any changes by posting the new policy on this page.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us
        via the feedback link in the application's header.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
