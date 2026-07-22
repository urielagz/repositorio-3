-- =========================================================
-- Miztontli - Esquema completo y vigente del proyecto
-- =========================================================
-- Materia -> Índice -> Tema/capítulo -> Recurso / Actividad / Entrega /
-- Examen. Materia es el nivel superior (ya no depende de Asignatura).
-- El examen ya no es "final" por materia: ahora vive dentro de un tema,
-- igual que las actividades, y un tema puede tener varios.
-- El alumno necesita el "token" de la materia (se le manda al docente
-- por correo al crearla) para inscribirse -- sin inscripción no puede
-- ver el índice, los temas, recursos, actividades ni exámenes.
-- Idempotente: usa CREATE ... IF NOT EXISTS, se puede correr varias veces.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Tipos ENUM
-- ---------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('alumno', 'docente', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_recurso AS ENUM (
        'informacion', 'documento', 'video', 'enlace',
        'pdf', 'word', 'excel', 'powerpoint', 'imagen', 'audio', 'zip', 'rar', 'otro'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 'evaluacion' queda como valor histórico sin uso (viene del sistema de
-- evaluaciones que se eliminó); ahora se notifica con 'tema' y 'examen'.
DO $$ BEGIN
    CREATE TYPE tipo_notificacion AS ENUM ('actividad', 'evaluacion', 'comentario', 'tema', 'examen', 'recurso', 'aviso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'tema';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'examen';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'recurso';
ALTER TYPE tipo_notificacion ADD VALUE IF NOT EXISTS 'aviso';

DO $$ BEGIN
    CREATE TYPE estado_solicitud AS ENUM ('pendiente', 'aprobado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------
-- 2. Usuarios
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'alumno',
    foto_perfil VARCHAR(255),
    biografia TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    estado BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS docenteespera (
    id_solicitud SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    cedula_profesional VARCHAR(255) NOT NULL,
    diploma VARCHAR(255) NOT NULL,
    estado estado_solicitud NOT NULL DEFAULT 'pendiente',
    fecha_solicitud TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_revision TIMESTAMP
);

-- ---------------------------------------------------------
-- 3. Módulo académico: Materia -> Tema
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS materia (
    id_materia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(255),
    color VARCHAR(20),
    orden INTEGER NOT NULL DEFAULT 0,
    id_docente INTEGER REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    token VARCHAR(20) UNIQUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (id_materia, orden) es UNIQUE a propósito: el índice de la materia
-- depende de que el orden de sus temas no se repita. RepositorioTemas
-- reacomoda el "orden" de los demás temas en una transacción antes de
-- insertar/actualizar, así que en circunstancias normales nunca choca
-- con esta constraint -- es la red de seguridad ante condiciones de
-- carrera, no el mecanismo principal.
CREATE TABLE IF NOT EXISTS tema (
    id_tema SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    introduccion TEXT,
    contenido TEXT,
    imagen1 VARCHAR(255),
    imagen2 VARCHAR(255),
    orden INTEGER,
    id_materia INTEGER NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    CONSTRAINT tema_materia_orden_unique UNIQUE (id_materia, orden)
);

-- ---------------------------------------------------------
-- 4. Recursos
-- ---------------------------------------------------------
-- Un recurso admite hasta 5 archivos (ver MAX_ARCHIVOS_RECURSO en
-- RecursoController.ts); cada uno guarda su propio tipo/extension/tamano
-- dentro del JSONB "archivos", mismo patrón que actividad.archivos_apoyo.
CREATE TABLE IF NOT EXISTS recurso (
    id_recurso SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW(),
    id_tema INTEGER NOT NULL REFERENCES tema(id_tema) ON DELETE CASCADE,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- ---------------------------------------------------------
-- 5. Actividades y entregas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividad (
    id_actividad SERIAL PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fecha_limite TIMESTAMP,
    puntaje NUMERIC(5,2) NOT NULL DEFAULT 10,
    archivos_permitidos VARCHAR(255) NOT NULL DEFAULT 'pdf,documento,presentacion,hoja_calculo,imagen,audio,video,comprimido,codigo,diseno,modelo_3d',
    archivos_apoyo JSONB NOT NULL DEFAULT '[]'::jsonb,
    id_tema INTEGER NOT NULL REFERENCES tema(id_tema) ON DELETE CASCADE,
    id_docente INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL
);

-- El alumno entrega vía archivos (hasta 5, ver MAX_ARCHIVOS_ENTREGA en
-- ActividadController.ts), texto (comentario_alumno) y/o una URL
-- (url_entrega, ej. un enlace a Drive o video); se exige al menos una
-- de las tres.
CREATE TABLE IF NOT EXISTS actividad_completada (
    id_registro SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_actividad INTEGER NOT NULL REFERENCES actividad(id_actividad) ON DELETE CASCADE,
    fecha_entrega TIMESTAMP,
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    url_entrega VARCHAR(500),
    calificacion NUMERIC(5,2),
    comentario_alumno TEXT,
    observaciones_docente TEXT,
    UNIQUE (id_usuario, id_actividad)
);

-- ---------------------------------------------------------
-- 6. Examen (vive dentro de un tema, igual que Actividad -- un tema
-- puede tener varios exámenes, ya no es "1 examen final por materia")
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS examen (
    id_examen SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    url_formulario VARCHAR(500) NOT NULL,
    fecha_limite TIMESTAMP,
    id_tema INTEGER NOT NULL REFERENCES tema(id_tema) ON DELETE CASCADE,
    id_docente INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 7. Progreso
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS progreso (
    id_progreso SERIAL PRIMARY KEY,
    porcentaje_avance NUMERIC(5,2) NOT NULL DEFAULT 0,
    act_completas INTEGER NOT NULL DEFAULT 0,
    evaluaciones_completas INTEGER NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_materia INTEGER NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    UNIQUE (id_usuario, id_materia)
);

-- ---------------------------------------------------------
-- 8. Publicaciones (Anuncios/Asesorías), Comentarios, Notificaciones
--    (sin uso actual en el código, se dejan por compatibilidad)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacion (
    id_publicacion SERIAL PRIMARY KEY,
    titulo VARCHAR(50) NOT NULL,
    contenido TEXT,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentario (
    id_comentario SERIAL PRIMARY KEY,
    contenido TEXT NOT NULL,
    fecha_comentario TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_publicacion INTEGER NOT NULL REFERENCES publicacion(id_publicacion) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    titulo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    tipo tipo_notificacion NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_lectura TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- usuario_materia SÍ tiene uso: es la tabla de inscripción de alumnos.
-- Un alumno solo puede ver el índice/temas/recursos/actividades/
-- exámenes de una materia si tiene una fila aquí (se crea vía
-- POST /materias/inscribirse con el token de la materia).
CREATE TABLE IF NOT EXISTS usuario_materia (
    id_inscripcion SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_materia INTEGER NOT NULL REFERENCES materia(id_materia) ON DELETE CASCADE,
    fecha_inscripcion TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_usuario, id_materia)
);

-- ---------------------------------------------------------
-- 9. Comunidad: feed tipo Facebook, acotado por materia. Tablas propias
-- ("publicacion_comunidad", "comentario_comunidad"), DISTINTAS de
-- "publicacion"/"comentario" (que usan Anuncios y Asesorías), para que
-- no se mezclen. El docente/admin publica cualquier tipo (dispara
-- correo a los inscritos); el alumno solo puede publicar tipo
-- "pregunta" (sin correo masivo). El comentario del docente se muestra
-- primero (ver RepositorioComentarios.listarPorPublicacion).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS publicacion_comunidad (
    id_publicacion SERIAL PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    contenido TEXT,
    tipo VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (tipo IN ('general', 'pregunta', 'recurso')),
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    -- NULL = post del feed general de la comunidad (sin materia).
    id_materia INTEGER REFERENCES materia(id_materia) ON DELETE CASCADE,
    id_tema INTEGER REFERENCES tema(id_tema) ON DELETE CASCADE,
    id_actividad INTEGER REFERENCES actividad(id_actividad) ON DELETE CASCADE,
    id_examen INTEGER REFERENCES examen(id_examen) ON DELETE CASCADE,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comentario_comunidad (
    id_comentario SERIAL PRIMARY KEY,
    contenido TEXT NOT NULL,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_publicacion INTEGER NOT NULL REFERENCES publicacion_comunidad(id_publicacion) ON DELETE CASCADE,
    fecha_comentario TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 9.1 Chat (público general + grupos privados por materia). Tiempo real
-- vía Socket.IO (backend/src/config/socket.ts); estas tablas son la
-- persistencia/historial, la fuente de verdad de quién puede leer/
-- escribir en cada grupo. UNIQUE(id_materia) permite NULL (el grupo
-- público) repetido pero garantiza un solo grupo por materia real.
-- ---------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE tipo_grupo_chat AS ENUM ('publico', 'materia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS grupo_chat (
    id_grupo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo tipo_grupo_chat NOT NULL,
    id_materia INTEGER REFERENCES materia(id_materia) ON DELETE CASCADE,
    id_docente INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT grupo_chat_materia_unique UNIQUE (id_materia)
);

CREATE TABLE IF NOT EXISTS mensaje_chat (
    id_mensaje SERIAL PRIMARY KEY,
    id_grupo INTEGER NOT NULL REFERENCES grupo_chat(id_grupo) ON DELETE CASCADE,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    contenido TEXT,
    archivos JSONB NOT NULL DEFAULT '[]'::jsonb,
    fecha_envio TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Siembra el único grupo público, si todavía no existe.
INSERT INTO grupo_chat (nombre, tipo, id_materia, id_docente)
SELECT 'Comunidad general', 'publico', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM grupo_chat WHERE tipo = 'publico');

-- ---------------------------------------------------------
-- 10. Índices de apoyo
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_materia_docente ON materia(id_docente);
CREATE INDEX IF NOT EXISTS idx_tema_materia ON tema(id_materia);
CREATE INDEX IF NOT EXISTS idx_recurso_tema ON recurso(id_tema);
CREATE INDEX IF NOT EXISTS idx_actividad_tema ON actividad(id_tema);
CREATE INDEX IF NOT EXISTS idx_actividad_completada_actividad ON actividad_completada(id_actividad);
CREATE INDEX IF NOT EXISTS idx_progreso_materia ON progreso(id_materia);
CREATE INDEX IF NOT EXISTS idx_examen_tema ON examen(id_tema);
CREATE INDEX IF NOT EXISTS idx_usuario_materia_usuario ON usuario_materia(id_usuario);
CREATE INDEX IF NOT EXISTS idx_publicacion_comunidad_materia ON publicacion_comunidad(id_materia);
CREATE INDEX IF NOT EXISTS idx_comentario_comunidad_publicacion ON comentario_comunidad(id_publicacion);
CREATE INDEX IF NOT EXISTS idx_materia_token ON materia(token);
CREATE INDEX IF NOT EXISTS idx_actividad_fecha_limite ON actividad(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_examen_fecha_limite ON examen(fecha_limite);
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON notificacion(id_usuario);
CREATE INDEX IF NOT EXISTS idx_mensaje_chat_grupo ON mensaje_chat(id_grupo, id_mensaje);
CREATE INDEX IF NOT EXISTS idx_grupo_chat_materia ON grupo_chat(id_materia);
