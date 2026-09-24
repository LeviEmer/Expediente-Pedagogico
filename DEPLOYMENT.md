# Despliegue a producción (plan gratuito)

Guía para dejar la aplicación accesible desde internet (celulares incluidos) sin costo mensual: **Vercel** (frontend) + **Render** (backend) + **Supabase** (base de datos). Pensada para el tráfico de esta app (un puñado de instructores y alumnos por sucursal) — muy por debajo de los límites de los planes gratuitos.

Todas las cuentas deben crearse **a nombre del dueño de la escuela** (su correo, no el tuyo), para que sea dueño de su propia infraestructura desde el día uno.

## 1. Base de datos — Supabase

1. Crear cuenta en [supabase.com](https://supabase.com) con el correo de la escuela.
2. Crear un proyecto nuevo (plan Free). Guardar la contraseña de la base de datos que se genera.
3. En **Project Settings → Database → Connection string**, copiar la cadena en modo **Connection pooling** (puerto 6543, `?pgbouncer=true`) — es la que hay que usar como `DATABASE_URL` para un backend serverless/con muchas conexiones cortas.
4. Nota: el proyecto se pausa tras ~1 semana sin actividad. El monitoreo del paso 4 (UptimeRobot) lo mantiene activo automáticamente.

## 2. Backend — Render

1. Crear cuenta en [render.com](https://render.com) con el correo de la escuela, conectada al repositorio de GitHub.
2. **New → Blueprint**, apuntar al repo — Render detecta `render.yaml` en la raíz y configura el servicio automáticamente (build con migraciones incluidas vía `prisma migrate deploy`, y healthcheck en `/api/health`).
3. Completar las variables de entorno marcadas como `sync: false` en el dashboard de Render:
   - `DATABASE_URL` → la cadena de Supabase del paso 1.
   - `JWT_SECRET` → una cadena aleatoria larga (por ejemplo, generarla con `openssl rand -base64 32`).
   - `RESEND_API_KEY`, `MAIL_BCC_ADMIN` → envío de reportes por correo vía [Resend](https://resend.com) (API HTTP, no SMTP — Render bloquea el puerto SMTP saliente en su plan gratis, por eso no se usa Gmail SMTP directo). La API key se genera en el dashboard de Resend → API Keys. Sin dominio propio verificado en Resend, los correos salen desde `onboarding@resend.dev`; al verificar un dominio propio se puede volver a mandar desde un correo de la escuela.
   - `FRONTEND_URL` → se completa después del paso 3, con la URL que dé Vercel.
4. Al desplegar, correr el seed una sola vez desde la shell de Render (**Shell** tab del servicio): `pnpm --filter backend prisma:seed`.
5. Anotar la URL pública que asigna Render (algo como `https://expediente-pedagogico-api.onrender.com`).

## 3. Frontend — Vercel

1. Crear cuenta en [vercel.com](https://vercel.com) con el correo de la escuela, conectada al mismo repo.
2. **Add New → Project**, seleccionar el repo. En **Root Directory** elegir `frontend` (Vercel detecta Next.js automáticamente).
3. Variable de entorno: `NEXT_PUBLIC_API_URL` → `https://<url-de-render>/api`.
4. Desplegar. Vercel da una URL propia (`https://algo.vercel.app`) con HTTPS automático — se puede conectar un dominio propio después sin costo adicional si la escuela compra uno.
5. Volver a Render y completar `FRONTEND_URL` con esa URL de Vercel (así el backend solo acepta pedidos desde el frontend real).

## 4. Monitoreo gratis — UptimeRobot

1. Crear cuenta en [uptimerobot.com](https://uptimerobot.com) (plan free, 50 monitores).
2. Crear un monitor HTTP(s) apuntando a `https://<url-de-render>/api/health`, cada 5 minutos.
3. Esto cumple dos funciones: avisa por correo si el backend se cae, y evita que Render lo "duerma" por inactividad (el free tier de Render suspende el servicio tras 15 min sin tráfico).
4. Opcional: agregar un segundo monitor a la URL del frontend en Vercel (Vercel no se duerme, pero sirve como alerta general).

## 5. Probar desde un celular

Abrir la URL de Vercel desde un navegador de celular (datos móviles, no wifi de la misma red donde se desarrolló) y hacer login como cada supervisor sembrado, confirmar que carga bien en pantalla chica.

---

## Plan B — si algún proveedor recorta su free tier

La app no depende de ningún servicio propietario: toda la configuración vive en variables de entorno (`DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `FRONTEND_URL`). Migrar cualquier pieza es cuestión de horas:

- **Si Supabase deja de ser viable**: cualquier Postgres gestionado (Neon, Railway, o un Postgres en un VPS) sirve — solo cambiar `DATABASE_URL` en Render y volver a correr `prisma migrate deploy`. Los datos se migran con `pg_dump` / `pg_restore` estándar (no hay nada específico de Supabase en el código).
- **Si Render deja de ser viable**: el backend es un NestJS estándar (`pnpm build` + `node dist/main.js`), corre igual en Railway, Fly.io, o un VPS con Docker. Cambiar `NEXT_PUBLIC_API_URL` en Vercel a la nueva URL.
- **Si Vercel deja de ser viable**: cualquier hosting de Next.js (Netlify, Cloudflare Pages, o un VPS) sirve igual.
- **Backup de datos**: aunque Supabase hace backups automáticos en su plan free (retención corta), conviene programar un `pg_dump` periódico propio (por ejemplo, un GitHub Action semanal) apenas la escuela tenga historial real de alumnos que no se pueda perder.
