import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    localStorage.getItem("sentinelx_token")
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("sentinelx_user");
    return stored ? JSON.parse(stored) : null;
  });

  function login(newToken, newUser) {
    localStorage.setItem("sentinelx_token", newToken);
    localStorage.setItem("sentinelx_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("sentinelx_token");
    localStorage.removeItem("sentinelx_user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
