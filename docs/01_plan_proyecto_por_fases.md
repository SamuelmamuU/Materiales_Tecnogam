# Plan de Proyecto por Fases — Sistema de Control de Materiales, Avances y Seguimiento de Proyecto

> Este documento está escrito para ser ejecutado por un agente de IA de forma secuencial, fase por fase, tarea por tarea. Cada tarea es unívoca, acotada y verificable. Antes de iniciar, el agente debe leer `02_tecnologias.md` (stack obligatorio) y `03_requerimientos.md` (qué debe cumplir cada entregable).

## Convenciones para el agente de IA

- **Repositorio**: monorepo con 3 paquetes: `apps/backend` (NestJS), `apps/web` (React), `apps/mobile` (Flutter).
- **Ramas**: `feature/<fase>-<tarea-corta>` (ej. `feature/f3-motor-contraste`). Un PR por tarea o por grupo pequeño de tareas relacionadas.
- **Commits**: convención `tipo(alcance): descripción` (`feat`, `fix`, `test`, `docs`, `chore`).
- **Definición de "hecho" (Definition of Done) por tarea**:
  1. Código implementado siguiendo el stack de `02_tecnologias.md`.
  2. Pruebas automatizadas cuando la tarea involucre lógica de negocio (unitarias en backend, widget/unit en Flutter).
  3. Endpoint documentado en Swagger/OpenAPI si aplica.
  4. Sin errores de lint/build.
  5. Si la tarea tiene una pantalla equivalente en el mockup (`mockup_app_control_materiales.html`), la UI implementada debe replicar los campos, estados y flujos ahí definidos — el mockup es la fuente de verdad visual.
- **Ambigüedad**: si una tarea es ambigua, el agente debe resolverla primero contra el mockup, luego contra `03_requerimientos.md`, y documentar la decisión tomada en el PR.
- **No agregar dependencias de pago** sin marcarlo explícitamente como excepción — ver restricción de costo en `03_requerimientos.md`.

---

## Fase 0 — Preparación del entorno (previa, no facturable al cliente)

| # | Tarea | Criterio de aceptación |
|---|---|---|
| 0.1 | Crear monorepo con carpetas `apps/backend`, `apps/web`, `apps/mobile`, `docs/` | Estructura versionada en Git, README raíz con instrucciones de arranque |
| 0.2 | Configurar Docker Compose local: PostgreSQL, Redis, MinIO | `docker compose up` levanta los 3 servicios sin errores |
| 0.3 | Configurar linters/formatters (ESLint+Prettier en backend/web, `dart format`+`flutter_lints` en mobile) | `lint` pasa en los 3 paquetes |
| 0.4 | Configurar GitHub Actions básico (build + lint + test por paquete) | Pipeline verde en la primera PR |

---

## Fase 1 — Base de Materiales (2–3 semanas)

**Objetivo:** dejar el catálogo maestro de materiales de la empresa listo, limpio y conectado al sistema.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 1.1 | Auditar la base de datos de materiales existente | Exportar el catálogo actual, detectar duplicados, códigos huérfanos, unidades inconsistentes | Reporte de auditoría (`docs/auditoria-materiales.md`) con hallazgos y propuesta de normalización |
| 1.2 | Diseñar el modelo `Material` (catálogo maestro) | Campos: `id`, `codigo`, `descripcion`, `unidad`, `categoria`, `activo`, `created_at`, `updated_at` | Migración Prisma aplicada, tabla creada |
| 1.3 | Construir script ETL de importación | Del origen (Excel/BD existente) hacia PostgreSQL, con validación de duplicados por `codigo` | Ejecuta sin errores sobre el dataset real, reporta filas importadas/rechazadas |
| 1.4 | Definir el contrato de integración con el sistema de materiales existente | Documentar si es vía API, exportación periódica de archivo, o conexión directa a BD; documentar endpoints/tablas fuente | Documento de integración aprobado antes de continuar (dependencia crítica) |
| 1.5 | Implementar servicio de sincronización con el sistema de materiales existente | Job programado o endpoint on-demand que actualiza el catálogo maestro | Corrida de prueba trae cambios nuevos sin duplicar registros |
| 1.6 | Endpoint `GET /materials` con búsqueda y filtros | Filtro por código, descripción, categoría, estado activo | Devuelve resultados paginados y filtrados correctamente |
| 1.7 | Pruebas unitarias del modelo y del ETL | Casos: material duplicado, unidad inválida, campo vacío | Cobertura de los casos límite documentados en 1.1 |

---

## Fase 2 — Creación del Sistema Base (3–4 semanas)

**Objetivo:** arquitectura, autenticación, control de acceso y ambiente de despliegue funcionando.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 2.1 | Inicializar backend NestJS | Módulos base: `AuthModule`, `UsersModule`, `ProjectsModule`, `MaterialsModule` | Servidor arranca, `GET /health` responde 200 |
| 2.2 | Configurar Prisma + PostgreSQL | Esquema inicial de acuerdo al modelo de datos completo (ver `03_requerimientos.md`) | `prisma migrate dev` corre sin errores |
| 2.3 | Implementar autenticación JWT + refresh tokens | Endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` | Login válido devuelve access+refresh token; token expirado se renueva |
| 2.4 | Implementar RBAC | Roles: `administrador`, `supervisor`, `trabajador`, `cliente`. Guard `@Roles()` por endpoint | Endpoint protegido rechaza rol no autorizado con 403 |
| 2.5 | Implementar scoping por proyecto | Guard/middleware que valida pertenencia usuario-proyecto en cada request con `projectId` | Usuario sin acceso al proyecto recibe 403 aunque el rol sea correcto |
| 2.6 | Documentar API con Swagger/OpenAPI | Servido en `/docs` | Todos los endpoints de Fase 1–2 documentados |
| 2.7 | Configurar entorno de staging | Provisionar VM en Oracle Cloud (Always Free), Docker Compose en producción, dominio + HTTPS (Let's Encrypt o túnel Cloudflare) | Staging accesible por HTTPS con login funcional |
| 2.8 | Inicializar app web React | Estructura de carpetas por feature, routing, cliente HTTP (React Query) apuntando al backend | Pantalla de login renderiza y autentica contra el backend real |
| 2.9 | Inicializar app Flutter (solo Android) | Estructura data/domain/presentation, configuración de entorno (dev/staging), target exclusivo Android | App compila en Android/emulador Android y hace login contra staging |

---

## Fase 3 — Declaración y Control de Materiales (3–4 semanas)

**Objetivo:** motor de contraste cotizado / capturado / recibido, y reporte resumen al cliente.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 3.1 | Modelar `MaterialCotizado`, `MaterialCapturado`, `MaterialExtra`, `DeclaracionMaterial` | `DeclaracionMaterial` con estado enum: `declarado_cliente`, `declarado_cotizado`, `real_recibido` | Migraciones aplicadas, relaciones con `Proyecto` y `Material` correctas |
| 3.2 | Endpoint de carga de listado cotizado por proyecto | Importación desde Excel/CSV | Carga masiva sin duplicar materiales ya cotizados en el proyecto |
| 3.3 | Endpoint de registro de material capturado en campo | Consumido por la app móvil (ver Fase 6) | Registra cantidad, fecha, ubicación, evidencia, proyecto |
| 3.4 | Endpoint de registro de materiales extra | Fuera del alcance cotizado original | Se marca automáticamente como "fuera de alcance" |
| 3.5 | Pantalla web "Declaración de materiales" | Tabla editable con los 3 estados, filtrable por proyecto | Un usuario admin/supervisor puede declarar un material en los 3 estados desde la UI |
| 3.6 | Motor de contraste automático | Compara cotizado vs. capturado vs. recibido; calcula "dentro de alcance" / "fuera de alcance" por material | Ante un material no cotizado con captura, el sistema lo marca "fuera de alcance" automáticamente |
| 3.7 | Endpoint de resumen/traducción del listado para el cliente | Arma un reporte simplificado sin datos operativos internos | Reporte solo expone campos permitidos para el rol Cliente (ver RNF de roles) |
| 3.8 | Pruebas de integración del motor de contraste | Casos: material no cotizado, cantidad excedida, material duplicado en dos declaraciones | Casos límite cubiertos y documentados |

---

## Fase 4 — Usuarios y Proyectos (3 semanas)

**Objetivo:** administración de usuarios, proyectos, plan de trabajo e hitos.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 4.1 | CRUD de usuarios | Alta, baja, edición, asignación de rol | Solo Administrador puede ejecutar estas operaciones |
| 4.2 | Asignación usuario-proyecto (N:M) | Tabla intermedia `ProjectMembers` | Un usuario solo ve proyectos donde tiene membresía |
| 4.3 | CRUD de proyectos | Nombre, cliente, fecha inicio, fecha fin estimada | Replica el flujo de la pantalla "Crear proyecto" del mockup |
| 4.4 | CRUD de hitos por proyecto | Nombre, fecha objetivo, estatus | Se pueden agregar/editar/eliminar hitos desde la pantalla de creación de proyecto |
| 4.5 | Pantalla web "Proyectos" (Administrador) | Listado, filtros, acceso a detalle/edición | Administrador ve todos los proyectos |
| 4.6 | Pantalla web/móvil "Proyectos" (Trabajador/Supervisor) | Solo proyectos asignados, plan de trabajo visible | Un trabajador no ve proyectos donde no está asignado |
| 4.7 | Pruebas de control de acceso por proyecto | Usuario A no debe poder leer/escribir datos del proyecto B | Intento cruzado devuelve 403 |

---

## Fase 5 — Pantalla de Avances (2–3 semanas)

**Objetivo:** registrar avances planeados y no planeados, incluyendo ambos en un mismo reporte de captura.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 5.1 | Modelar entidad `Avance` y `AvanceItem` | `Avance` (proyecto, fecha, frente, autor) tiene N `AvanceItem` con `tipo` (planeado/no_planeado), `subtipo` (retrabajo/extra/modificacion, solo si no_planeado), `material_id` o `material_manual`, `cantidad` | Un mismo `Avance` admite items planeados y no planeados mezclados |
| 5.2 | Endpoint `POST /avances` que acepta ambos apartados en un solo payload | Replica el mockup: sección "Avance planeado" (material de catálogo) + sección "Avance no planeado" (subtipo + material manual) | Un solo request puede crear un avance con 2 items planeados y 1 no planeado, por ejemplo |
| 5.3 | Validación de negocio | Material manual obligatorio solo si `tipo=no_planeado`; `material_id` obligatorio si `tipo=planeado` | Rechaza payloads inconsistentes con error claro |
| 5.4 | Pantalla web de consulta de avances | Filtros por proyecto, tipo, subtipo, rango de fecha | Lista y permite exportar |
| 5.5 | Cálculo de avance acumulado y diario por proyecto | Job/función que agrega `AvanceItem` por fecha y por proyecto | Alimenta correctamente los dashboards de Fase 7 (vista general y vista diaria) |

---

## Fase 6 — App de Campo Offline (5–6 semanas)

**Objetivo:** captura 100% funcional sin conexión, con sincronización automática.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 6.1 | Configurar SQLite local (Drift) | Tablas espejo: avances, avance_items, incidentes, tiempos_muertos, cola_sincronizacion | Esquema local coherente con el backend |
| 6.2 | Pantalla de login offline-aware | Selector de rol, sesión persistida localmente | Login exitoso sin red si ya hubo sesión previa cacheada |
| 6.3 | Pantalla de captura diaria — encabezado | Proyecto, Fecha, Frente | Valores persistidos localmente antes de guardar el registro completo |
| 6.4 | Pantalla de captura diaria — apartado "Avance planeado" | Selector de material de catálogo (sincronizado localmente), cantidad, botón "Agregar" que suma a una lista editable | Se pueden agregar N materiales planeados a un mismo registro |
| 6.5 | Pantalla de captura diaria — apartado "Avance no planeado" | Subtipo (retrabajo/extra/modificación), material en texto libre, cantidad, botón "Agregar" con su propia lista | Se pueden agregar N materiales no planeados, independientes de los planeados |
| 6.6 | Guardado combinado del registro | Un solo botón "Guardar captura" persiste ambos apartados como un único `Avance` con sus `AvanceItem` | Registro local queda completo y marcado como `pendiente_sincronizacion` |
| 6.7 | Captura de evidencia fotográfica | Cámara nativa, almacenamiento local vinculado al registro | Foto se asocia correctamente al avance/incidente correspondiente |
| 6.8 | Georreferenciación automática | GPS al momento de la captura | Coordenadas guardadas junto al registro sin intervención manual |
| 6.9 | Pantalla de incidentes | Categorías configurables (traídas del catálogo sincronizado) | Registro de incidente funciona offline |
| 6.10 | Pantalla de tiempos muertos | Causa, duración, frente | Registro funciona offline |
| 6.11 | Motor de sincronización | Cola local + detección de conectividad (Wi-Fi/datos) + envío batch al backend | Al recuperar conexión, todos los registros pendientes se envían sin duplicarse |
| 6.12 | Resolución de conflictos | Comparación por timestamp/versión; bitácora de auditoría de cambios | Conflicto simulado (mismo registro editado en 2 dispositivos) se resuelve sin pérdida de datos |
| 6.13 | Indicador visual de estado de sincronización | Badge "Sin conexión" / "Sincronizado" en cada pantalla relevante | Refleja en tiempo real el estado real de la cola |
| 6.14 | Prueba de campo controlada | Captura continua 24–48h en modo avión, luego reconexión | 100% de los registros capturados aparecen en el backend tras sincronizar |

---

## Fase 7 — Dashboards Tecnogam y Cliente (4–5 semanas)

**Objetivo:** visualización de métricas con vista general y vista diaria consistentes en todo el panel.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 7.1 | Endpoints de métricas agregadas | Avance (general/diario), material instalado, incidentes abiertos, tiempo muerto — parametrizados por proyecto y por fecha | Devuelven datos correctos para ambos modos |
| 7.2 | Toggle global "Vista general / Vista diaria" | Un solo control que reconfigura tarjetas de métricas, gráfica, panel de incidentes y tabla de proyectos | Cambiar el toggle actualiza *todos* los componentes de la pantalla de forma consistente, sin mezclar datos de ambos modos |
| 7.3 | Gráfica "Avance planeado vs. real" — modo acumulado | Diagrama de áreas de doble línea (planeado/real) por semana | Coincide con los datos agregados de 7.1 |
| 7.4 | Gráfica "Avance planeado vs. real" — modo diario | Barras agrupadas planeado/real por periodo | Coincide con los datos agregados de 7.1 |
| 7.5 | Panel de incidentes | "Últimos incidentes" (vista general) / "Incidentes de hoy" (vista diaria) | Cambia de contenido y título según el toggle |
| 7.6 | Tabla de proyectos | Columna "Avance" (general) o "Avance hoy" (diario) según el toggle | Refleja el modo activo |
| 7.7 | Dashboard Cliente | Avance total, estado de materiales (cotizado/recibido/instalado), resumen de materiales con badge dentro/fuera de alcance | Solo expone los campos permitidos para el rol Cliente |
| 7.8 | Exportación de reporte cliente | PDF/Excel con el resumen del Dashboard Cliente | Archivo descargable coherente con lo mostrado en pantalla |
| 7.9 | Prueba de carga ligera | Simular 10 usuarios concurrentes sobre 4 proyectos activos | Tiempos de respuesta aceptables (< 1s en endpoints de dashboard) |

---

## Fase 8 — Pruebas, Ajustes y Despliegue (2–3 semanas)

**Objetivo:** salida a producción confiable.

| # | Tarea | Detalle | Criterio de aceptación |
|---|---|---|---|
| 8.1 | Pruebas end-to-end de flujos críticos | Captura offline → sincronización → declaración → dashboard | Flujo completo sin errores ni pérdida de datos |
| 8.2 | Matriz de pruebas de control de acceso | Los 4 roles × todos los módulos | Ningún acceso indebido detectado |
| 8.3 | Pruebas de conectividad intermitente | Simulación de wifi intermitente/modo avión en la app móvil | Sin duplicados ni pérdida de registros |
| 8.4 | Piloto con usuarios reales | 1 trabajador, 1 supervisor, 1 administrador | Retroalimentación documentada y ajustes de UX aplicados |
| 8.5 | Respaldos automáticos | `pg_dump` programado hacia almacenamiento de objetos (MinIO/Oracle Object Storage) | Restauración de prueba exitosa desde un respaldo reciente |
| 8.6 | Monitoreo y alertas | Grafana + Prometheus o Sentry (capa gratuita) | Alerta de prueba disparada correctamente |
| 8.7 | Manual de usuario por rol | Documento breve por perfil (Trabajador, Supervisor, Administrador, Cliente) | Entregado y validado con el cliente |
| 8.8 | Capacitación a usuarios finales | Sesión por rol | Registro de asistencia y dudas resueltas |
| 8.9 | Despliegue a producción | Checklist de salida a producción (variables de entorno, dominio, HTTPS, respaldos activos, monitoreo activo) | Sistema operando en producción con los 4 roles funcionando |
| 8.10 | Plan de soporte post-lanzamiento | Ventana de garantía, canal de reporte de incidencias | Documento acordado con el cliente |

---

**Duración total estimada:** 24 a 31 semanas (6 a 7.5 meses), sin contar Fase 0. Ajustable según tamaño del equipo y complejidad real de la integración con el sistema de materiales existente (dependencia crítica de la Fase 1).
