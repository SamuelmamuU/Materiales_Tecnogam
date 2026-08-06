# Prompt de Inicio — Agente de IA

> Copia y pega el bloque de abajo como primer mensaje al agente (Claude Code u otro agente con acceso a terminal/repositorio). Antes de usarlo, coloca estos 4 archivos en la raíz del repositorio o en `/docs`: `01_plan_proyecto_por_fases.md`, `02_tecnologias.md`, `03_requerimientos.md` y `mockup_app_control_materiales.html`.

---

```
Vas a construir el "Sistema de Control de Materiales, Avances y Seguimiento de Proyecto": una
aplicación multiplataforma (móvil **Android** + web de escritorio) para una empresa de instalación
que necesita capturar avances diarios en campo, controlar materiales cotizados/recibidos/instalados,
y dar seguimiento a proyectos con 4 roles de usuario (Administrador, Supervisor, Trabajador, Cliente).

Nota de alcance: la app móvil es **exclusivamente para Android** en esta etapa del proyecto. No
compiles, pruebes ni documentes builds de iOS — aunque el framework (Flutter) lo permitiría a
futuro, iOS está fuera de alcance hasta nuevo aviso.

Antes de escribir una sola línea de código, lee completos y en este orden:
1. docs/03_requerimientos.md   → qué debe cumplir el sistema (funcional y no funcional)
2. docs/02_tecnologias.md      → qué stack estás obligado a usar (y qué está prohibido)
3. docs/01_plan_proyecto_por_fases.md → el plan de trabajo, fase por fase y tarea por tarea
4. mockup_app_control_materiales.html → ábrelo y revísalo; es la fuente de verdad visual para
   cualquier pantalla. Si una tarea del plan no especifica un detalle de UI, el mockup manda.

Reglas de trabajo que debes seguir sin excepción:

- Sigue el plan de fases en orden: no empieces la Fase 2 sin haber cerrado los criterios de
  aceptación de la Fase 1, salvo que yo te indique explícitamente lo contrario.
- Antes de cada fase, dime en un mensaje corto qué vas a hacer y en qué orden vas a abordar las
  tareas de esa fase. Después de cada fase, dame un resumen de lo entregado, las pruebas que
  corriste y cualquier desviación respecto al plan original (y por qué).
- Restricción de costo innegociable: todo el stack debe ser software libre / open source. No
  agregues ninguna dependencia, servicio o SDK que requiera licencia de pago sin preguntarme antes
  y justificar por qué no hay alternativa gratuita viable.
- Arquitectura offline-first: la app móvil debe funcionar 100% sin conexión y sincronizar
  automáticamente al recuperar red. No tomes atajos que rompan esto (por ejemplo, no asumas que
  siempre habrá conexión al backend en el flujo de captura).
- Control de acceso: cada endpoint debe validar rol Y pertenencia al proyecto (scoping). No
  implementes ningún endpoint de datos de proyecto sin ese doble check.
- Sigue las convenciones de ramas, commits y "definición de hecho" descritas al inicio de
  docs/01_plan_proyecto_por_fases.md.
- Si encuentras una tarea ambigua, resuélvela en este orden: (1) el mockup, (2) el documento de
  requerimientos, (3) pregúntame directamente antes de asumir. No inventes alcance no descrito.
- Escribe pruebas automatizadas para toda lógica de negocio (motor de contraste, sincronización,
  cálculo de avances, control de acceso). No las consideres opcionales.
- La integración con el sistema de materiales existente del cliente (Fase 1) es una dependencia
  crítica marcada en el plan: si no tienes acceso a documentación o credenciales de ese sistema,
  dímelo de inmediato en vez de simular el comportamiento y seguir adelante.

Empieza ahora por la Fase 0 (preparación del entorno) del plan de fases: crea la estructura del
monorepo, el docker-compose local y el pipeline de CI básico. Cuando termines Fase 0, muéstrame el
resultado y espera mi confirmación antes de avanzar a la Fase 1.
```
