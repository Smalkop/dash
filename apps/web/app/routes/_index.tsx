import { Link } from "react-router";
import { BarChart3, Users, FileText, LayoutDashboard } from "lucide-react";

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900">Dash</span>
          </div>
          <Link to="/login" className="btn-primary">
            Iniciar sesión
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            Plataforma de Re-Facturación Cloudflare
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Monitorea, calcula y factura el consumo real de Cloudflare a tus clientes
            con transparencia y precisión.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: BarChart3, title: "Métricas en tiempo real", desc: "Consumo de Workers, CPU time, wall time y subrequests vía GraphQL Analytics" },
            { icon: Users, title: "Gestión de clientes", desc: "Multi-cliente con planes personalizables y markups por cliente" },
            { icon: FileText, title: "Facturación automática", desc: "Generación de facturas con PDF exportable" },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1.5">{feat.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
