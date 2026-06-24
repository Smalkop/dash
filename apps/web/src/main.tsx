import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "../app/lib/auth";
import "../app/styles/app.css";

import AdminLayout from "../app/components/admin-layout";
import ClientLayout from "../app/components/client-layout";

import IndexPage from "../app/routes/_index";
import LoginPage from "../app/routes/login";
import AdminClientsPage from "../app/routes/admin.clients";
import AdminClientDetailPage from "../app/routes/admin.client-detail";
import AdminResourcesPage from "../app/routes/admin.resources";
import AdminMetricsPage from "../app/routes/admin.metrics";
import AdminInvoicesPage from "../app/routes/admin.invoices";
import ClientDashboardPage from "../app/routes/client.dashboard";
import ClientInvoicesPage from "../app/routes/client.invoices";
import ClientAlertsPage from "../app/routes/client.alerts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route index element={<Navigate to="clients" replace />} />
            <Route path="clients" element={<AdminClientsPage />} />
            <Route path="clients/:id" element={<AdminClientDetailPage />} />
            <Route path="resources" element={<AdminResourcesPage />} />
            <Route path="metrics" element={<AdminMetricsPage />} />
            <Route path="invoices" element={<AdminInvoicesPage />} />
          </Route>
          <Route path="/client/*" element={<ClientLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboardPage />} />
            <Route path="invoices" element={<ClientInvoicesPage />} />
            <Route path="alerts" element={<ClientAlertsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
