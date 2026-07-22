import { Pool } from "pg";

// El esquema del módulo académico (Materia, Tema, Recurso, Actividad,
// Examen, inscripción vía usuario_materia) vive en
// backend/database/database.sql. Aplícalo manualmente antes de usar las
// rutas /materias, /temas, /recursos, /actividades, /examenes y
// /calificaciones.

export const pool = new Pool({
    host: "localhost",
    port: 5432,
    database: "prueba7",
    user: "postgres",
    password: "12345"
});
// Nota: evitamos connect() inmediato para que no rompa el arranque
// cuando la app corre sin DB disponible todavía.
// El pool manejará conexiones bajo demanda con `pool.query(...)`.

