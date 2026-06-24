import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import {
  LayoutDashboard, FileText, Bell, LogOut,
} from "lucide-react";

function ClientSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const links = [
    { to: "/client/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/client/invoices", icon: FileText, label: "Facturas" },
    { to: "/client/alerts", icon: Bell, label: "Alertas" },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-brand-700">Dash Cliente</h1>
        <p className="text-sm text-gray-500">{user?.username}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const active = location.pathname.startsWith(link.to);
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function ClientLayoutInner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  }

  if (!user || user.role !== "client") return null;

  return (
    <div className="flex">
      <ClientSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function ClientLayout() {
  return (
    <AuthProvider>
      <ClientLayoutInner />
    </AuthProvider>
  );
}
