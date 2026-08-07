# Handoff de Sesión - Sistema de Control de Materiales

Este documento resume el estado actual del **"Sistema de Control de Materiales, Avances y Seguimiento de Proyecto"** para Tecnogam.

---

## 1. Objetivo General del Proyecto
Crear una aplicación multiplataforma (**Android** + **Web de escritorio**) para capturar avances diarios en campo, controlar materiales cotizados/recibidos/instalados y dar seguimiento al proyecto con 4 roles de usuario (Administrador, Supervisor, Trabajador, Cliente) bajo una arquitectura offline-first.

---

## 2. Estado Actual del Proyecto y Avance por Fases

* **Fase 1 (Base de Materiales):** **COMPLETADO**. Catálogo maestro normalizado (2,299 materiales), Prisma schema sincronizado y ETL local de importación funcional con pruebas unitarias Jest.
* **Fase 2 (Creación del Sistema Base):** **COMPLETADO**. Prisma migrations, sembrado de base de datos base, autenticación JWT, guards RBAC y Project Guard (scoping), Swagger interactivo `/docs`, y pantallas iniciales de Login en React y Flutter.
* **Fase 3 (Declaración y Control de Materiales):** **COMPLETADO**. Motor de contraste cotizado/recibido/instalado en backend, carga masiva, y pantalla de conciliación.
* **Fase 4 (Usuarios y Proyectos):** **COMPLETADO**.
  * CRUD completo en backend y frontend para Usuarios, Proyectos, Hitos y Membresías.
* **Fase 5 (Pantalla de Avances):** **COMPLETADO**.
  * **Validación de Negocio:** Verificación en `POST /avances` de materiales de catálogo para planeados y manuales para no planeados (Tarea 5.3).
  * **Bitácora Histórica:** Filtros avanzados por tipo/rango de fecha y tabla detallada con fotos en frontend React (Tarea 5.4).
  * **Cálculo de Progreso:** Algoritmo en NestJS que calcula y proyecta la distribución diaria y acumulada real vs. planeada (Tarea 5.5).
* **Fase 6 (App Móvil Offline):** **COMPLETADO/EN CURSO**.
  * SQLite local configurado, pantallas de captura diaria (planeados, no planeados, incidentes, tiempos muertos) y sincronización con de-duplicación por UUID e idempotencia listas.
  * *Pendiente:* Integrar plugin físico de cámara y GPS en Flutter (actualmente emulado por mocks).
* **Fase 7 (Dashboards Tecnogam y Cliente):** **COMPLETADO**.
  * **Gráfico S-Curve:** Renderizador dinámico en SVG puro (sin dependencias externas) que muestra la curva acumulativa planeada vs. real (S-Curve) y gráficos de barras agrupadas para el modo diario (Tareas 7.3/7.4).
  * **Toggle General/Diario:** Control reactivo al inicio que reestructura los KPIs y gráficos según el modo seleccionado (Tarea 7.2).

---

## 3. Features Implementadas vs. Pendientes

### Implementadas:
* [x] Catálogo maestro de materiales saneado (2,299 registros).
* [x] Autenticación JWT y guards de rol y scoped proyecto en API.
* [x] CRUD local SQLite para avances, incidentes y tiempos muertos en Flutter.
* [x] Sincronización en lotes con idempotencia.
* [x] Carga de evidencias en MinIO S3.
* [x] Dashboard de Control en React con KPIs de avances y tiempos.
* [x] Gráficos interactivos de S-Curve y Barras agrupadas en SVG puro.
* [x] Bitácora Histórica de avances diarios con filtros de fecha y tipo.
* [x] Consola de Administración Web (CRUD Usuarios, Proyectos, Hitos, Miembros).
* [x] Reporte de Conciliación de Carga e Impresión optimizada a PDF.

### Pendientes:
* [ ] Integrar el plugin físico de cámara y GPS en el cliente móvil (actualmente simulado).
* [ ] Configuración final de Staging en nube y pruebas E2E multi-usuario.

---

## 4. Archivos Modificados / Creados Clave

### Backend (`apps/backend`):
* [src/users/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/users/): `users.controller.ts` y `users.service.ts` (CRUD admin).
* [src/projects/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/projects/): `projects.controller.ts` y `projects.service.ts` (Dashboard y CRUD admin).
* [src/avances/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/avances/): `avances.controller.ts` y `avances.service.ts` (Validaciones, Historial, S-Curve).

### Frontend Web (`apps/web`):
* [src/App.tsx](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.tsx): Dashboard de KPIs, historial de avances con filtros, S-Curve SVG, y paneles de administración.
* [src/App.css](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.css): Estilos print media para PDF limpio.

---

## 5. Bugs Conocidos
* Ninguno. Toda la suite de backend Jest corre limpia y el build estático de Vite React compila al 100%.

---

## 6. Siguiente Acción Recomendada
1. Levantar el ecosistema local para probar los flujos integrados:
   * Backend: `npm run start:dev` en `apps/backend`.
   * Frontend: `npm run dev` en `apps/web`.
2. Proceder a configurar el entorno de producción/staging o realizar pruebas de extremo a extremo (Fase 8).
