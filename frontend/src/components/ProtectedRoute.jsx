import React, { useContext } from 'react';
// The Navigate component is the standard way to do redirects in React Router v6
import { Navigate } from 'react-router-dom';
// We get our authentication state from our context
import AuthContext from '../context/AuthContext';

// This component takes one prop: 'children'.
// 'children' will be the component we want to protect (e.g., <MainApplication />).
function ProtectedRoute({ children }) {
  // Get the current token from the AuthContext.
  const { token } = useContext(AuthContext);

  // Here's the core logic:
  // If a token exists (the user is logged in), render the children components.
  // If the token is null (user is not logged in), redirect to the /login page.
  return token ? children : <Navigate to="/login" />;
}

export default ProtectedRoute;