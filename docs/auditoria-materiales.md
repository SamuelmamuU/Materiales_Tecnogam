# Reporte de Auditoría de Base de Datos de Materiales

**Proyecto:** Sistema de Control de Materiales, Avances y Seguimiento de Proyecto  
**Archivo Auditado:** `docs/BD Materiales - RBD.csv`  
**Fecha:** 5 de Agosto de 2026  
**Responsable:** Antigravity (AI Agent)

---

## 1. Resumen Ejecutivo

Se auditó el catálogo de materiales provisto en formato CSV para su posterior integración en la base de datos PostgreSQL del sistema. La auditoría analizó un total de **3,469 registros** (excluyendo el encabezado) y arrojó los siguientes resultados principales:

* **Registros Válidos:** 2,313 registros que cuentan con información completa de catálogo (`modelo`, `descripcion`, `unidad`, `tipo`).
* **Registros Vacíos / Con Ruido:** 1,156 filas que contienen celdas vacías en los campos clave de materiales, pero arrastran valores por defecto (`0` o `""`) en columnas de precios creadas por herramientas de hojas de cálculo (ej. Excel).
* **Registros Duplicados:** 14 modelos/códigos de materiales se encuentran duplicados exactamente dos veces.

---

## 2. Hallazgos Detallados

### 2.1 Filas Vacías / Con Ruido
Se identificaron 1,156 filas (por ejemplo, a partir de la línea 73) con el siguiente formato:
`["","","","","","","","","","0","","","0","","0","","",""]`

* **Impacto:** Estas filas representan ruido y no contienen ningún material real.
* **Causa:** Exportación de celdas formateadas vacías de Excel que conservaron valores numéricos por defecto (`0`).
* **Propuesta de Normalización:** Se deben ignorar completamente durante el proceso ETL. El criterio para clasificar una fila como válida será que contenga un `modelo` (Código), `descripcion` y `unidad` no vacíos.

### 2.2 Registros Duplicados por `modelo` (Código)
El campo `modelo` actuará como el `codigo` único de material (BOM). Se identificaron **14 modelos duplicados** (28 filas en total). Todos ellos comparten exactamente la misma descripción, unidad y categoría, pero difieren en que uno tiene `Precio1 = 0` y el otro tiene un precio real.

A continuación el detalle de los duplicados detectados:

| Modelo | Descripción | Unidad | Categoría (tipo) | Líneas en CSV | Diferencia Detectada |
|---|---|---|---|---|---|
| **6201120** | Cable monopolar calibre 4/0 awg (120 mm2) RV-K... | mts | CABLES DE FUERZA | 1895, 2649 | Línea 1895 tiene Precio1=0; Línea 2649 tiene Precio1=23 |
| **S12-50-C0** | Cincho STRONGHOLD, 12x.2(302mmX 4.8mm) Nylon 6,6... | Bolsa | ACCESORIOS Y CONSUMIBLES | 678, 3435 | Línea 678 tiene Precio1=0; Línea 3435 tiene Precio1=460 |
| **1769-IF16C** | Módulos De Entrada Analógica De 16 Puntos... | Pza | GABINETES Y COMPONENTES | 873, 3042 | Línea 873 tiene Precio1=0; Línea 3042 tiene Precio1=1.45 |
| **1769-OF2** | Modulo 2 Salidas Análogas De Corriente... | Pza | GABINETES Y COMPONENTES | 1261, 2221 | Línea 1261 tiene Precio1=0; Línea 2221 tiene Precio1=625 |
| **PLT1M-M** | Cincho Chico de 2.5X99mm(3.3”) [PAQUETE C/1000]... | Paquete | ACCESORIOS Y CONSUMIBLES | 1267, 1272 | Línea 1267 tiene Precio1=0; Línea 1272 tiene Precio1=600 |
| **Pendiente 260126** | Arrancador Suave ABB PSTX de 1000 amps... | Pza | GABINETES Y COMPONENTES | 1314, 2738 | Línea 1314 tiene Precio1=0; Línea 2738 tiene Precio1=32.5 |
| **280126A** | Tubo aislante Termocontractil de 1 1/4... | Pza | ACCESORIOS Y CONSUMIBLES | 1519, 2687 | Línea 1519 tiene Precio1=0; Línea 2687 tiene Precio1=125 |
| **ZMACE-4-750-2N** | Zapata mecanica de Aluminio Tipo Escalera... | Pza | GABINETES Y COMPONENTES | 1616, 1625 | Línea 1616 tiene Precio1=0; Línea 1625 tiene Precio1=997 |
| **YS8CL** | Conector Tope a Tope Calibre 8 | Pza | ACCESORIOS Y CONSUMIBLES | 1621, 2372 | Línea 1621 tiene Precio1=0; Línea 2372 tiene Precio1=140 |
| **CCF4** | Centro de Carga- Caja plastica Riel Din... | Pza | GABINETES Y COMPONENTES | 1894, 2639 | Línea 1894 tiene Precio1=0; Línea 2639 tiene Precio1=550 |
| **RYC-SS075** | Abrazadera Unicanal de 3/4 Con Recubrimiento... | Pza | CONDULETS Y ACCESORIOS | 2198, 3455 | Línea 2198 tiene Precio1=0; Línea 3455 tiene Precio1=257 |
| **YS2C** | Conector Tope a Tope Calibre 2 | Pza | ACCESORIOS Y CONSUMIBLES | 2302, 2343 | Línea 2302 tiene Precio1=0; Línea 2343 tiene Precio1=133 |
| **MVI69L-MBS** | Módulo De Comunicación Modbus Lite... | Pza | GABINETES Y COMPONENTES | 2545, 3093 | Línea 2545 tiene Precio1=0; Línea 3093 tiene Precio1=1.292 |
| **YA282N/ 02004895** | Zapata Terminal cañon largo 2 perforaciones... | Pza | ACCESORIOS Y CONSUMIBLES | 3161, 3387 | Línea 3161 tiene Precio1=0; Línea 3387 tiene Precio1=225 |

* **Impacto:** Provocaría un error de clave duplicada (`Unique Constraint`) en PostgreSQL si se intenta insertar ambos registros en un campo indexado único `codigo`.
* **Propuesta de Normalización:** Mantener en el catálogo únicamente la fila que posea el `Precio1` mayor a 0 o, en su defecto, procesar un mapa de duplicados durante el ETL para omitir las inserciones de códigos ya registrados (haciendo un "upsert" o simplemente ignorando segundas instancias). Dado que el modelo no requiere precio, la unicidad se garantizará filtrando por `codigo` ya existente en memoria durante la ejecución del script ETL.

### 2.3 Categorías (`tipo`) y Clases (`clase`)
Se encontraron 25 categorías (`tipo`) diferentes y 4 clases (`clase`). La mayoría de las categorías están bien escritas, pero hay leves inconsistencias a corregir:
* `"HERRAJES DE FIJACIN"` -> Corregir caracteres corruptos (codificación UTF-8/ISO-8859-1) a `"HERRAJES DE FIJACIÓN"`.
* `"ACCESORIOS GRUAS AERIAS"` y `"ACCESORIOS GRUAS AEREAS"` -> Consolidar ambas en `"ACCESORIOS GRÚAS AÉREAS"`.
* `"CABLES DE COMUNICACIN"` -> Corregir a `"CABLES DE COMUNICACIÓN"`.
* `"PERFILES DE FIERRO"` -> Mantener.
* `"Tuberia Neumatica"` -> Capitalizar a `"TUBERÍA NEUMÁTICA"`.
* `"SISTEMA NEUMATICO"` -> Corregir a `"SISTEMA NEUMÁTICO"`.
* `"VALVULAS E INSTRUMENTOS"` -> Corregir a `"VÁLVULAS E INSTRUMENTOS"`.
* `"FIBRA OPTICA Y ACCESORIOS"` -> Corregir a `"FIBRA ÓPTICA Y ACCESORIOS"`.

### 2.4 Unidades de Medida (`unidad`)
Se detectaron 19 unidades de medida distintas. En general están consistentes, pero se propone normalizar:
* `"mts"` -> Mantener como `"mts"` o `"ml"` (Metros lineales/metros). Se recomienda `"mts"`.
* `"Pza"` -> Mantener.
* `"Lts"` y `"L"` -> Consolidar en `"L"` o `"Lts"`. Se mantendrán según origen.

---

## 3. Plan de Acción de Normalización para el Script ETL

1. **Codificación:** Leer el archivo CSV forzando codificación UTF-8 o reemplazando caracteres corruptos (`` -> vocal tildada correspondiente).
2. **Filtro de Ruido:** Omitir cualquier fila donde `modelo`, `descripcion` y `unidad` sean nulos o vacíos.
3. **Control de Unicidad:** Implementar un conjunto `Set` en memoria para el campo `modelo` (mapeado como `codigo`). Si se procesa un modelo ya existente, el script registrará un warning en la consola y no duplicará el registro en PostgreSQL.
4. **Mapeo de Campos:**
   * `codigo` = `row['modelo']`
   * `descripcion` = `row['descripcion']`
   * `unidad` = `row['unidad']`
   * `categoria` = `row['tipo']` (corregida ortográficamente según la sección 2.3)
   * `activo` = `true`
