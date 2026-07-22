import { pool } from "../config/database";

// Consultas propias del dashboard del alumno: calendario/recordatorios
// (fechas límite de actividades y exámenes) y recomendados (repasar /
// siguientes). Todo acotado a las materias en las que el alumno está
// inscrito (usuario_materia).
class RepositorioDashboard {

    // ==========================================================
    // Calendario / recordatorios: toda actividad y examen con fecha
    // límite, de las materias en las que el alumno está inscrito.
    // Es la MISMA consulta que alimenta tanto el contenedor de
    // "recordatorios" como el calendario -- el front decide cómo
    // pintarla.
    // ==========================================================
    async calendario(idUsuario: number) {

        const sql = `
            SELECT
                'actividad' AS tipo,
                a.id_actividad AS id,
                a.titulo,
                a.fecha_limite,
                t.id_tema,
                t.nombre AS nombre_tema,
                m.id_materia,
                m.nombre AS nombre_materia,
                (ac.id_registro IS NOT NULL) AS entregado
            FROM Actividad a
            INNER JOIN Tema t ON t.id_tema = a.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            INNER JOIN usuario_materia um ON um.id_materia = m.id_materia AND um.id_usuario = $1
            LEFT JOIN actividad_completada ac ON ac.id_actividad = a.id_actividad AND ac.id_usuario = $1
            WHERE a.fecha_limite IS NOT NULL

            UNION ALL

            SELECT
                'examen' AS tipo,
                e.id_examen AS id,
                e.titulo,
                e.fecha_limite,
                t.id_tema,
                t.nombre AS nombre_tema,
                m.id_materia,
                m.nombre AS nombre_materia,
                NULL AS entregado
            FROM examen e
            INNER JOIN Tema t ON t.id_tema = e.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            INNER JOIN usuario_materia um ON um.id_materia = m.id_materia AND um.id_usuario = $1
            WHERE e.fecha_limite IS NOT NULL

            ORDER BY fecha_limite ASC;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;
    }

    // ==========================================================
    // Recomendados > a repasar: actividades donde el alumno sacó menos
    // de 7, con el tema/materia a los que pertenecen.
    // ==========================================================
    async actividadesARepasar(idUsuario: number) {

        const sql = `
            SELECT
                ac.id_registro, ac.calificacion, ac.fecha_entrega,
                a.id_actividad, a.titulo, a.puntaje,
                t.id_tema, t.nombre AS nombre_tema,
                m.id_materia, m.nombre AS nombre_materia
            FROM actividad_completada ac
            INNER JOIN Actividad a ON a.id_actividad = ac.id_actividad
            INNER JOIN Tema t ON t.id_tema = a.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            WHERE ac.id_usuario = $1 AND ac.calificacion IS NOT NULL AND ac.calificacion < 7
            ORDER BY ac.calificacion ASC;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;
    }

    // ==========================================================
    // Recomendados > siguientes: actividades pendientes (todavía no
    // entregadas) de las materias del alumno, y los temas a los que
    // pertenecen -- "lo que sigue por ver".
    // ==========================================================
    async actividadesSiguientes(idUsuario: number) {

        const sql = `
            SELECT
                a.id_actividad, a.titulo, a.fecha_limite, a.puntaje,
                t.id_tema, t.nombre AS nombre_tema,
                m.id_materia, m.nombre AS nombre_materia
            FROM Actividad a
            INNER JOIN Tema t ON t.id_tema = a.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            INNER JOIN usuario_materia um ON um.id_materia = m.id_materia AND um.id_usuario = $1
            LEFT JOIN actividad_completada ac ON ac.id_actividad = a.id_actividad AND ac.id_usuario = $1
            WHERE ac.id_registro IS NULL
            ORDER BY a.fecha_limite NULLS LAST, a.id_actividad;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;
    }

    async temasSiguientes(idUsuario: number) {

        const sql = `
            SELECT DISTINCT t.id_tema, t.nombre, t.orden, m.id_materia, m.nombre AS nombre_materia
            FROM Tema t
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            INNER JOIN usuario_materia um ON um.id_materia = m.id_materia AND um.id_usuario = $1
            INNER JOIN Actividad a ON a.id_tema = t.id_tema
            LEFT JOIN actividad_completada ac ON ac.id_actividad = a.id_actividad AND ac.id_usuario = $1
            WHERE ac.id_registro IS NULL
            ORDER BY m.nombre, t.orden;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;
    }

    async temasARepasar(idUsuario: number) {

        const sql = `
            SELECT DISTINCT t.id_tema, t.nombre, t.orden, m.id_materia, m.nombre AS nombre_materia
            FROM actividad_completada ac
            INNER JOIN Actividad a ON a.id_actividad = ac.id_actividad
            INNER JOIN Tema t ON t.id_tema = a.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            WHERE ac.id_usuario = $1 AND ac.calificacion IS NOT NULL AND ac.calificacion < 7
            ORDER BY m.nombre, t.orden;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;
    }

}

export default new RepositorioDashboard();
