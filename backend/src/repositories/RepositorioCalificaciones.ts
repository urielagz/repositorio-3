import { pool } from "../config/database";
import { Calificacion } from "../models/Calificacion";

// El examen final no genera calificaciones dentro del sistema (es solo un
// link a Google Forms), así que las calificaciones de una materia salen
// únicamente de las entregas de actividades.
const SQL_BASE = `
    SELECT
        'actividad' AS tipo,
        ac.id_registro AS id_origen,
        a.titulo AS titulo,
        ac.id_usuario,
        u.nombre,
        u.apellido,
        ac.calificacion,
        a.puntaje AS puntaje_maximo,
        ac.fecha_entrega AS fecha,
        m.id_materia
    FROM actividad_completada ac
    INNER JOIN Actividad a ON a.id_actividad = ac.id_actividad
    INNER JOIN Tema t ON t.id_tema = a.id_tema
    INNER JOIN Materia m ON m.id_materia = t.id_materia
    INNER JOIN Usuario u ON u.id_usuario = ac.id_usuario
`;

class RepositorioCalificaciones {

    // ==========================
    // Calificaciones de un alumno dentro de una materia
    // ==========================
    async obtenerPorAlumnoYMateria(idAlumno: number, idMateria: number): Promise<Calificacion[]> {

        const sql = `
            SELECT * FROM (${SQL_BASE}) AS calificaciones
            WHERE id_usuario = $1 AND id_materia = $2
            ORDER BY fecha DESC;
        `;

        const { rows } = await pool.query(sql, [idAlumno, idMateria]);

        return rows;
    }

    // ==========================
    // Todas las calificaciones de una materia (vista del docente)
    // ==========================
    async obtenerPorMateria(idMateria: number): Promise<Calificacion[]> {

        const sql = `
            SELECT * FROM (${SQL_BASE}) AS calificaciones
            WHERE id_materia = $1
            ORDER BY id_usuario, fecha DESC;
        `;

        const { rows } = await pool.query(sql, [idMateria]);

        return rows;
    }

}

export default new RepositorioCalificaciones();
