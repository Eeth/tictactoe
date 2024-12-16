import React, { createContext, useContext, useState } from 'react';

// Create a Context for the user
const UserContext = createContext();

// UserProvider component to wrap your app and provide the user context
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context in other components
export const useUser = () => useContext(UserContext);
