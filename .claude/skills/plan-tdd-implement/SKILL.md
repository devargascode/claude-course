---
name: plan-tdd-implement
description: Genera un plan, escribe los tests primero (TDD) e implementa los cambios, siempre dentro de un git worktree, avisando por Slack al terminar el plan y al terminar la implementación. Úsala cuando el usuario pida desarrollar una funcionalidad o cambio con plan + TDD + implementación.
argument-hint: <descripción del cambio a realizar>
---

# Plan → TDD → Implementación

Flujo para desarrollar un cambio en Resttek: `$ARGUMENTS`.

Todos los mensajes al usuario van en español; el código, nombres, tests y mensajes de commit van en inglés.

## Reglas obligatorias

1. **Los cambios siempre se hacen en un git worktree.** Nunca edites archivos del código en el árbol de trabajo principal.
2. **Slack: pregunta el canal cada vez.** En cada ejecución de la skill, antes de enviar cualquier aviso, pregunta al usuario a qué canal quiere enviarlo (usa `AskUserQuestion`). No reutilices un canal de ejecuciones anteriores ni lo des por sentado.
3. Se avisa por Slack en exactamente dos momentos: al terminar el plan y al terminar la implementación.

## Paso 0: Preparación

1. Pregunta al usuario el canal de Slack para esta ejecución (una sola vez por ejecución; se usa para ambos avisos). Si lo prefiere, puede indicarlo con "Other".
2. Localiza la herramienta de Slack: busca con `ToolSearch` (p. ej. `slack send message`). Si no hay ninguna herramienta de Slack disponible, díselo al usuario y pregunta cómo proceder; no inventes el envío.
3. Verifica que el directorio es un repositorio git (`git rev-parse --is-inside-work-tree`). Si no lo es, avisa al usuario y pregunta si ejecutar `git init` con un commit inicial, porque sin git no hay worktree posible. No continúes sin worktree.

## Paso 1: Crear el worktree

1. Deriva un nombre de rama corto en kebab-case a partir del cambio (p. ej. `feature/add-dish-category-filter`).
2. Crea el worktree con la herramienta `EnterWorktree` (cárgala con `ToolSearch` si hace falta) o, si no es posible, con `git worktree add ../resttek-<slug> -b <branch>`.
3. Trabaja exclusivamente dentro del worktree desde este punto. Ejecuta `npm install` en él si es necesario.

## Paso 2: Plan

1. Explora el código relevante y consulta `docs/dominio/glosario.md`, `docs/dominio/modelo-datos.md` y `docs/revisiones/` si el cambio toca dominio o esquema.
2. Respeta los dos estilos de la API (hexagonal en `contexts/employee`, por capas en el resto) y las convenciones de cada frontend descritas en `CLAUDE.md`.
3. Escribe el plan en `docs/planes/<slug>.md` dentro del worktree, en español, con:
   - Objetivo y alcance.
   - Archivos a crear/modificar.
   - Casos de test que se escribirán (lista concreta, incluyendo casos límite y de error).
   - Orden de implementación y riesgos.
4. Muestra un resumen del plan al usuario.
5. **Aviso Slack #1:** envía al canal elegido un mensaje en español: plan terminado, título del cambio, rama/worktree y ruta del plan.

Después del aviso, si el plan tiene dudas abiertas que cambian el diseño, pregunta al usuario antes de continuar; si no, continúa.

## Paso 3: TDD

Ciclo rojo → verde → refactor, siguiendo la lista de tests del plan:

1. **Rojo:** escribe primero los tests (vitest; junto al código como `*.test.ts`, usando los mocks de `mocks/` para repositorios). Ejecútalos y confirma que fallan por la razón correcta:
   ```bash
   cd packages/api
   npx vitest run src/services/<name>.test.ts
   ```
2. **Verde:** implementa lo mínimo necesario para que pasen.
3. **Refactor:** limpia sin romper los tests.
4. Repite por cada caso del plan. Los frontends no tienen tests configurados: para cambios solo de frontend, verifica con `ng build` en el paquete correspondiente y explica la limitación.

## Paso 4: Implementación completa

1. Completa el resto de cambios del plan (rutas, controladores, componentes, stores, etc.) manteniendo el estilo del código circundante.
2. Ejecuta `npm test` desde la raíz del worktree (y `ng build` en los frontends afectados). Todo debe pasar; si algo falla, repórtalo tal cual, no lo ocultes.
3. Haz commits en la rama del worktree (mensajes en inglés). No hagas push ni merges sin que el usuario lo pida.
4. **Aviso Slack #2:** envía al canal elegido un mensaje en español: implementación terminada, rama/worktree, resultado de los tests (pasados/fallidos) y resumen breve de los cambios.

## Paso 5: Cierre

Informa al usuario en español: ruta del worktree, rama, resumen de cambios, resultado de tests y cómo integrar (merge/PR) cuando quiera. No elimines el worktree salvo que el usuario lo pida.
