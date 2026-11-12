# CURSOR_CONTEXT.md — InvitaQR
> Lee este archivo completo antes de escribir cualquier línea de código.
> Contiene las reglas de negocio y el documento técnico del proyecto.

---

# PARTE 1: DOCUMENTO TÉCNICO

## 1. Visión General del Proyecto

**InvitaQR** es un SaaS multi-tenant para gestión de eventos con entrega de invitaciones y control de acceso mediante códigos QR. Dirigido a organizadores de eventos en México y LATAM.

- **Empresa:** Xalapasoft — Xalapa, Veracruz, México
- **Desarrollador:** José Luis Farías
- **Modelo de negocio:** Pago por evento (no suscripción mensual)
- **Plataformas objetivo:** iOS y Android (mobile), PWA para staff (escáner)

---

## 2. Stack Tecnológico

### Backend
| Tecnología     | Versión  |
|----------------|----------|
| Node.js        | 20 LTS   |
| NestJS         | 10.x     |
| TypeScript     | 5.x      |
| PostgreSQL      | 15       |
| TypeORM        | 0.3.x    |
| JWT (jsonwebtoken) | 9.x  |

### Frontend Mobile
| Tecnología     | Versión  |
|----------------|----------|
| React Native   | 0.74.x   |
| Expo           | SDK 51   |
| Expo Router    | 3.x      |
| TanStack Query | 5.x      |
| Zustand        | 4.x      |
| NativeWind     | 4.x      |

### Staff PWA (Escáner)
| Tecnología | Versión |
|------------|---------|
| React      | 18.x    |
| Vite       | 5.x     |
| html5-qrcode | latest |

### Infraestructura
- Docker + docker-compose
- VPS HostGator
- Stripe Checkout (hosted, sin UI de tarjeta propia)
- 360dialog (~$59 USD/mes) — WhatsApp Business API
- SMTP propio para emails

---

## 3. Estructura del Mono-Repo

```
invitaqr/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── events/
│   │   ├── guests/
│   │   ├── passes/
│   │   ├── rsvp/
│   │   ├── scanner/
│   │   ├── notifications/
│   │   ├── billing/
│   │   ├── dashboard/
│   │   └── common/
│   ├── sql/
│   │   └── init.sql
│   ├── Dockerfile
│   └── package.json
├── mobile/                     # React Native + Expo
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── (planner)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx          # Dashboard
│   │       └── events/
│   │           └── [id]/
│   │               ├── index.tsx
│   │               ├── guests.tsx
│   │               └── passes.tsx
│   ├── components/
│   ├── hooks/
│   ├── stores/
│   └── package.json
├── staff-pwa/                  # PWA escáner (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── Scanner.tsx
│   │   └── api.ts
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── CURSOR_CONTEXT.md           # ← este archivo
└── README.md
```

---

## 4. Docker Compose (desarrollo)

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    container_name: invitaqr_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - '5432:5432'
    networks:
      - invitaqr_net

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: invitaqr_api
    restart: unless-stopped
    environment:
      NODE_ENV: development
      DB_HOST: postgres
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN}
      QR_JWT_SECRET: ${QR_JWT_SECRET}
      QR_JWT_EXPIRES_IN: ${QR_JWT_EXPIRES_IN}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      WHATSAPP_API_KEY: ${WHATSAPP_API_KEY}
      WHATSAPP_PHONE_ID: ${WHATSAPP_PHONE_ID}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      APP_URL: ${APP_URL}
      API_URL: ${API_URL}
    ports:
      - '3000:3000'
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - invitaqr_net

volumes:
  postgres_data:

networks:
  invitaqr_net:
    driver: bridge
```

---

## 5. Schema SQL — `backend/sql/init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- USUARIOS (OWNER | PLANNER | STAFF)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL CHECK (role IN ('OWNER','PLANNER','STAFF')),
  is_active     BOOLEAN       DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- EVENTOS
-- ─────────────────────────────────────────────
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID          NOT NULL REFERENCES users(id),
  name          VARCHAR(200)  NOT NULL,
  description   TEXT,
  location      VARCHAR(300),
  starts_at     TIMESTAMPTZ   NOT NULL,
  ends_at       TIMESTAMPTZ   NOT NULL,
  capacity      INT           NOT NULL DEFAULT 100,
  rsvp_deadline TIMESTAMPTZ,
  plan          VARCHAR(20)   DEFAULT 'FREE' CHECK (plan IN ('FREE','BASIC','PRO')),
  status        VARCHAR(20)   DEFAULT 'DRAFT'
                CHECK (status IN ('DRAFT','ACTIVE','CLOSED','CANCELLED')),
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INVITADOS
-- ─────────────────────────────────────────────
CREATE TABLE guests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       UUID         NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           VARCHAR(150) NOT NULL,
  phone          VARCHAR(20),
  email          VARCHAR(255),
  max_companions INT          NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PASES (RSVP + QR)
-- ─────────────────────────────────────────────
CREATE TABLE passes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id             UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id             UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rsvp_token           UUID        NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  qr_token             TEXT        UNIQUE,
  rsvp_status          VARCHAR(20) DEFAULT 'PENDING'
                       CHECK (rsvp_status IN ('PENDING','CONFIRMED','DECLINED','WAITLIST')),
  companions_confirmed INT         DEFAULT 0,
  accessed_at          TIMESTAMPTZ,
  access_status        VARCHAR(20) DEFAULT 'NOT_ACCESSED'
                       CHECK (access_status IN ('NOT_ACCESSED','ACCESSED','REJECTED')),
  rsvp_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LOG DE ESCANEOS (inmutable, audit trail)
-- ─────────────────────────────────────────────
CREATE TABLE scan_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pass_id        UUID        REFERENCES passes(id),
  event_id       UUID        NOT NULL REFERENCES events(id),
  scanner_id     UUID        REFERENCES users(id),
  raw_token      TEXT,
  result         VARCHAR(30) NOT NULL
                 CHECK (result IN (
                   'OK','ALREADY_USED','INVALID_TOKEN',
                   'EXPIRED','WRONG_EVENT','EVENT_INACTIVE',
                   'OUT_OF_SCHEDULE','NOT_CONFIRMED'
                 )),
  scanned_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PAGOS (Stripe)
-- ─────────────────────────────────────────────
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id          UUID         NOT NULL REFERENCES events(id),
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_id VARCHAR(255),
  plan              VARCHAR(20)  NOT NULL CHECK (plan IN ('BASIC','PRO')),
  amount            INT          NOT NULL,  -- centavos MXN
  currency          VARCHAR(10)  DEFAULT 'MXN',
  status            VARCHAR(20)  DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ÍNDICES
-- ─────────────────────────────────────────────
CREATE INDEX idx_events_owner        ON events(owner_id);
CREATE INDEX idx_guests_event        ON guests(event_id);
CREATE INDEX idx_passes_guest        ON passes(guest_id);
CREATE INDEX idx_passes_event        ON passes(event_id);
CREATE INDEX idx_passes_rsvp_token   ON passes(rsvp_token);
CREATE INDEX idx_scan_logs_event     ON scan_logs(event_id);
CREATE INDEX idx_scan_logs_pass      ON scan_logs(pass_id);
CREATE INDEX idx_payments_event      ON payments(event_id);
```

---

## 6. Variables de Entorno — `.env.example`

```env
# Base de datos
DB_NAME=invitaqr
DB_USER=invitaqr_user
DB_PASSWORD=supersecret
DB_HOST=postgres
DB_PORT=5432

# JWT — tokens de sesión
JWT_SECRET=jwt_secret_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=refresh_secret_aqui
JWT_REFRESH_EXPIRES_IN=7d

# JWT — tokens QR (secreto DISTINTO al de sesión)
QR_JWT_SECRET=qr_secret_diferente_aqui
QR_JWT_EXPIRES_IN=30d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...

# WhatsApp Business (360dialog)
WHATSAPP_API_KEY=
WHATSAPP_PHONE_ID=
WHATSAPP_BASE_URL=https://waba.360dialog.io/v1

# Email (SMTP)
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_USER=noreply@tudominio.com
SMTP_PASS=
SMTP_FROM="InvitaQR <noreply@tudominio.com>"

# URLs
APP_URL=https://app.invitaqr.com
API_URL=https://api.invitaqr.com

# Entorno
NODE_ENV=development
PORT=3000
```

---

## 7. Plan de Implementación (8 Semanas)

### Semana 1 — Fundación
- Levantar mono-repo con estructura de carpetas
- Docker Compose funcional (postgres + api)
- NestJS boilerplate: ValidationPipe global, Swagger, logging
- Módulo `auth`: registro, login, refresh token (JWT HS256)
  - Access token: 15 min
  - Refresh token: 7 días, HttpOnly cookie
- Módulo `users`: perfil, cambio de contraseña
- Base de datos: ejecutar `init.sql`

**Rama git:** `week-1-foundation`

### Semana 2 — Eventos + Invitados
- Módulo `events`: CRUD completo, transición de estados (DRAFT→ACTIVE→CLOSED/CANCELLED)
- Módulo `guests`: 3 métodos de importación:
  1. Manual (formulario)
  2. CSV/XLSX (`expo-document-picker` en mobile, `multer` en backend)
  3. Pegar texto (WhatsApp/email → parseo inteligente)
- Validaciones de capacidad por plan (FREE: 50, BASIC: 150, PRO: 500)

**Rama git:** `week-2-events-guests`

### Semana 3 — RSVP + Generación de QR
- Módulo `rsvp`: endpoints públicos (`/rsvp/:token/*`)
- Flujo: PENDING → CONFIRMED/DECLINED/WAITLIST
- Al confirmar: generar `qr_token` (JWT firmado con `QR_JWT_SECRET`)
- Envío de pase QR por email
- Lógica de lista de espera (cuando capacity se llena)

**Rama git:** `week-3-rsvp-qr`

### Semana 4 — Escáner + Staff PWA
- Módulo `scanner`: endpoint `POST /scanner/validate`
- Transacción atómica con `SELECT ... FOR UPDATE` (anti-fraude doble escaneo)
- Resultado siempre retorna enum (NUNCA lanza 500)
- 9 validaciones en orden: token válido → firma → evento → estado evento → horario → rsvp confirmado → acceso previo → acompañantes
- Tabla `scan_logs` inmutable
- PWA React + Vite: cámara, semáforo visual (verde/rojo/amarillo)

**Rama git:** `week-4-scanner-pwa`

### Semana 5 — Notificaciones
- Módulo `notifications`
- Email: todas las acciones (confirmación RSVP, recordatorio, rechazo)
- WhatsApp: solo plan PRO, vía 360dialog
- Templates de mensajes configurables por evento

**Rama git:** `week-5-notifications`

### Semana 6 — Pagos + Stripe
- Módulo `billing`
- Flujo: seleccionar plan → crear Stripe Checkout Session → redirect → webhook confirma → actualizar `events.plan` y crear registro en `payments`
- Webhook seguro: verificar firma `STRIPE_WEBHOOK_SECRET`
- Estados: PENDING → PAID / FAILED / REFUNDED

**Rama git:** `week-6-billing`

### Semana 7 — App Mobile (Expo)
- Pantallas con Expo Router 3.x
- Autenticación persistente (Zustand + SecureStore)
- Dashboard de eventos
- Gestión de invitados (3 métodos de importación en mobile)
- Vista de pases y estadísticas
- TanStack Query para server state

**Rama git:** `week-7-mobile`

### Semana 8 — Dashboard + Deploy
- Dashboard: stats en tiempo real (confirmados, rechazados, en espera, escaneados)
- Deploy en VPS HostGator con `docker-compose.prod.yml`
- Variables de entorno de producción
- Nginx como reverse proxy
- HTTPS con Let's Encrypt

**Rama git:** `week-8-dashboard-deploy`

---

## 8. Convenciones y Reglas para Cursor

### Nombrado de archivos
- Archivos: `kebab-case.ts` (ej: `create-event.dto.ts`)
- Clases: `PascalCase` (ej: `CreateEventDto`)
- Variables/funciones: `camelCase`
- Constantes: `UPPER_SNAKE_CASE`

### Formato de respuestas API
```typescript
// Éxito
{ "data": { ... }, "message": "OK" }

// Error
{ "error": "ERROR_CODE", "message": "Descripción legible" }
```

### NestJS — Configuración global
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### Autenticación
- Usar `JwtAuthGuard` en todos los endpoints excepto:
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/refresh`
  - `GET  /rsvp/:token` y cualquier `/rsvp/:token/*`
- Refresh token va en HttpOnly cookie, NO en body

### Scanner — Regla crítica
```typescript
// El scanner NUNCA debe lanzar una excepción 500.
// Siempre retorna un resultado del enum ScanResult.
// Si algo falla internamente, retorna 'INVALID_TOKEN'.
```

### Testing (Jest)
- Tests obligatorios para: `auth`, `scanner`, `passes`, `rsvp`
- Mínimo: casos felices + casos de error principales
- Usar `@nestjs/testing` con módulos mock

### Git
- Una rama por semana: `week-N-nombre`
- Commits descriptivos en español o inglés
- PR al terminar cada semana antes de fusionar a `main`

---

# PARTE 2: REGLAS DE NEGOCIO

## 1. Actores del Sistema

| Rol       | Descripción                                            | Puede crear eventos | Gestiona invitados | Escanea QR |
|-----------|--------------------------------------------------------|---------------------|--------------------|------------|
| OWNER     | Administrador de la plataforma (Xalapasoft)            | Sí (todos)          | Sí (todos)         | No         |
| PLANNER   | Organizador de eventos (cliente que paga)              | Sí (propios)        | Sí (propios)       | No         |
| STAFF     | Personal de acceso asignado por el PLANNER             | No                  | No                 | Sí         |

**Reglas de acceso:**
- Un PLANNER solo ve y gestiona sus propios eventos.
- Un STAFF solo puede escanear QR en los eventos para los que fue asignado.
- El OWNER tiene visibilidad total para soporte y administración.

---

## 2. Planes y Límites

| Plan   | Precio           | Límite de invitados | WhatsApp | Soporte   |
|--------|------------------|----------------------|----------|-----------|
| FREE   | $0 MXN           | 50                   | No       | Community |
| BASIC  | $299 MXN/evento  | 150                  | No       | Email     |
| PRO    | $599 MXN/evento  | 500                  | Sí       | Prioritario |

**Reglas de límites:**
- El límite se cuenta por invitados únicos (guests), no por pases.
- Si se intenta agregar un invitado que supera el límite del plan, el sistema rechaza la operación con error `PLAN_LIMIT_EXCEEDED`.
- El plan FREE no requiere pago. BASIC y PRO requieren pago previo vía Stripe antes de activar el evento.
- Un evento no puede pasar a estado ACTIVE si el plan requerido no está pagado.

---

## 3. Gestión de Eventos

### Ciclo de vida

```
DRAFT → ACTIVE → CLOSED
                ↘ CANCELLED
```

| Estado    | Descripción                                      | Permite agregar invitados | Permite RSVP | Permite escaneo |
|-----------|--------------------------------------------------|---------------------------|--------------|-----------------|
| DRAFT     | En construcción, no publicado                    | Sí                        | No           | No              |
| ACTIVE    | Publicado, recibiendo confirmaciones             | Sí                        | Sí           | Sí (si en horario) |
| CLOSED    | Evento finalizado                                | No                        | No           | No              |
| CANCELLED | Cancelado por el organizador                     | No                        | No           | No              |

**Reglas:**
- Solo el PLANNER dueño del evento (o OWNER) puede cambiar el estado.
- Para pasar de DRAFT a ACTIVE, el plan debe estar pagado (si aplica).
- Un evento CANCELLED no puede reactivarse.
- Un evento CLOSED tampoco puede reactivarse.

---

## 4. Gestión de Invitados

### Métodos de importación

**Método 1 — Manual**
- El PLANNER llena un formulario: Nombre (obligatorio), Teléfono, Email, Acompañantes máximos, Notas.
- Se crea un registro en `guests` y un `pass` con `rsvp_status = PENDING`.

**Método 2 — CSV / XLSX**
- El PLANNER sube un archivo desde su dispositivo móvil (`expo-document-picker`).
- Formato esperado: columnas `name`, `phone`, `email`, `max_companions` (opcionales: `notes`).
- El backend valida, descarta duplicados (mismo email o teléfono en el mismo evento) y retorna un resumen: N importados, M rechazados con razón.
- Se crean registros en `guests` y `passes` en lote (batch insert).

**Método 3 — Pegar texto**
- El PLANNER pega texto copiado de WhatsApp, email u otra fuente.
- El backend parsea líneas, extrae nombre y teléfono/email con regex flexible.
- Inspirado en Attendium (diferenciador LATAM): facilita importación desde grupos de WhatsApp.
- Mismo flujo de deduplicación que el método CSV.

**Reglas generales:**
- Un invitado puede tener teléfono O email (al menos uno recomendado para notificaciones).
- Duplicados (mismo email o teléfono en el mismo evento) son ignorados silenciosamente en importación masiva.
- El campo `max_companions` define cuántas personas adicionales puede traer el invitado (0 = solo él).

---

## 5. Flujo RSVP

### Estados del pase

```
PENDING → CONFIRMED ──→ (QR generado)
        → DECLINED
        → WAITLIST (si capacity llena)
```

**Flujo detallado:**
1. El PLANNER activa el evento (DRAFT → ACTIVE).
2. El sistema envía notificación (email/WhatsApp) a cada invitado con su enlace único: `APP_URL/rsvp/{rsvp_token}`.
3. El invitado abre el enlace, confirma o declina, indica número de acompañantes (hasta `max_companions`).
4. Si confirma y hay capacidad: `rsvp_status = CONFIRMED`, se genera `qr_token` (JWT firmado con `QR_JWT_SECRET`, TTL 30 días), se envía por email el pase QR.
5. Si confirma pero no hay capacidad: `rsvp_status = WAITLIST`.
6. Si otro invitado cancela y hay lugar en WAITLIST: el sistema mueve al primero en WAITLIST a CONFIRMED automáticamente y le envía su QR.
7. Si declina: `rsvp_status = DECLINED`.

**Reglas:**
- El enlace RSVP es de un solo uso para confirmar/declinar (no requiere login).
- Después de confirmar, el invitado puede cambiar de CONFIRMED a DECLINED hasta `rsvp_deadline` (si está definido).
- El `qr_token` es un JWT: `{ passId, eventId, guestId, exp }`, firmado con `QR_JWT_SECRET` (distinto a `JWT_SECRET`).

---

## 6. Validación QR

### Proceso de escaneo (atómico)

El endpoint `POST /scanner/validate` ejecuta una transacción con `SELECT ... FOR UPDATE` para evitar doble escaneo concurrente.

### 9 validaciones en orden

| # | Validación             | Resultado si falla     | Color UI   |
|---|------------------------|------------------------|------------|
| 1 | JWT decodificable      | `INVALID_TOKEN`        | 🔴 Rojo    |
| 2 | Firma JWT válida       | `INVALID_TOKEN`        | 🔴 Rojo    |
| 3 | Token no expirado      | `EXPIRED`              | 🔴 Rojo    |
| 4 | Pass existe en DB      | `INVALID_TOKEN`        | 🔴 Rojo    |
| 5 | eventId coincide       | `WRONG_EVENT`          | 🔴 Rojo    |
| 6 | Evento en estado ACTIVE| `EVENT_INACTIVE`       | 🟡 Amarillo|
| 7 | Dentro de horario      | `OUT_OF_SCHEDULE`      | 🟡 Amarillo|
| 8 | RSVP = CONFIRMED       | `NOT_CONFIRMED`        | 🟡 Amarillo|
| 9 | access_status = NOT_ACCESSED | `ALREADY_USED`   | 🔴 Rojo    |
| ✅| Todas pasan            | `OK`                   | 🟢 Verde   |

**Reglas:**
- Si pasa todas las validaciones: actualizar `passes.access_status = ACCESSED`, `passes.accessed_at = NOW()`.
- Siempre crear registro en `scan_logs` (tanto OK como errores).
- El scanner NUNCA lanza una excepción HTTP 500. Siempre retorna un resultado válido del enum.
- En caso de error interno inesperado: registrar en logs del sistema y retornar `INVALID_TOKEN`.

---

## 7. Notificaciones

### Canales disponibles por plan

| Acción                    | FREE | BASIC | PRO         |
|---------------------------|------|-------|-------------|
| Envío de enlace RSVP      | Email| Email | Email + WhatsApp |
| Confirmación de asistencia| Email| Email | Email + WhatsApp |
| Pase QR                   | Email| Email | Email + WhatsApp |
| Recordatorio (24h antes)  | No   | Email | Email + WhatsApp |
| Cambio a WAITLIST         | Email| Email | Email + WhatsApp |
| Promoción desde WAITLIST  | Email| Email | Email + WhatsApp |

**WhatsApp — Reglas (solo plan PRO):**
- Proveedor: 360dialog (~$59 USD/mes adicional al precio del plan).
- Requiere número verificado de WhatsApp Business.
- Usar templates aprobados por Meta para mensajes iniciados por la empresa.
- Si WhatsApp falla, siempre hacer fallback a email.
- Nunca bloquear el flujo si WhatsApp no está disponible.

**Email — Reglas (todos los planes):**
- SMTP propio configurado en variables de entorno.
- Templates HTML responsivos (mobile-first).
- El pase QR se envía como imagen embebida en el email (no adjunto).

---

## 8. Facturación y Pagos

### Flujo de pago

1. PLANNER elige plan BASIC ($299 MXN) o PRO ($599 MXN) para su evento.
2. Backend crea una Stripe Checkout Session con el `price_id` correspondiente y `metadata: { eventId }`.
3. PLANNER es redirigido a la página hosted de Stripe.
4. Al completar el pago, Stripe envía webhook `checkout.session.completed`.
5. Backend verifica firma del webhook (`STRIPE_WEBHOOK_SECRET`).
6. Backend actualiza: `events.plan = plan`, crea registro en `payments` con `status = PAID`.
7. PLANNER regresa a la app y puede activar su evento.

### Estados de pago

| Estado   | Descripción                            |
|----------|----------------------------------------|
| PENDING  | Checkout Session creada, pago no recibido |
| PAID     | Webhook confirmado, plan activo        |
| FAILED   | Pago fallido o expirado                |
| REFUNDED | Reembolso procesado (manual por OWNER) |

**Reglas:**
- El campo `amount` en `payments` se almacena en centavos MXN (ej: $299 MXN = 29900).
- No se usa interfaz de tarjeta propia (Stripe Checkout hosted = PCI compliance delegada).
- Los reembolsos son manuales (el OWNER los procesa desde el dashboard de Stripe).
- Un evento con plan PAID puede ser cancelado pero no se reembolsa automáticamente (política del negocio).
- El plan FREE no genera registro en `payments`.

---

## 9. Decisiones de producto (2026-11-11)

El plan de 8 semanas es una guía de alcance, no un ritmo obligatorio. El orden lo marca la implementación.

**Quién es quién**
- Xalapasoft (José Luis) es la empresa y el único `OWNER`. No aparece en el registro de la app.
- El producto público es la app de tiendas (iOS/Android). Quien la descarga se registra gratis y queda como `PLANNER`.
- Los planes FREE / BASIC / PRO se ofrecen dentro de la app, por evento, no al crear la cuenta.
- FREE activa el evento sin pago. BASIC y PRO exigen pago confirmado antes de pasar a `ACTIVE`.
- `STAFF` no se auto-registra. Lo dará de alta el planner cuando exista el escáner (PWA), no la app de tiendas.

**Auth (fundación)**
- `POST /auth/register` solo crea `PLANNER`. No acepta `role`.
- El OWNER se siembra al arrancar si existen `OWNER_EMAIL` y `OWNER_PASSWORD` y ese correo aún no está en `users`.
- Access token (15 min) en el JSON: `data.accessToken`.
- Refresh token (7 días) en el JSON (`data.refreshToken`, para SecureStore en móvil) y también en cookie `refresh_token` (`HttpOnly`, `Path=/auth`, `SameSite=Lax`, `Secure` solo en producción) para la PWA.
- Sin tabla de revocación: el esquema no se modifica. Logout solo borra la cookie; un refresh robado sigue válido hasta que expire.
- Login con usuario inactivo o contraseña incorrecta: `401` / `INVALID_CREDENTIALS` (mismo mensaje).
- Contraseña: mínimo 8 caracteres, bcrypt 12 rounds.
- Perfil: `GET /users/me`, `PATCH /users/me` (solo `name`), `PATCH /users/me/password`. Email y rol no se editan ahí.
- Sin prefijo `/api`. Swagger en `/docs`. Mensajes de API en español.

---

## Instrucción final para Cursor

> Cuando el usuario diga "empieza con la Semana N", implementa todos los módulos y archivos de esa semana siguiendo:
> 1. Las convenciones de nombrado de la Sección 8 (Parte 1)
> 2. Las reglas de negocio correspondientes de la Parte 2
> 3. El schema SQL de la Sección 5 (ya definido, no lo modifiques sin avisar)
> 4. El formato de respuesta API estándar de la Sección 8
>
> Siempre pregunta si tienes dudas sobre alguna regla antes de implementar. No asumas comportamientos no documentados aquí.
