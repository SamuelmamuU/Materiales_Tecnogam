# HANDOFF DEL PROYECTO - SISTEMA DE CONTROL DE MATERIALES TECNOGAM

**Fecha de Actualización:** 07 de Septiembre de 2026  
**Estado General:** **Desplegado en Producción sin errores**  
**Versión de Base de Datos:** Sincronizada y Migrada (Neon PostgreSQL)  
**CI/CD:** Pipeline de GitHub Actions 100% verde (Backend, Web, Mobile)

---

## 1. Resumen Ejecutivo de la Sesión

En esta sesión se desarrollaron, validaron y desplegaron con éxito 5 mejoras críticas funcionales y visuales solicitadas para los perfiles de **Administrador** y **Supervisor**, garantizando compatibilidad retroactiva total (*backward compatibility*) sin romper la versión previamente en producción.

---

## 2. Mejoras Implementadas en Esta Sesión

### 2.1 Búsqueda por Coincidencia Múltiple en Catálogo de Materiales
* **Problema anterior:** Las descripciones largas de los materiales dificultaban su localización si las palabras no se escribían en el orden exacto.
* **Solución Backend ([`materials.service.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/materials/materials.service.ts)):**
  * Se reescribió la consulta de búsqueda dividiendo el término (`search`) en palabras independientes (*tokens*).
  * Se aplica una condición `AND` donde cada palabra debe coincidir de manera insensible a mayúsculas/minúsculas (`mode: 'insensitive'`) en cualquiera de los campos: `codigo`, `descripcion` o `categoria`.
  * Pruebas unitarias actualizadas y aprobadas en [`materials.service.spec.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/materials/materials.service.spec.ts).
* **Solución Frontend ([`App.tsx`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.tsx)):**
  * Función auxiliar `matchesAllWords(text, query)` integrada en los filtros rápidos de autocompletado en el BOM y en el modal de registro de avances.

### 2.2 Selección y Eliminación Múltiple en Presupuesto (BOM)
* **Backend ([`projects.controller.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/projects/projects.controller.ts) / [`projects.service.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/projects/projects.service.ts)):**
  * Nuevo endpoint `POST /projects/:projectId/materials/bulk-delete` y `DELETE /projects/:projectId/materials` que recibe `{ materialIds: string[] }` y ejecuta un `deleteMany` transaccional.
  * Se mantiene la ruta existente de eliminación individual `DELETE /projects/:projectId/materials/:materialId`.
* **Frontend ([`App.tsx`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/App.tsx)):**
  * Casilla de verificación (*checkbox*) maestra en el encabezado de la tabla para seleccionar/deseleccionar todos los materiales.
  * Casillas individuales en cada fila con resaltado visual (`bg-red-50`).
  * Barra contextual flotante superior que indica la cantidad seleccionada, botón **"Eliminar Seleccionados"** con confirmación y botón para cancelar la selección.

### 2.3 Registro de Hitos de Proyecto con Semáforo de Estatus
* **Base de Datos ([`schema.prisma`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/prisma/schema.prisma)):**
  * `diasAlertaHito Int @default(7)` en tabla `proyectos` (umbral global configurable por proyecto).
  * `diasAlerta Int?` en tabla `hitos` (umbral específico por hito).
* **Lógica del Semáforo (`getHitoSemaforo`):**
  * 🟢 **Verde (En tiempo / Completado):** Si fue completado manualmente o faltan más de $N$ días para la fecha límite.
  * 🟠 **Naranja (Próximo a vencer):** Si restan $\le N$ días para la fecha objetivo ($N$ configurable por el administrador).
  * 🔴 **Rojo (Vencido):** Si la fecha actual superó la fecha objetivo sin haberse completado.
* **Interfaz de Usuario:**
  * **Vista General (Dashboard):** Tarjeta *Hitos Clave* con indicador visual tipo semáforo (punto de color y etiqueta con días restantes), leyenda explicativa al pie y botón rápido para alternar completitud (✓).
  * **Panel Admin:** Permite agregar hitos definiendo los días de alerta preventiva, alternar estado completado/pendiente y eliminarlos.
  * **Permisos:** Administradores y supervisores asignados al proyecto pueden actualizar el estatus del hito.

### 2.4 Ficha Técnica en Barra de Proyecto Activo y Edición (Admin y Supervisor)
* **Visualización en la Barra Superior:**
  * **Logo de la empresa cliente:** Renderiza la imagen cargada o un contenedor con icono y leyenda *"Sin Logo"*.
  * **Líderes de Proyecto:** Muestra el *Líder Cliente* y el *Líder Tecnogam*.
  * **Culminación y Fechas:** Badge de estatus **"Proyecto Culminado"** (con fecha real) o **"Proyecto En Ejecución"** (*En proceso*), junto a la fecha de inicio y fin estimado.
  * **Botón "Editar Ficha":** Disponible para **Administrador** y **Supervisor** (`isAdminOrSupervisor`).
* **Modal de Creación y Edición de Proyecto:**
  * Soporte para subir archivos de imagen directamente al servidor (`/media/upload`) con previsualización o ingresar una URL de imagen.
  * Campos para Líder Cliente, Líder Tecnogam y Fecha de Culminación real.
  * Configuración del umbral de días de alerta para el semáforo de hitos.
* **Controlador Backend:**
  * `PUT /projects/:projectId` habilitado para roles `@Roles('administrador', 'supervisor')` con protección estricta de membresía mediante `ProjectGuard`.

### 2.5 Logotipo Oficial de Tecnogam
* Se extrajo el logo oficial desde [`docs/TG.png`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/docs/TG.png) y se copió a [`apps/web/public/TG.png`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/public/TG.png) y [`apps/web/src/assets/TG.png`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/assets/TG.png).
* Aplicado en:
  * Favicon y título de pestaña en [`index.html`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/index.html).
  * Pantalla de Login ([`Login.tsx`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/pages/Login.tsx)).
  * Encabezado de la barra lateral de navegación (Sidebar).
  * Encabezado de los reportes impresos a PDF.

---

## 3. Correcciones de Estabilidad y Compatibilidad de Despliegue

1. **Resolución de Error 500 (`ECONNREFUSED`):**
   * Se configuró `dotenv` en el punto de entrada principal del backend ([`main.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/main.ts)) y en el servicio de Prisma ([`prisma.service.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/prisma/prisma.service.ts)) para asegurar la lectura de `DATABASE_URL` tanto en entornos locales como en servicios de hosting en la nube.
2. **Auditoría de Linter y CI/CD:**
   * Se corrigieron tipados inseguros (`as any` $\rightarrow$ `as string`) en [`auth.service.ts`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/backend/src/auth/auth.service.ts) y [`Login.tsx`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/src/pages/Login.tsx).
   * Se ajustó [`eslint.config.js`](file:///C:/Users/samue/Desktop/ControlMatTecnogam/apps/web/eslint.config.js) para compatibilidad multiplataforma con saltos de línea Prettier (`endOfLine: 'auto'`).
   * Verificación local exitosa de los 3 jobs del workflow de GitHub Actions:
     * `npm run lint` & `npm run test` & `npm run build` en Backend (0 errores).
     * `npm run lint` & `npm run build` en Frontend Web (0 errores).
     * `flutter analyze` & `flutter test` en Mobile (0 errores).

---

## 4. Guía de Ejecución Local para Retomar el Proyecto

### 4.1 Variables de Entorno Requeridas (`apps/backend/.env`)
```env
DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require"
PORT=3000
JWT_ACCESS_SECRET="super-secret-access-key-control-materiales"
JWT_REFRESH_SECRET="super-secret-refresh-key-control-materiales"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="evidencias"
```

### 4.2 Comandos de Inicio

#### Backend (NestJS - Puerto 3000)
```bash
cd apps/backend
npm install
npm run start:dev
```

#### Frontend Web (React + Vite - Puerto 5173)
```bash
cd apps/web
npm install
npm run dev
```

#### Aplicación Móvil (Flutter)
```bash
cd apps/mobile
flutter pub get
flutter run
```

---

## 5. Credenciales Sembradas de Prueba

| Rol | Correo Electrónico | Contraseña | Capacidades Principales |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@tecnogam.com` | `admin123` | Gestión total de usuarios, proyectos, hitos, BOM masivo y reportes. |
| **Supervisor** | `supervisor@tecnogam.com` | `super123` | Edición de ficha de proyecto asignado, captura de avances, resolución de hitos. |
| **Trabajador** | `trabajador@tecnogam.com` | `trabajador123` | Captura de avances diarios en campo y reporte de incidentes. |
| **Cliente** | `cliente@tecnogam.com` | `cliente123` | Visualización en tiempo real de avance de obra y hoja de conciliación. |

---

## 6. Próximos Pasos Recomendados al Retomar el Proyecto

1. **Gestión de Archivos en Nube (MinIO / S3):**
   * Levantar el contenedor Docker de MinIO (`infra/docker-compose.yml`) o configurar bucket S3 en AWS para la persistencia permanente de fotos de evidencia y logos en producción.
2. **Validación en Campo con App Móvil (Flutter):**
   * Realizar pruebas en dispositivo físico Android de la captura offline de avances y sincronización por lotes hacia el backend.
3. **Módulo de Notificaciones Preventivas:**
   * Opcional: Implementar un cron job o servicio de correo que notifique a los supervisores cuando un hito entre en estatus naranja (próximo a vencer).
