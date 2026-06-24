import { Link } from "react-router";
import { BarChart3, Users, FileText, Shield } from "lucide-react";

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-blue-900">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <header className="flex items-center justify-between mb-24">
          <h1 className="text-2xl font-bold text-white">Dash</h1>
          <Link
            to="/login"
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
          >
            Iniciar sesión
          </Link>
        </header>

        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-white mb-4">
            Plataforma de Re-Facturación Cloudflare
          </h2>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Monitorea, calcula y factura el consumo real de Cloudflare a tus clientes
            con transparencia y precisión.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: BarChart3, title: "Métricas en tiempo real", desc: "Consumo de Workers, CPU time, wall time y subrequests vía GraphQL Analytics" },
            { icon: Users, title: "Gestión de clientes", desc: "Multi-cliente con planes personalizables y markups por cliente" },
            { icon: FileText, title: "Facturación automática", desc: "Generación de facturas con PDF exportable a R2" },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <Icon className="w-8 h-8 mb-3 text-blue-300" />
                <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                <p className="text-blue-200 text-sm">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
