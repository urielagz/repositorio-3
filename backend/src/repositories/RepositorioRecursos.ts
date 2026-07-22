import { pool } from "../config/database";
import { Recurso, ArchivoRecurso } from "../models/Recurso";

class RepositorioRecursos {

    // ==========================
    // Obtener recursos de un tema
    // ==========================
    async obtenerPorTema(idTema: number): Promise<Recurso[]> {

        const sql = `
            SELECT *
            FROM Recurso
            WHERE id_tema = $1
            ORDER BY fecha_publicacion DESC;
        `;

        const { rows } = await pool.query(sql, [idTema]);

        return rows;
    }

    // ==========================
    // Buscar por ID
    // ==========================
    async obtenerPorId(id: number): Promise<Recurso | null> {

        const sql = `SELECT * FROM Recurso WHERE id_recurso = $1;`;

        const { rows } = await pool.query(sql, [id]);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Crear
    // ==========================
    async crear(recurso: Recurso): Promise<Recurso> {

        const sql = `
            INSERT INTO Recurso
            (titulo, descripcion, archivos, id_tema, id_usuario)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const values = [
            recurso.titulo,
            recurso.descripcion ?? null,
            JSON.stringify(recurso.archivos ?? []),
            recurso.id_tema,
            recurso.id_usuario
        ];

        const { rows } = await pool.query(sql, values);

        return rows[0];
    }

    // ==========================
    // Actualizar (metadatos y, opcionalmente, la lista de archivos)
    // ==========================
    async actualizar(
        id: number,
        titulo: string,
        descripcion: string,
        archivos?: ArchivoRecurso[]
    ): Promise<Recurso | null> {

        const sql = `
            UPDATE Recurso
            SET
                titulo = $1,
                descripcion = $2,
                archivos = COALESCE($3, archivos)
            WHERE id_recurso = $4
            RETURNING *;
        `;

        const values = [
            titulo,
            descripcion,
            archivos ? JSON.stringify(archivos) : null,
            id
        ];

        const { rows } = await pool.query(sql, values);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Eliminar
    // ==========================
    async eliminar(id: number): Promise<boolean> {

        const sql = `DELETE FROM Recurso WHERE id_recurso = $1;`;

        const result = await pool.query(sql, [id]);

        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==========================
    // Existe
    // ==========================
    async existe(id: number): Promise<boolean> {

        const sql = `SELECT 1 FROM Recurso WHERE id_recurso = $1;`;

        const { rows } = await pool.query(sql, [id]);

        return rows.length > 0;
    }

    // ==========================
    // Verificar propietario (docente dueño de la materia del tema)
    // ==========================
    async esDelDocente(idRecurso: number, idDocente: number): Promise<boolean> {

        const sql = `
            SELECT r.id_recurso
            FROM Recurso r
            INNER JOIN Tema t ON t.id_tema = r.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            WHERE r.id_recurso = $1 AND m.id_docente = $2;
        `;

        const { rows } = await pool.query(sql, [idRecurso, idDocente]);

        return rows.length > 0;
    }

}

export default new RepositorioRecursos();
