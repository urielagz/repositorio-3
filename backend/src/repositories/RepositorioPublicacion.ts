import { pool } from "../config/database";
import { Publicacion } from "../models/Publicacion";

// Tabla propia "publicacion_comunidad", DISTINTA de "publicacion" (que ya
// usan Anuncios y Asesorías) para que no se mezclen ambos features.
export class RepositorioPublicaciones {

    // ==========================
    // Crear
    // ==========================
    async crear(publicacion: Publicacion): Promise<Publicacion> {

        const sql = `
            INSERT INTO publicacion_comunidad
            (titulo, contenido, tipo, archivos, id_usuario, id_materia, id_tema, id_actividad, id_examen)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;

        const values = [
            publicacion.titulo,
            publicacion.contenido ?? null,
            publicacion.tipo,
            JSON.stringify(publicacion.archivos ?? []),
            publicacion.id_usuario,
            publicacion.id_materia ?? null,
            publicacion.id_tema ?? null,
            publicacion.id_actividad ?? null,
            publicacion.id_examen ?? null
        ];

        const { rows } = await pool.query(sql, values);

        return rows[0];
    }

    // ==========================
    // Feed de una materia (siempre acotado, como un grupo por clase)
    // ==========================
    async listarPorMateria(idMateria: number, tipo?: string) {

        const condiciones = ["p.id_materia = $1"];
        const valores: any[] = [idMateria];

        if (tipo) {
            valores.push(tipo);
            condiciones.push(`p.tipo = $${valores.length}`);
        }

        const sql = `
            SELECT p.*, u.nombre, u.apellido, u.rol,
                   t.nombre AS nombre_tema, a.titulo AS titulo_actividad, e.titulo AS titulo_examen
            FROM publicacion_comunidad p
            INNER JOIN Usuario u ON u.id_usuario = p.id_usuario
            LEFT JOIN Tema t ON t.id_tema = p.id_tema
            LEFT JOIN Actividad a ON a.id_actividad = p.id_actividad
            LEFT JOIN examen e ON e.id_examen = p.id_examen
            WHERE ${condiciones.join(" AND ")}
            ORDER BY p.fecha_publicacion DESC;
        `;

        const { rows } = await pool.query(sql, valores);

        return rows;
    }

    // ==========================
    // Feed general de la comunidad (sin materia): cualquier autenticado
    // puede verlo, no requiere inscripción.
    // ==========================
    async listarGeneral(tipo?: string) {

        const condiciones = ["p.id_materia IS NULL"];
        const valores: any[] = [];

        if (tipo) {
            valores.push(tipo);
            condiciones.push(`p.tipo = $${valores.length}`);
        }

        const sql = `
            SELECT p.*, u.nombre, u.apellido, u.rol
            FROM publicacion_comunidad p
            INNER JOIN Usuario u ON u.id_usuario = p.id_usuario
            WHERE ${condiciones.join(" AND ")}
            ORDER BY p.fecha_publicacion DESC;
        `;

        const { rows } = await pool.query(sql, valores);

        return rows;
    }

    async buscarPorId(idPublicacion: number) {

        const sql = `
            SELECT p.*, u.nombre, u.apellido, u.rol
            FROM publicacion_comunidad p
            INNER JOIN Usuario u ON u.id_usuario = p.id_usuario
            WHERE p.id_publicacion = $1;
        `;

        const { rows } = await pool.query(sql, [idPublicacion]);

        return rows.length ? rows[0] : null;
    }

    async eliminar(idPublicacion: number): Promise<boolean> {

        const result = await pool.query(
            "DELETE FROM publicacion_comunidad WHERE id_publicacion = $1;",
            [idPublicacion]
        );

        return (result.rowCount ?? 0) > 0;
    }

}

export default new RepositorioPublicaciones();
