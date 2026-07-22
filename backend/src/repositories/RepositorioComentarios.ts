import { pool } from "../config/database";

// Tabla propia "comentario_comunidad", distinta de "comentario" (que
// quedó sin usar del esquema original, ligada a la tabla "publicacion"
// vieja de Anuncios/Asesorías).
export class RepositorioComentarios {

    async crear(contenido: string, id_usuario: number, id_publicacion: number) {

        const { rows } = await pool.query(
            `INSERT INTO comentario_comunidad (contenido, id_usuario, id_publicacion)
             VALUES ($1, $2, $3) RETURNING *`,
            [contenido, id_usuario, id_publicacion]
        );

        return rows[0];
    }

    // El docente aparece primero (comentario destacado/respuesta oficial),
    // luego el resto por orden cronológico.
    async listarPorPublicacion(id_publicacion: number) {

        const { rows } = await pool.query(
            `SELECT c.*, u.nombre, u.apellido, u.rol,
                    (u.rol = 'docente') AS destacado
             FROM comentario_comunidad c
             INNER JOIN Usuario u ON u.id_usuario = c.id_usuario
             WHERE c.id_publicacion = $1
             ORDER BY (u.rol = 'docente') DESC, c.fecha_comentario ASC`,
            [id_publicacion]
        );

        return rows;
    }

    async buscarPorId(id_comentario: number) {

        const { rows } = await pool.query(
            "SELECT * FROM comentario_comunidad WHERE id_comentario = $1",
            [id_comentario]
        );

        return rows.length ? rows[0] : null;
    }

    async eliminar(id_comentario: number): Promise<boolean> {

        const resultado = await pool.query(
            "DELETE FROM comentario_comunidad WHERE id_comentario = $1",
            [id_comentario]
        );

        return (resultado.rowCount ?? 0) > 0;
    }

}
