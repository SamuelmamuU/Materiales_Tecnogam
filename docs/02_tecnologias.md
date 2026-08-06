# Tecnologías a Utilizar — Sistema de Control de Materiales

> Restricción obligatoria del proyecto: **todo el stack debe ser software libre / open source, sin licencias de pago.** La única partida que puede implicar costo es el hospedaje en la nube al escalar más allá de las capas gratuitas (ver sección 5).

## 1. App de Campo (Móvil — Trabajador / Supervisor)

| Componente | Herramienta | Costo | Notas |
|---|---|---|---|
| Framework multiplataforma | **Flutter (Dart)** | Gratis (open source) | Alcance actual del proyecto: **solo Android**. Se usa Flutter (y no una herramienta nativa exclusiva de Android) porque deja la puerta abierta a iOS/Web/Escritorio en una fase futura sin reescribir la app, aunque esa expansión no forma parte del alcance actual. |
| Base de datos local (offline) | **SQLite** vía **Drift** (o `sqflite`) | Gratis (open source) | Espejo local de avances, materiales, incidentes, tiempos muertos |
| Sincronización en segundo plano | `WorkManager` (Android) + cola propia | Gratis (API nativa) | Detecta conectividad y sincroniza automáticamente |
| Captura de evidencia | Paquetes `camera` / `geolocator` de Flutter | Gratis (open source) | Fotos con georreferenciación |
| Notificaciones | Firebase Cloud Messaging | Gratis (capa permanente) | Alertas de incidentes, hitos, estatus de sincronización |

## 2. Dashboard Web (Administrador / Cliente)

| Componente | Herramienta | Costo | Notas |
|---|---|---|---|
| Framework frontend | **React + TypeScript + Vite** | Gratis (open source) | |
| UI / diseño responsivo | **Tailwind CSS + shadcn/ui** | Gratis (open source) | Debe verse bien en escritorio, tablet y navegador móvil |
| Visualización de datos | **Recharts / ECharts** | Gratis (open source) | Gráficas de área (acumulado) y de barras (diario) |
| Manejo de estado / datos remotos | **TanStack Query (React Query)** | Gratis (open source) | Caché y refresco automático de dashboards |
| Exportación de reportes | `exceljs` / `pdf-lib` | Gratis (open source) | Reporte descargable para Dashboard Cliente |

## 3. Backend / API

| Componente | Herramienta | Costo | Notas |
|---|---|---|---|
| Framework backend | **Node.js + NestJS (TypeScript)** | Gratis (open source) | Arquitectura modular por dominio |
| Base de datos principal | **PostgreSQL** | Gratis (open source) | Transaccional, relaciones proyecto-material-avance |
| ORM | **Prisma** (edición Community) | Gratis (open source) | Migraciones controladas |
| Autenticación | **JWT + Refresh Tokens** (implementación propia) | Gratis (estándar abierto) | |
| Autorización | **RBAC** + scoping por proyecto (lógica propia) | Gratis | Roles: administrador, supervisor, trabajador, cliente |
| Cola de sincronización | **Redis + BullMQ** | Gratis (open source) | Procesa lotes de captura de campo al sincronizar |
| Almacenamiento de archivos | **MinIO** (alternativa open source a S3, auto-hospedado) | Gratis (open source) | Evidencias fotográficas, reportes generados |
| Documentación de API | **Swagger / OpenAPI** | Gratis (open source) | |

## 4. Infraestructura y DevOps

| Componente | Herramienta | Costo | Notas |
|---|---|---|---|
| Hospedaje / nube | **Oracle Cloud Free Tier** | Gratis de forma permanente | Ver nota importante abajo — la capa Always Free se redujo en junio 2026 |
| Hospedaje alterno de BD/Storage administrado | **Supabase** (PostgreSQL + Storage + Auth, capa gratuita) | Gratis (con límites de uso) | Alternativa si no se quiere auto-hospedar |
| Hospedaje del dashboard web | **Vercel / Netlify / Cloudflare Pages** | Gratis (capa free) | CDN incluido |
| Contenedores | **Docker** | Gratis (open source) | Mismo entorno en desarrollo, pruebas y producción |
| CI/CD | **GitHub Actions** | Gratis (minutos incluidos por mes) | Build, lint, test y despliegue |
| Monitoreo y logs | **Grafana + Prometheus** (auto-hospedado) o **Sentry** (capa free) | Gratis | Detección temprana de errores de sincronización |
| Certificado SSL | **Let's Encrypt** | Gratis | Renovación automática |
| Control de versiones | **Git / GitHub** | Gratis (repos privados incluidos) | |

> **Nota importante sobre Oracle Cloud (actualizada):** en junio de 2026 Oracle redujo, sin aviso oficial, el cómputo ARM Always Free de 4 OCPU/24 GB RAM a **2 OCPU/12 GB RAM**. Sigue siendo suficiente para la escala de este proyecto (4 proyectos simultáneos, 10 usuarios), pero debe validarse al aprovisionar, ya que Oracle puede volver a ajustar estos límites sin previo aviso. El resto de los recursos Always Free (200 GB de almacenamiento en bloque, 20 GB de almacenamiento de objetos, balanceador de carga, 10 TB/mes de salida de datos) no se han visto afectados.

## 5. Estructura sugerida del monorepo

```
/apps
  /backend      → NestJS + Prisma + PostgreSQL
  /web          → React + Vite + Tailwind
  /mobile       → Flutter (solo Android)
/docs           → documentación del proyecto (este set de archivos)
/infra          → docker-compose.yml, scripts de despliegue, configuración CI/CD
```

## 6. Fuera de alcance / explícitamente descartado

- **iOS**: la app móvil se desarrolla únicamente para **Android** en esta etapa del proyecto. No se compilan ni prueban builds de iOS.
- **NAS personal (ej. Ugreen 4 bahías)** como servidor de producción: descartado por decisión del cliente. Se mantiene Oracle Cloud Free Tier como opción de hospedaje principal.
- Cualquier herramienta con licencia de pago obligatoria (bases de datos propietarias, servicios de notificación de pago, hosting sin capa gratuita permanente).
