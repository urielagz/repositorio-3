import { pool } from "../config/database";
import { Progreso } from "../models/Progreso";

class RepositorioProgreso {

    // ==========================
    // Calcula el avance real de un alumno en una materia a partir de
    // actividad_completada, y lo deja guardado en progreso como caché
    // (upsert por id_usuario + id_materia). El examen final no cuenta
    // para el avance: es solo un link externo, no algo que se "complete"
    // dentro del sistema.
    // ==========================
    async calcularYGuardar(idUsuario: number, idMateria: number): Promise<Progreso> {

        const totalesSql = `
            SELECT
                (SELECT COUNT(*) FROM actividad a INNER JOIN tema t ON t.id_tema = a.id_tema
                    WHERE t.id_materia = $1) AS total_actividades,
                (SELECT COUNT(*) FROM actividad_completada ac
                    INNER JOIN actividad a ON a.id_actividad = ac.id_actividad
                    INNER JOIN tema t ON t.id_tema = a.id_tema
                    WHERE t.id_materia = $1 AND ac.id_usuario = $2) AS act_completas;
        `;

        const { rows } = await pool.query(totalesSql, [idMateria, idUsuario]);
        const totales = rows[0];

        const totalItems = Number(totales.total_actividades);
        const completados = Number(totales.act_completas);
        const porcentaje = totalItems > 0
            ? Math.round((completados / totalItems) * 10000) / 100
            : 0;

        const upsertSql = `
            INSERT INTO progreso
            (porcentaje_avance, act_completas, evaluaciones_completas, ultima_actualizacion, id_usuario, id_materia)
            VALUES ($1, $2, 0, NOW(), $3, $4)
            ON CONFLICT (id_usuario, id_materia)
            DO UPDATE SET
                porcentaje_avance = EXCLUDED.porcentaje_avance,
                act_completas = EXCLUDED.act_completas,
                evaluaciones_completas = 0,
                ultima_actualizacion = NOW()
            RETURNING *;
        `;

        const { rows: guardado } = await pool.query(upsertSql, [
            porcentaje,
            completados,
            idUsuario,
            idMateria
        ]);

        return guardado[0];
    }

    // ==========================
    // IDs de alumnos con al menos una entrega en la materia
    // ==========================
    async obtenerAlumnosConActividad(idMateria: number): Promise<number[]> {

        const sql = `
            SELECT DISTINCT ac.id_usuario
            FROM actividad_completada ac
            INNER JOIN actividad a ON a.id_actividad = ac.id_actividad
            INNER JOIN tema t ON t.id_tema = a.id_tema
            WHERE t.id_materia = $1;
        `;

        const { rows } = await pool.query(sql, [idMateria]);

        return rows.map(r => r.id_usuario);
    }

}

export default new RepositorioProgreso();
