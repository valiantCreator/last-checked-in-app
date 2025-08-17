import React from 'react';

// A simple placeholder for our signup page
function SignupPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Create Account</h1>
      <form>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" style={{ width: '100%', padding: '0.5rem' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" style={{ width: '100%', padding: '0.5rem' }} />
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

export default SignupPage;