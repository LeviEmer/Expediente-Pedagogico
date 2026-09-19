# Expediente Pedagógico

Sistema de gestión de clases para una escuela de manejo (MVP). Monorepo pnpm con:

- `backend` — NestJS + Prisma (PostgreSQL/Supabase), auth JWT, correo vía Gmail SMTP (Nodemailer).
- `frontend` — Next.js (App Router) + Tailwind.

## Requisitos

- Node 20+
- pnpm (`corepack enable && corepack prepare pnpm@9 --activate` si no lo tienes)
- Una base de datos PostgreSQL (por ejemplo, un proyecto de Supabase)

## Puesta en marcha

```bash
pnpm install
```

1. Copia `backend/.env.example` a `backend/.env` y completa `DATABASE_URL`, `JWT_SECRET` y (opcional en desarrollo) `GMAIL_USER`/`GMAIL_APP_PASSWORD`. Sin esas dos, los correos solo se registran en la consola del API en vez de enviarse.
2. Copia `frontend/.env.example` a `frontend/.env.local` (el valor por defecto ya apunta a `http://localhost:3001/api`).

```bash
pnpm prisma:migrate   # crea las tablas en la base de datos
pnpm prisma:seed      # carga el currículo completo (L00-L15 + evaluación general) y un usuario supervisor
```

El seed crea dos sucursales (Sucursal San Salvador y Sucursal Sonsonate) y un usuario supervisor por sucursal (`supervisor.sucursal-san-salvador@escuela.com` / `supervisor.sucursal-sonsonate@escuela.com`, contraseña `admin123`, ver la consola del seed para el detalle). Para crear instructores con acceso, usa el panel de supervisor una vez logueado (o `POST /api/instructors` con `password`) — quedan asignados a la sucursal del supervisor que los crea.

## Despliegue a producción

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para la guía paso a paso (Vercel + Render + Supabase, sin costo mensual).

El sistema tiene solo dos roles: **instructor** (captura sus propias clases) y **supervisor** (ve y gestiona todo: alumnos, instructores, matrículas e historial completo).

```bash
pnpm dev:backend   # http://localhost:3001/api
pnpm dev:frontend  # http://localhost:3000
```

## Estructura de datos y currículo

El modelo completo (`backend/prisma/schema.prisma`) y el currículo transcrito del formulario en papel (`backend/prisma/seed.ts`) siguen fielmente las 16 lecciones (L00–L15), sus criterios, rúbricas de nivel 1–4 y la evaluación general, tal como se documentaron en la especificación del proyecto.

## Supuestos implementados (ver sección 12 del spec original)

- Una lección se considera "completada" cuando todos sus criterios están en Sí/N.A. y todas sus dimensiones de rúbrica están en nivel 4. Al completarse la última lección pendiente, el curso se finaliza automáticamente y se envía el reporte general.
- El supervisor puede reabrir una sesión cerrada por error.
- Solo existe el curso "Auto"; en transmisión automática el currículo arranca en L05 (se omiten L00–L04, propias de clutch/cambios).
- El portal del alumno, pagos, adjuntos PDF y firma digital están fuera de alcance de esta versión.
