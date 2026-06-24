import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { verifyToken, login as apiLogin } from "./api";

interface AuthUser {
  id: number;
  username: string;
  role: "admin" | "client";
  client_id: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("dash_token");
    if (token) {
      verifyToken()
        .then((res) => {
          if (res.valid && res.user) {
            setUser({
              id: res.user.sub,
              username: "",
              role: res.user.role as "admin" | "client",
              client_id: res.user.client_id,
            });
          } else {
            localStorage.removeItem("dash_token");
          }
        })
        .catch(() => localStorage.removeItem("dash_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    localStorage.setItem("dash_token", res.token);
    localStorage.setItem("dash_role", res.user.role);
    setUser(res.user as AuthUser);
  };

  const logout = () => {
    localStorage.removeItem("dash_token");
    localStorage.removeItem("dash_role");
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
