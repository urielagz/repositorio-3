import { pool } from "../config/database";

export type TipoNotificacion = "actividad" | "tema" | "examen" | "comentario" | "recurso" | "aviso";

class RepositorioNotificaciones {

    // Una fila por usuario (bulk insert) -- se usa para avisar a todos
    // los inscritos de una materia de un cambio de golpe.
    async crearParaUsuarios(idsUsuarios: number[], datos: { titulo: string; mensaje: string; tipo: TipoNotificacion }): Promise<void> {

        if (idsUsuarios.length === 0) {
            return;
        }

        const values: any[] = [];
        const filas: string[] = [];

        idsUsuarios.forEach((idUsuario, i) => {
            const base = i * 4;
            filas.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
            values.push(datos.titulo, datos.mensaje, datos.tipo, idUsuario);
        });

        const sql = `
            INSERT INTO notificacion (titulo, mensaje, tipo, id_usuario)
            VALUES ${filas.join(", ")};
        `;

        await pool.query(sql, values);

    }

    async listarPorUsuario(idUsuario: number) {

        const { rows } = await pool.query(
            "SELECT * FROM notificacion WHERE id_usuario = $1 ORDER BY fecha_creacion DESC;",
            [idUsuario]
        );

        return rows;
    }

    async marcarLeida(idNotificacion: number, idUsuario: number) {

        const { rows } = await pool.query(
            `UPDATE notificacion
             SET leida = TRUE, fecha_lectura = NOW()
             WHERE id_notificacion = $1 AND id_usuario = $2
             RETURNING *;`,
            [idNotificacion, idUsuario]
        );

        return rows.length ? rows[0] : null;
    }

}

export default new RepositorioNotificaciones();
