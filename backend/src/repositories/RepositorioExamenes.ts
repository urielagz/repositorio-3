import { pool } from "../config/database";
import { Examen } from "../models/Examen";

class RepositorioExamenes {

    // ==========================
    // Obtener exámenes de un tema
    // ==========================
    async obtenerPorTema(idTema: number): Promise<Examen[]> {

        const sql = `
            SELECT *
            FROM examen
            WHERE id_tema = $1
            ORDER BY id_examen;
        `;

        const { rows } = await pool.query(sql, [idTema]);

        return rows;
    }

    // ==========================
    // Buscar por ID
    // ==========================
    async obtenerPorId(id: number): Promise<Examen | null> {

        const { rows } = await pool.query("SELECT * FROM examen WHERE id_examen = $1;", [id]);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Crear
    // ==========================
    async crear(examen: Examen): Promise<Examen> {

        const sql = `
            INSERT INTO examen (titulo, descripcion, url_formulario, fecha_limite, id_tema, id_docente)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const values = [
            examen.titulo,
            examen.descripcion ?? null,
            examen.url_formulario,
            examen.fecha_limite ?? null,
            examen.id_tema,
            examen.id_docente ?? null
        ];

        const { rows } = await pool.query(sql, values);

        return rows[0];
    }

    // ==========================
    // Actualizar
    // ==========================
    async actualizar(
        id: number,
        datos: Pick<Examen, "titulo" | "descripcion" | "url_formulario" | "fecha_limite">
    ): Promise<Examen | null> {

        const sql = `
            UPDATE examen
            SET titulo = $1, descripcion = $2, url_formulario = $3, fecha_limite = $4, fecha_actualizacion = NOW()
            WHERE id_examen = $5
            RETURNING *;
        `;

        const { rows } = await pool.query(sql, [
            datos.titulo,
            datos.descripcion ?? null,
            datos.url_formulario,
            datos.fecha_limite ?? null,
            id
        ]);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Eliminar
    // ==========================
    async eliminar(id: number): Promise<boolean> {

        const result = await pool.query("DELETE FROM examen WHERE id_examen = $1;", [id]);

        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==========================
    // Existe
    // ==========================
    async existe(id: number): Promise<boolean> {

        const { rows } = await pool.query("SELECT 1 FROM examen WHERE id_examen = $1;", [id]);

        return rows.length > 0;
    }

    // ==========================
    // Verificar propietario (docente dueño de la materia del tema)
    // ==========================
    async esDelDocente(idExamen: number, idDocente: number): Promise<boolean> {

        const sql = `
            SELECT e.id_examen
            FROM examen e
            INNER JOIN Tema t ON t.id_tema = e.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            WHERE e.id_examen = $1 AND m.id_docente = $2;
        `;

        const { rows } = await pool.query(sql, [idExamen, idDocente]);

        return rows.length > 0;
    }

}

export default new RepositorioExamenes();
