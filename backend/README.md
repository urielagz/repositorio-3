# API Proyectointegrador (Mistontli) — Express + TypeScript + PostgreSQL

Proyecto educativo: API REST modular en **Node.js (Express) + TypeScript**. Autenticación por **JWT** y autorización por roles.

Estado actual: desarrollo con migración parcial a PostgreSQL y arquitectura original preservada. El proyecto ya usa repositorios SQL para los módulos centrales, mientras que la estructura de controladores y rutas se mantiene intacta.

---

## Qué hemos hecho hasta ahora

- Migración de persistencia a PostgreSQL usando `pg` y `await pool.query()`.
- Mantenimiento de la arquitectura original: rutas → controladores → repositorios.
- Conservación de nombres de rutas, controladores, middleware, JWT y lógica de validación existentes.
- Implementación en SQL de los módulos:
  - `Usuarios` → tabla `usuario`
  - `Materias` → tabla `materia`
  - `Temas` → tabla `tema`
  - `Tareas` → tabla `actividad`
  - `Entregas` → tabla `actividad_completada`
  - `Exámenes` → tabla `evaluacion`
  - `Anuncios` → tabla `publicacion`
  - `Asesorías` → reutiliza `publicacion` con marca interna en `contenido`
- Validación de tipo con `npx tsc --noEmit` después de cada migración crítica.

---

## Migración de repositorios y estado actual

- `src/repositories/RepositorioUsuarios.ts` — usa tabla `usuario`.
- `src/repositories/RepositorioMateria.ts` — usa tabla `materia`.
- `src/repositories/RepositorioTemas.ts` — usa tabla `tema`.
- `src/repositories/RepositorioTareas.ts` — usa tabla `actividad`.
- `src/repositories/RepositorioEntregas.ts` — usa tabla `actividad_completada`.
- `src/repositories/RepositorioExamenes.ts` — usa tabla `evaluacion`.
- `src/repositories/RepositorioAnuncios.ts` — usa tabla `publicacion`.
- `src/repositories/RepositorioAsesorias.ts` — usa tabla `publicacion` con contenido JSON marcado como asesoría.

---

## Base de datos actual

La base de datos conectada es `Miztontli` en PostgreSQL.

### Tablas existentes detectadas

- `usuario`
- `materia`
- `tema`
- `actividad`
- `actividad_completada`
- `evaluacion`
- `publicacion`
- `comentario`
- `recurso`
- `progreso`
- `notificacion`
- `resultado_evaluacion`
- `usuario_materia`

### Estado actual de datos

Todas las tablas están actualmente vacías en esta instalación de `Miztontli`.

- `usuario`: 0 filas
- `materia`: 0 filas
- `tema`: 0 filas
- `actividad`: 0 filas
- `actividad_completada`: 0 filas
- `evaluacion`: 0 filas
- `publicacion`: 0 filas
- `comentario`: 0 filas
- `recurso`: 0 filas
- `progreso`: 0 filas
- `notificacion`: 0 filas
- `resultado_evaluacion`: 0 filas
- `usuario_materia`: 0 filas

> Nota: la base de datos está creada y accesible, pero no contiene registros de prueba en este momento.

---

## Tablas relevantes para el proyecto

Las tablas oficiales que ya existen en la base de datos y que forman parte del esquema objetivo son:

- `usuario`
- `materia`
- `usuario_materia`
- `tema`
- `actividad`
- `actividad_completada`
- `evaluacion`
- `resultado_evaluacion`
- `recurso`
- `progreso`
- `publicacion`
- `comentario`
- `notificacion`

---

## Qué falta documentar o implementar

- Las tablas `comentario`, `recurso`, `progreso`, `notificacion`, `resultado_evaluacion` no tienen endpoints ni repositorios implementados aún.
- El módulo de `Asesorías` está funcionando, pero se apoya en la tabla `publicacion` con marca interna; si quieres, puedo modelarlo con una tabla dedicada si eso encaja mejor con el dominio.
- El README refleja el estado actual; cuando envíes los requerimientos funcionales completos, puedo comparar y listar exactamente qué módulos y subfuncionalidades faltan.

---

## Estructura principal (ubicaciones clave)

- `src/app.ts` — configuración de Express y montaje de rutas.
- `src/server.ts` — arranque del servidor.
- `src/controllers/` — lógica por recurso.
- `src/repositories/` — persistencia SQL por recurso.
- `src/models/` — definiciones de entidades.
- `src/routes/` — definición de endpoints por recurso.
- `src/middlewares/` — autenticación y roles.
- `src/utils/` — utilidades JWT y recuperación de contraseña.

---

## Cómo ejecutar

1. Instalar dependencias:

```bash
npm install
```

2. Ejecutar en modo desarrollo:

```bash
npm run dev
```

3. Punto base de la API:

- `http://localhost:8000`

---

## Notas de configuración

- Actualmente el JWT secret está embebido en el código.
- Recomiendo mover secret y credenciales de BD a variables de entorno.
- La conexión PostgreSQL ya está configurada en `src/config/database.ts`.

# PROMPT PARA ANALIZAR MI PROYECTO COMPLETO
Quiero que actúes como Arquitecto de Software Senior y Analista de Sistemas.

Voy a proporcionarte el código completo de mi proyecto backend desarrollado con Node.js + Express + TypeScript.

Antes de realizar cualquier cambio, analiza completamente el proyecto.

Necesito que generes una documentación técnica completa con el siguiente formato.

## 1. Resumen general del proyecto
Explica:

- Objetivo del sistema.
- Arquitectura utilizada.
- Tecnologías utilizadas.
- Organización del proyecto.
- Flujo general del backend.
- Cómo se comunican los módulos.

---

## 2. Estructura del proyecto
Genera el árbol completo de carpetas y archivos.

Ejemplo:

src/
├── controllers
├── models
├── repositories
├── routes
├── middlewares
├── utils
├── app.ts
└── server.ts

Explica la función de cada carpeta y archivo.

---

## 3. Modelos del sistema
Para cada modelo indica:

- Nombre
- Propiedades
- Relaciones con otros modelos
- Descripción
Ejemplo:

Usuario

- id
- nombre
- apellido
- correo
- contraseña
- rol
Descripción:
Representa un usuario del sistema.

---

## 4. Repositorios
Para cada repositorio explica:

- Qué almacena
- Qué métodos tiene
- Qué hace cada método
Ejemplo:

RepositorioUsuarios

Métodos:

listar()

agregar()

buscarPorId()

buscarPorCorreo()

actualizar()

eliminar()

etc.

---

## 5. Controladores
Explica cada controlador.

Por cada método indica:

- Ruta
- Método HTTP
- Parámetros
- Respuesta
- Qué hace internamente

---

## 6. Todas las rutas del proyecto
Necesito una tabla completa como esta:

MétodoRutaDescripciónRequiere TokenRolesPOST/usuariosRegistrar usuarioNoTodosPOST/usuarios/loginIniciar sesiónNoTodosPUT/usuarios/perfilActualizar perfilSíTodosPOST/materiasCrear materiaSíADMIN, DOCENTENo omitas ninguna ruta.

---

## 7. Explicación para Postman
Necesito un manual completo para probar toda la API.

Para cada endpoint genera:

- URL
- Método HTTP
- Headers
- Authorization
- Body
- Ejemplo de petición
- Ejemplo de respuesta
- Orden correcto para probarlo
Debe incluir el flujo completo desde que el servidor está vacío.

Ejemplo:

1. Registrar usuario
2. Login
3. Copiar token
4. Crear materia
5. Crear tema
6. Crear tarea
7. etc.

---

## 8. Seguridad
Explica:

- JWT
- Middleware auth
- Middleware de roles
- Qué rutas están protegidas
- Qué roles puede usar cada ruta

---

## 9. Base de datos
Analiza todos los modelos y genera el diseño completo de la base de datos.

Incluye:

- Todas las tablas
- Columnas
- Tipos de datos
- Primary Keys
- Foreign Keys
- Relaciones
- Cardinalidades
También genera el diagrama entidad-relación (ERD) en formato Mermaid y describe cómo implementarlo en MySQL o PostgreSQL.

---

## 10. Requerimientos funcionales
Genera una tabla con todos los RF.

Indica:

- Código RF
- Nombre
- Descripción
- Estado
Clasifica cada uno como:

✅ Implementado

🟡 Parcialmente implementado

❌ No implementado

---

## 11. Requerimientos no funcionales
Genera los RNF que cumple actualmente el proyecto y los que faltan implementar.

---

## 12. Arquitectura
Genera un diagrama de la arquitectura del backend.

Debe incluir:

Cliente

↓

Express

↓

Routes

↓

Controllers

↓

Repositories

↓

Modelos

↓

Base de datos (futura)

---

## 13. Flujo de autenticación
Explica paso a paso:

Registro

↓

Hash con bcrypt

↓

Login

↓

JWT

↓

Bearer Token

↓

Middleware

↓

Acceso a rutas protegidas

---

## 14. Mejoras recomendadas
Indica todo lo que hace falta para convertir este backend en un backend profesional.

Por ejemplo:

- DTOs
- Validaciones
- Base de datos
- Prisma u ORM
- Logs
- Variables de entorno
- Docker
- Tests
- Swagger
- Paginación
- Manejo de errores
- Servicios
- Arquitectura limpia

---

## 15. Continuación del proyecto
Finalmente, genera una hoja de ruta indicando exactamente qué implementar después, en orden de prioridad, para completar el backend al 100%.

No hagas modificaciones al código hasta haber terminado el análisis completo.

Quiero una documentación técnica profesional, detallada y organizada.


