# Contrato de Integración con el Sistema de Materiales Existente

**Proyecto:** Sistema de Control de Materiales, Avances y Seguimiento de Proyecto  
**Estado:** Propuesto (Pendiente de Aprobación/Credenciales del Cliente)  
**Fecha:** 5 de Agosto de 2026

---

## 1. Introducción y Arquitectura

Para mantener el catálogo maestro del **Sistema de Control de Materiales** sincronizado con el sistema de inventario/ERP existente de la empresa (ej. SAP, Odoo, Oracle o desarrollo propio), se propone un modelo de **sincronización periódica (pull/push)** iniciado desde nuestro backend en NestJS.

### Método Seleccionado: REST API (Pull)
* El sistema existente de la empresa expondrá un endpoint REST seguro con el catálogo de materiales actualizado.
* Nuestro backend consumirá este endpoint a través de un Job programado (Cron Job) ejecutado diariamente durante la noche, o bajo demanda por el Administrador desde el panel web.

---

## 2. Especificación Técnica de la API Fuente

### 2.1 Endpoint
* **URL Propuesta (Staging):** `https://api.sistema-cliente.com/v1/materials`
* **Método:** `GET`
* **Formato de Respuesta:** `application/json`

### 2.2 Autenticación
Se utilizará autenticación mediante token de API estático (Bearer Token) en la cabecera HTTP para simplificar la seguridad local y evitar caducidad de sesiones:
```http
Authorization: Bearer <API_KEY_PROVISTA_POR_EL_CLIENTE>
```

### 2.3 Parámetros de Consulta (Query Params)
Para soportar sincronizaciones eficientes e incrementales, el endpoint de la empresa debe soportar los siguientes parámetros opcionales:

| Parámetro | Tipo | Descripción |
|---|---|---|
| `updated_since` | ISO Date | Filtra los materiales modificados a partir de esta fecha (sincronización incremental). Formato: `YYYY-MM-DDTHH:mm:ssZ`. |
| `limit` | Integer | Para paginar los resultados. Por defecto: `100`. |
| `offset` | Integer | Desplazamiento para paginación. |

### 2.4 Formato del Payload (JSON)
El endpoint de la empresa debe devolver una lista de materiales en el siguiente formato:

```json
{
  "total": 2313,
  "limit": 100,
  "offset": 0,
  "data": [
    {
      "modelo": "VEZ-06R08901A",
      "descripcion": "Curva Vertical Exterior De 6\" A 90º",
      "unidad": "Pza",
      "tipo": "CHAROLAS Y ACCESORIOS",
      "clase": "material",
      "marca": "Soportes Electricos",
      "activo": true,
      "updated_at": "2026-08-05T20:30:00Z"
    },
    {
      "modelo": "AET2",
      "descripcion": "Cable Monopolar Desnudo AWG 1/0, Semiduro, 7 Hilos.VK",
      "unidad": "mts",
      "tipo": "CABLE PARA SISTEMA DE TIERRAS",
      "clase": "material",
      "marca": "Viakon",
      "activo": true,
      "updated_at": "2026-08-05T21:15:00Z"
    }
  ]
}
```

---

## 3. Comportamiento en el Backend (NestJS)

El servicio `MaterialsSyncService` en NestJS realizará las siguientes acciones en cada corrida:

1. **Obtener Última Fecha de Sincronización:** Buscará en la base de datos el último registro procesado con éxito para enviar el parámetro `updated_since` y minimizar la transferencia de datos.
2. **Petición HTTP:** Realizará llamadas paginadas al endpoint de la empresa usando el `HttpService` de NestJS.
3. **Normalización de Datos:** Aplicará el mismo mapeo y limpieza desarrollado en el script ETL (Tarea 1.3):
   * Reemplazo de caracteres corruptos/inconsistentes en categorías.
   * Omisión de registros sin `modelo` (código), `descripcion` o `unidad`.
   * Descarte de duplicados favoreciendo el registro más reciente.
4. **Guardado (Upsert):** Escribirá en la base de datos local utilizando Prisma. Los registros nuevos se crearán y los existentes se actualizarán con las últimas descripciones y categorías.
5. **Auditoría:** Guardará una entrada en la tabla `BitacoraSincronizacion` indicando fecha, duración, registros procesados y estatus (Éxito/Fallo).

---

## 4. Plan de Contingencia / Fallback (SFTP / Carga de Archivos)
En caso de que el sistema de la empresa no pueda exponer un endpoint REST API en el corto plazo, se habilitará un método de fallback:

* **SFTP:** La empresa deposita diariamente un archivo CSV (con el mismo formato de `BD Materiales - RBD.csv`) en un servidor SFTP seguro. Nuestro backend leerá dicho archivo y ejecutará el ETL de forma programada.
* **Carga Manual (BOM):** El Administrador del dashboard web puede subir manualmente el archivo CSV utilizando un formulario de importación.

---

## 5. Dependencia Crítica - Siguiente Paso del Cliente
Para activar la integración automática (Fase 2 y posteriores), el cliente deberá proveer:
1. **Endpoint URL** de su entorno de desarrollo/staging y de producción.
2. **API Key / Credenciales de Acceso**.
3. **Confirmación del formato JSON** (o indicar las variaciones de campos para ajustar el mapeador).
