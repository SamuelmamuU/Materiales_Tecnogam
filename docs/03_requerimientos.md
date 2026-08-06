# Requerimientos a Cumplir — Sistema de Control de Materiales

## 1. Requerimientos no funcionales (restricciones obligatorias)

| ID | Requerimiento | Descripción |
|---|---|---|
| RNF-01 | Multiplataforma (móvil Android + web) | La aplicación debe poder ejecutarse desde cualquier dispositivo móvil **Android** y también desde computadora (navegador de escritorio). iOS queda fuera de alcance en esta etapa del proyecto. |
| RNF-02 | Multiusuario con roles | Debe soportar cuatro perfiles: Trabajador, Supervisor, Administrador y Cliente (lectura). |
| RNF-03 | Multi-proyecto con control de acceso independiente | Un usuario solo debe ver y operar sobre los proyectos a los que fue asignado explícitamente. |
| RNF-04 | Operación offline | La app de campo debe funcionar 100% sin conexión a internet, guardando localmente, y sincronizar automáticamente al recuperar Wi-Fi o datos móviles. |
| RNF-05 | Herramientas sin costo | Todo el stack de desarrollo debe ser software libre / open source. Ver `02_tecnologias.md`. Única excepción posible: hospedaje en la nube al escalar más allá de la capa gratuita. |
| RNF-06 | Resolución de conflictos de sincronización | Ante ediciones concurrentes del mismo registro en distintos dispositivos, el sistema debe resolver por timestamp/versión y mantener bitácora de auditoría. |
| RNF-07 | Rendimiento a escala objetivo | Debe soportar de forma fluida 4 proyectos simultáneos y 10 perfiles de usuario, con tiempos de respuesta de dashboard menores a 1 segundo. |
| RNF-08 | Seguridad de acceso | Autenticación por token (JWT + refresh) y autorización por rol y por proyecto en cada endpoint. |
| RNF-09 | Respaldo de datos | Respaldos automáticos programados de la base de datos, con procedimiento de restauración verificado. |
| RNF-10 | Sin dependencia de infraestructura personal | Descartado el uso de NAS personal como servidor de producción; se usa hospedaje en la nube (Oracle Cloud Free Tier u opción equivalente). |

## 2. Roles y permisos

| Rol | Alcance |
|---|---|
| **Administrador** | Gestión total: crea proyectos, usuarios, catálogo de materiales, planes de trabajo e hitos. Acceso a todos los dashboards y reportes de todos los proyectos. |
| **Supervisor** | Gestión operativa de uno o varios proyectos asignados: valida capturas de trabajadores, da seguimiento a avances, incidentes y tiempos muertos, revisa contraste de materiales. |
| **Trabajador** | Captura diaria en campo: instalación de materiales, avances, incidentes, tiempos muertos. Acceso limitado a los proyectos/frentes de trabajo asignados. |
| **Cliente (lectura)** | Acceso de solo lectura al Dashboard Cliente: overview de avance del proyecto y estado de materiales, sin visibilidad de datos operativos internos. |

## 3. Requerimientos funcionales por módulo

### RF-1 · Base de Materiales
- RF-1.1 Revisar y depurar la base de datos de materiales existente antes de incorporarla al sistema.
- RF-1.2 Incorporar el catálogo depurado como catálogo maestro del sistema.
- RF-1.3 Conectar/integrar con el sistema de materiales ya utilizado por la empresa (dependencia crítica del proyecto).

### RF-2 · Declaración y Contraste de Materiales
- RF-2.1 Registrar listado de materiales cotizado por proyecto.
- RF-2.2 Registrar listado de materiales capturado en campo (vinculado a la app móvil).
- RF-2.3 Registrar listado de materiales extra (fuera del alcance original).
- RF-2.4 Pantalla de declaración de materiales con tres estados: **Declarado por cliente**, **Declarado/cotizado**, **Real o recibido**.
- RF-2.5 Motor de contraste automático: cotizado vs. capturado en campo vs. recibido, calculando materiales dentro y fuera de alcance.
- RF-2.6 Generar un resumen/traducción del listado, simplificado, para el overview del cliente (sin datos operativos internos).

### RF-3 · Usuarios y Proyectos
- RF-3.1 Alta, baja, edición y asignación de rol de usuarios (solo Administrador).
- RF-3.2 Control de acceso por proyecto: asignación explícita de usuarios a proyectos.
- RF-3.3 Pantalla de creación de proyecto (Administrador): nombre, cliente, fecha de inicio, fecha fin estimada.
- RF-3.4 Plan de trabajo por proyecto con hitos (nombre, fecha objetivo, estatus), editable desde la misma pantalla de creación/edición de proyecto.
- RF-3.5 Asignación de equipo (supervisores/trabajadores) al proyecto desde la pantalla de creación.
- RF-3.6 Pantalla de proyectos para Administrador: todos los proyectos.
- RF-3.7 Pantalla de proyectos para Trabajador/Supervisor: solo proyectos asignados, con plan de trabajo visible.

### RF-4 · Captura de Campo (App móvil, offline)
- RF-4.1 Captura diaria de instalación de materiales: cantidad, ubicación (GPS automático), evidencia fotográfica.
- RF-4.2 Un mismo registro/reporte diario debe permitir capturar **avance planeado** y **avance no planeado** de forma simultánea, cada uno como un apartado independiente dentro del mismo formulario:
  - **Apartado "Avance planeado"**: selección de material desde el catálogo (menú), cantidad, botón para agregar múltiples materiales a una lista.
  - **Apartado "Avance no planeado"**: subtipo (Retrabajo / Trabajo extra / Modificación), material capturado **manualmente en texto libre** (no desde menú, ya que puede no existir en catálogo), cantidad, botón para agregar múltiples materiales a su propia lista.
  - Ambos apartados se guardan juntos con un único botón "Guardar captura".
- RF-4.3 Registro de personal, horarios y condiciones de trabajo en sitio.
- RF-4.4 Pantalla de incidentes con categorías configurables.
- RF-4.5 Pantalla de tiempos muertos.
- RF-4.6 Indicador visual de estatus de sincronización (pendiente / sincronizado) visible en cada pantalla relevante.

### RF-5 · Avances (consulta y agregación)
- RF-5.1 Consulta de avances por proyecto, con filtros por tipo (planeado/no planeado), subtipo y rango de fecha.
- RF-5.2 Cálculo de porcentaje de avance **acumulado** (histórico del proyecto) y **diario** (del día/periodo actual), ambos disponibles para alimentar los dashboards.

### RF-6 · Dashboards y Reportes

**Dashboard Tecnogam (interno — Administrador/Supervisor):**
- RF-6.1 Métricas: material instalado vs. cotizado vs. recibido, personal en sitio y horarios, condiciones de trabajo, localización de frentes de trabajo, plan de trabajo y avance contra hitos, categorías de incidentes y su frecuencia, porcentajes y rendimientos generales.
- RF-6.2 **Control global de vista**: un selector "Vista general" / "Vista diaria" que afecta **todo el dashboard de forma consistente** — no solo la gráfica, sino también las tarjetas de métricas, el panel de incidentes y la tabla de proyectos. Ver mockup para el comportamiento esperado.
- RF-6.3 Gráfica de avance planeado vs. real:
  - Modo **Acumulado**: diagrama de áreas de doble línea.
  - Modo **Diario**: barras agrupadas por periodo.
- RF-6.4 Panel de incidentes que cambia entre "Últimos incidentes" (vista general) e "Incidentes de hoy" (vista diaria).
- RF-6.5 Tabla de proyectos que cambia su columna de avance entre "Avance total" y "Avance de hoy" según el modo activo.

**Dashboard Cliente:**
- RF-6.6 Overview general del proyecto: % de avance, materiales dentro/fuera de alcance.
- RF-6.7 Estado de materiales (cotizado / recibido / instalado) sin exponer datos operativos internos.
- RF-6.8 Reporte descargable en PDF/Excel.

### RF-7 · Sincronización Offline
- RF-7.1 Motor local de almacenamiento (SQLite) en cada dispositivo.
- RF-7.2 Cola de sincronización automática al detectar Wi-Fi/datos.
- RF-7.3 Resolución de conflictos por versión/timestamp, con bitácora de auditoría de cambios.
- RF-7.4 Indicador visual de estatus de sincronización.

## 4. Modelo de datos — entidades principales

| Entidad | Descripción |
|---|---|
| Proyecto | Datos generales, cliente asociado, plan de trabajo, hitos, estatus. |
| Usuario | Perfil, rol (Administrador/Supervisor/Trabajador/Cliente), proyectos asignados. |
| Material (Catálogo) | Catálogo maestro proveniente de la base de datos existente de la empresa. |
| MaterialCotizado | Listado de materiales cotizado por proyecto. |
| MaterialCapturado | Registros de campo: cantidad instalada, fecha, ubicación, evidencia. |
| MaterialExtra | Materiales fuera del alcance original cotizado. |
| DeclaracionMaterial | Estado por material: declarado cliente / declarado cotizado / real recibido. |
| Avance | Encabezado de captura diaria: proyecto, fecha, frente, autor. |
| AvanceItem | Línea de material dentro de un Avance: tipo (planeado/no planeado), subtipo (retrabajo/extra/modificación — solo si no planeado), material (catálogo o texto libre), cantidad. |
| Incidente | Categoría, descripción, fecha, ubicación, proyecto asociado. |
| TiempoMuerto | Causa, duración, proyecto, frente de trabajo. |
| Hito | Nombre, fecha objetivo, estatus, proyecto asociado. |
| BitacoraSincronizacion | Registro de cambios locales/remotos y su estatus de sincronización. |

## 5. Requerimientos de UI (según mockup de referencia)

El archivo `mockup_app_control_materiales.html` es la referencia visual obligatoria para las siguientes pantallas; cualquier ambigüedad de layout, campos o flujo debe resolverse consultándolo:

1. Login (con selector de perfil).
2. App móvil — Captura diaria (con los apartados "Avance planeado" y "Avance no planeado" descritos en RF-4.2).
3. BOM de materiales (importar/agregar materiales al catálogo, tabla con estado de carga).
4. Crear proyecto (Administrador) — datos generales, hitos, asignación de equipo.
5. Dashboard Administrador — con el toggle global "Vista general/Vista diaria" (RF-6.2).
6. Dashboard Cliente.

## 6. Fuera de alcance

- **iOS**: la app de campo se desarrolla únicamente para Android en esta etapa del proyecto.
- Uso de un NAS personal como servidor de producción (descartado explícitamente).
- Cualquier herramienta o servicio que requiera licencia de pago obligatoria sin alternativa gratuita equivalente.
