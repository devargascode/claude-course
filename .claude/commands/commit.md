---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: "[pista opcional sobre el tipo o alcance]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

Crea un commit de los cambios actuales siguiendo la especificación **Conventional Commits 1.0.0**.

## Contexto

- Estado: !`git status --short`
- Cambios preparados (staged): !`git diff --cached`
- Cambios sin preparar: !`git diff`
- Commits recientes (para imitar el estilo): !`git log --oneline -10`

Pista del usuario (puede estar vacía): $ARGUMENTS

## Formato

```
<tipo>(<alcance opcional>)<!>: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

| Tipo       | Cuándo usarlo                                              |
| ---------- | ---------------------------------------------------------- |
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de un error                                     |
| `docs`     | Solo documentación                                         |
| `style`    | Formato, espacios, punto y coma (sin cambio de lógica)     |
| `refactor` | Cambio de código que no corrige un bug ni añade feature    |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Añadir o corregir tests                                    |
| `build`    | Sistema de build, dependencias (npm, angular.json…)        |
| `ci`       | Configuración de integración continua                      |
| `chore`    | Tareas de mantenimiento que no tocan src ni tests          |
| `revert`   | Revierte un commit anterior                                |

### Reglas

- Descripción en **español**, en imperativo o infinitivo coherente con el historial, en minúscula inicial, sin punto final y de **72 caracteres como máximo** en la primera línea.
- El `alcance` es opcional y va entre paréntesis; usa el área afectada (`list`, `auth`, `api`, `form`…).
- Cambio incompatible: añade `!` tras el tipo/alcance **y** un pie `BREAKING CHANGE: <explicación>`.
- El cuerpo explica el *qué* y el *porqué*, no el *cómo*; sepáralo con una línea en blanco.
- Referencias a issues en el pie (`Closes #12`).

### Pasos

1. Si no hay cambios, díselo al usuario y detente.
2. Si no hay nada en staging, añade con `git add` los archivos relevantes *****ombre
   (nunca `git add -A` ni `git add .`, y nunca archivos de secretos como `.env` o bases de datos como `data/*.db`).
3. Redacta el mensaje y usa la tool `AskUserQuestion` para preguntarle al usuario si el mensaje le parece bien.
4. Si el usuario acepta el mensaje, entonces ejecuta `git commit` pasando el mensaje con un HEREDOC. Y si no, redacta uno nuevo y vuelve al paso 3.
5. Ejecuta `git status` para confirmar el resultado y muestra al usuario el mensaje del commit.

## Ejemplos

```
feat(list): mostrar los vendehumos en tarjetas
fix(form): no enviar el formulario si el nombre está vacío
refactor(api): extraer getErrorMessage a su propio archivo
build: actualizar angular a 22.2.1
feat(auth)!: exigir contraseñas de al menos 8 caracteres

BREAKING CHANGE: las contraseñas más cortas ya no se aceptan al registrarse.
```
