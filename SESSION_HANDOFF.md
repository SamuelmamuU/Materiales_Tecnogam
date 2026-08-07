# Handoff de Sesión - Sistema de Control de Materiales

Este documento resume el estado actual del **"Sistema de Control de Materiales, Avances y Seguimiento de Proyecto"** para Tecnogam.

---

## 1. Objetivo General del Proyecto
Crear una aplicación multiplataforma (**Android** + **Web de escritorio**) para capturar avances diarios en campo, controlar materiales cotizados/recibidos/instalados y dar seguimiento al proyecto con 4 roles de usuario (Administrador, Supervisor, Trabajador, Cliente) bajo una arquitectura offline-first.

---

## 2. Estado Actual del Proyecto y Avance por Fases

* **Fase 1 (Base de Materiales):** **COMPLETADO**. Catálogo maestro normalizado (2,299 materiales), Prisma schema sincronizado y ETL local de importación funcional con pruebas unitarias Jest.
* **Fase 2 (Creación del Sistema Base):** **COMPLETADO**. Prisma migrations, sembrado de base de datos base, autenticación JWT, guards RBAC y Project Guard (scoping), Swagger interactivo `/docs`, y pantallas iniciales de Login en React y Flutter.
* **Fase 3 (Declaración y Control de Materiales / Captura en Móvil):** **COMPLETADO**.
  * **Storage:** API `POST /media/upload` conectada a MinIO con auto-creación del bucket de evidencias y políticas públicas.
  * **Idempotencia:** Endpoints `POST /avances`, `POST /tiempos-muertos` y `POST /incidentes` en backend de-duplicando capturas por UUID.
  * **Persistencia Local Móvil:** SQLite local en Flutter con bitácora de sincronización.
  * **Sincronizador:** Algoritmo en Dart con autorefresh de JWT expilados.
  * **Pruebas Unitarias:** Cobertura Jest completa para `AvancesService` y `MediaService` (Validación de tipos de archivos, transacciones e idempotencia).
* **Fase 4 (Usuarios y Proyectos):** **COMPLETADO**.
  * **Admin CRUD en Backend:** Endpoints dedicados para crear/editar/eliminar Usuarios, crear/editar/eliminar Proyectos, hitos y membresías (Scoping).
  * **Panel Web de Administración:** Desarrollado un completo panel administrativo responsivo en React (Vite + Tailwind v4) para administradores y supervisores que permite:
    * Monitorear KPIs (Avance real vs cotizado, incidentes abiertos, tiempos muertos).
    * Resolver incidentes en línea de forma interactiva.
    * Crear/editar proyectos, registrar hitos (milestones) y gestionar membresías de obra.
    * Crear/editar/eliminar usuarios y roles.
    * Gráficos interactivos de conciliación mediante conic-gradients de CSS puro.
    * Exportar reportes en PDF con estilos de impresión optimizados (hiding menus/sidebar, formatting tables).

---

## 3. Features Implementadas vs. Pendientes

### Implementadas:
* [x] Catálogo maestro de materiales saneado (2,299 registros).
* [x] Autenticación JWT y guards de rol y scoped proyecto en API.
* [x] CRUD local SQLite para avances, incidentes y tiempos muertos en Flutter.
* [x] Sincronización en lotes con idempotencia.
* [x] Carga de evidencias en MinIO S3.
* [x] Dashboard de Control en React con KPIs de avances y tiempos.
* [x] Consola de Administración Web (CRUD Usuarios, Proyectos, Hitos, Miembros).
* [x] Reporte de Conciliación de Carga e Impresión optimizada a PDF.

### Pendientes (Siguiente sesión / Fase 5):
* [ ] Integrar el plugin de cámara nativa y GPS en el cliente móvil (actualmente simulado con mock URL e ID local).
* [ ] Implementar la Fase 5: Módulo de Sincronización Avanzada de Campo (Descarga de catálogo local e hitos desde el backend al móvil).

---

## 4. Archivos Modificados / Creados Clave

### Backend (`apps/backend`):
* [src/users/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/users/): `users.controller.ts` (creado), `users.service.ts` y `users.module.ts` (actualizados con CRUD admin).
* [src/projects/](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/projects/): `projects.controller.ts` y `projects.service.ts` (actualizados con Dashboard y CRUD admin).
* [src/avances/avances.service.spec.ts](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/avances/avances.service.spec.ts): Pruebas de transacción e idempotencia.
* [src/media/media.service.spec.ts](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/media/media.service.spec.ts): Pruebas de subida S3 y restricciones de tipos.

### Frontend Web (`apps/web`):
* [src/App.tsx](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.tsx): Dashboard de KPIs, conciliación, bitácoras y panel de control administrativo.
* [src/App.css](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.css): Estilos print media para PDF limpio.
* [src/main.tsx](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/main.tsx): Importación de estilos css.

---

## 5. Bugs Conocidos
* Ninguno. Toda la suite de backend Jest corre limpia y el build estático de Vite React compila al 100%.

---

## 6. Siguiente Acción Recomendada
1. Levantar el ecosistema local para probar los flujos integrados:
   * Backend: `npm run start:dev` en `apps/backend`.
   * Frontend: `npm run dev` en `apps/web`.
2. Continuar con la **Fase 5 (Módulo de Sincronización y Revisión en campo)**, habilitando la cámara real y GPS en el móvil, y sincronizando el catálogo de materiales del backend hacia la base de datos local SQLite del móvil.
