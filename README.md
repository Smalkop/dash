# Dash - Plataforma de Re-Facturación Cloudflare

Monorepo fullstack desplegado 100% en Cloudflare Workers para monitorear, calcular y facturar el consumo de Cloudflare a clientes.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + react-router v7 (SSR) |
| Backend/API | Cloudflare Workers + Hono.js v4 |
| Base de datos | Cloudflare D1 (SQLite) |
| Cache/Estado | Cloudflare KV |
| Almacenamiento | Cloudflare R2 (exports PDF/CSV) |
| Autenticación | JWT (jose) + bcryptjs |
| Scheduling | Cron Triggers (diario 00:05 UTC) |
| Charts | Recharts |
| Estilos | Tailwind CSS v3 |

## Estructura del proyecto

```
dash/
├── package.json              # Monorepo (npm workspaces)
├── tsconfig.base.json        # Config TypeScript base
├── packages/
│   └── db/                   # @dash/db - Schema y migraciones
│       └── src/
│           ├── index.ts
│           ├── schema.ts     # Tipos TypeScript
│           └── migrations/
│               └── 001_initial.sql
├── apps/
│   ├── api/                  # @dash/api - API Worker (Hono)
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point + cron handler
│   │   │   ├── env.ts        # Bindings de Cloudflare
│   │   │   ├── types.ts      # Tipos compartidos
│   │   │   ├── db.ts         # Helper de base de datos
│   │   │   ├── middleware/   # auth, rate-limit, error
│   │   │   ├── routes/       # auth, clients, resources, metrics, invoices, alerts, setup
│   │   │   ├── services/     # graphql, cost-calculator, invoice-pdf, cron
│   │   │   └── utils/        # jwt, date
│   │   └── wrangler.toml
│   └── web/                  # @dash/web - Frontend SSR Worker
│       ├── app/
│       │   ├── root.tsx      # Layout raíz
│       │   ├── routes.ts     # Configuración de rutas
│       │   ├── entry.client.tsx
│       │   ├── entry.server.tsx
│       │   ├── lib/          # api.ts, auth.tsx
│       │   ├── components/   # layouts, KPI, chart, top-resources
│       │   ├── routes/       # Páginas (admin, client, login, etc.)
│       │   └── styles/
│       ├── server.ts         # Cloudflare Worker entry
│       ├── vite.config.ts
│       ├── react-router.config.ts
│       └── wrangler.toml
└── README.md
```

## Requisitos previos

- Node.js 20+
- npm 10+
- Wrangler CLI (`npm install -g wrangler`)
- Cuenta de Cloudflare con Workers Paid plan (para GraphQL Analytics)
- API Token de Cloudflare con permisos: `Account:Read`, `Analytics:Read`

## Configuración inicial

### 1. Clonar e instalar

```bash
cd dash
npm install
```

### 2. Configurar Cloudflare

```bash
# Login a Cloudflare
wrangler login

# Crear D1 database
wrangler d1 create dash-db

# Crear KV namespace
wrangler kv namespace create dash-cache

# Crear R2 bucket
wrangler r2 bucket create dash-exports
```

### 3. Configurar wrangler.toml

Editar `apps/api/wrangler.toml` con los IDs generados:

```toml
[[d1_databases]]
binding = "DB"
database_name = "dash-db"
database_id = "<ID_GENERADO>"

[[kv_namespaces]]
binding = "CACHE"
id = "<ID_GENERADO>"

[[r2_buckets]]
binding = "EXPORTS"
bucket_name = "dash-exports"
```

### 4. Configurar secrets

```bash
# JWT Secret (generar con: openssl rand -base64 32)
echo "mi-jwt-secret-seguro" | wrangler secret put JWT_SECRET --name dash-api

# Cloudflare API Token (permisos: Account:Read, Analytics:Read)
echo "mi-api-token" | wrangler secret put CLOUDFLARE_API_TOKEN --name dash-api

# Account Tag (ID de tu cuenta Cloudflare)
echo "mi-account-tag" | wrangler secret put CLOUDFLARE_ACCOUNT_TAG --name dash-api
```

### 5. Ejecutar migraciones

```bash
# Local (desarrollo)
npx wrangler d1 execute dash-db --local --file=packages/db/src/migrations/001_initial.sql

# Producción
npx wrangler d1 execute dash-db --file=packages/db/src/migrations/001_initial.sql
```

### 6. Configurar frontend

Editar `apps/web/wrangler.toml` con la URL de tu API:

```toml
[vars]
API_URL = "https://dash-api.tu-dominio.workers.dev"
```

## Desarrollo local

```bash
# Iniciar API worker (puerto 8787)
npm run dev:api

# Iniciar web worker (puerto 8788)
npm run dev:web

# O ambos simultáneamente
npm run dev
```

## Deploy

```bash
# Deploy API
npm run deploy:api

# Deploy Frontend
npm run deploy:web

# O ambos
npm run deploy
```

## Primer uso

1. Ir a `https://dash-web.tu-dominio.workers.dev/api/setup` (GET para ver estado)
2. Hacer POST a `/api/setup` para inicializar admin y pricing tiers
3. Login con `admin` / `admin123`
4. Ir a `/admin/clients` para crear tu primer cliente
5. Ir a `/admin/resources` para asignar Workers al cliente
6. Crear usuario de acceso para el cliente desde la vista detalle del cliente
7. Programar sincronización diaria o ejecutar manualmente POST `/api/metrics/sync`

## Endpoints de la API

### Autenticación
- `POST /api/auth/login` — Login
- `POST /api/auth/verify` — Verificar token
- `POST /api/auth/register-client` — Crear usuario cliente (admin)

### Clientes
- `GET /api/clients` — Listar (paginado)
- `GET /api/clients/:id` — Detalle con consumo del mes
- `POST /api/clients` — Crear (admin)
- `PUT /api/clients/:id` — Actualizar (admin)

### Recursos
- `GET /api/resources` — Listar (filtro por client_id, type)
- `GET /api/resources/:id` — Detalle
- `POST /api/resources` — Asignar recurso (admin)
- `PUT /api/resources/:id` — Actualizar (admin)
- `DELETE /api/resources/:id` — Eliminar (admin)

### Métricas
- `GET /api/metrics/summary?client_id=X&start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/metrics/by-resource?client_id=X`
- `POST /api/metrics/sync` — Sincronización manual (admin)

### Facturas
- `GET /api/invoices` — Listar (filtro por client_id, status)
- `GET /api/invoices/:id` — Detalle con items
- `POST /api/invoices/generate` — Generar factura (admin)

### Alertas
- `GET /api/alerts/rules` — Listar reglas
- `POST /api/alerts/rules` — Crear regla
- `PUT /api/alerts/rules/:id` — Actualizar regla
- `DELETE /api/alerts/rules/:id` — Eliminar regla
- `GET /api/alerts/notifications` — Notificaciones
- `POST /api/alerts/notifications/:id/read` — Marcar como leída

### Setup
- `GET /api/setup/status` — Estado del sistema
- `POST /api/setup` — Inicializar sistema

### Sistema
- `GET /api/health` — Health check
- `GET /api/cron/manual` — Ejecutar cron manual (admin)

## Modelo de costos

El costo se calcula así:

1. Se obtiene el pricing tier por defecto (business: 20M requests incluidos, 60M CPU ms incluidos)
2. Se calcula el excedente: `max(0, uso_total - incluido)`
3. Se aplica la tarifa: `(excedente / 1_000_000) * precio_por_millon`
4. Se aplica el markup del cliente: `costo * (1 + markup_percentage/100)`

Los tiers y tarifas se pueden personalizar en la tabla `pricing_tiers`.

## Modelo de seguridad

- JWT con expiración de 24h
- Roles: `admin` (dueño de la plataforma) y `client` (cliente final)
- Rate limiting: 100 req/min por IP, 1000 req/min por admin
- Tokens de Cloudflare almacenados en Secrets (nunca en código)
- Los clientes solo ven sus propios datos (filtro automático por client_id del token)

## Mantenimiento

```bash
# Ver logs del worker
wrangler tail

# Ver métricas de D1
wrangler d1 info dash-db

# Ejecutar consulta ad-hoc
wrangler d1 execute dash-db --command "SELECT * FROM clients"
```

## Licencia

Uso interno - No redistribuir.
