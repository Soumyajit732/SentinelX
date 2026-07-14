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
  const [isDemo, setIsDemo] = useState(
    () => localStorage.getItem("sentinelx_demo") === "true"
  );

  function login(newToken, newUser, { demo = false } = {}) {
    localStorage.setItem("sentinelx_token", newToken);
    localStorage.setItem("sentinelx_user", JSON.stringify(newUser));
    localStorage.setItem("sentinelx_demo", String(demo));
    setToken(newToken);
    setUser(newUser);
    setIsDemo(demo);
  }

  function logout() {
    localStorage.removeItem("sentinelx_token");
    localStorage.removeItem("sentinelx_user");
    localStorage.removeItem("sentinelx_demo");
    setToken(null);
    setUser(null);
    setIsDemo(false);
  }

  return (
    <AuthContext.Provider value={{ token, user, isDemo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
