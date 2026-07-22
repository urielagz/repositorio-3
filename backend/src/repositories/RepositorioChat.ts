import { pool } from "../config/database";
import RepositorioMaterias from "./RepositorioMateria";
import { GrupoChat, MensajeChat } from "../models/Chat";

class RepositorioChat {

    // ==========================
    // Grupo público (único, sembrado en database.sql)
    // ==========================
    async obtenerGrupoPublico(): Promise<GrupoChat | null> {

        const { rows } = await pool.query(
            "SELECT * FROM grupo_chat WHERE tipo = 'publico' LIMIT 1;"
        );

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Crear grupo de materia (uno solo por materia -- UNIQUE(id_materia)
    // en la tabla es la red de seguridad ante condición de carrera)
    // ==========================
    async crearGrupoMateria(idMateria: number, idDocente: number, nombre: string): Promise<GrupoChat> {

        const sql = `
            INSERT INTO grupo_chat (nombre, tipo, id_materia, id_docente)
            VALUES ($1, 'materia', $2, $3)
            RETURNING *;
        `;

        const { rows } = await pool.query(sql, [nombre, idMateria, idDocente]);

        return rows[0];
    }

    async obtenerGrupoPorMateria(idMateria: number): Promise<GrupoChat | null> {

        const { rows } = await pool.query(
            "SELECT * FROM grupo_chat WHERE id_materia = $1;",
            [idMateria]
        );

        return rows.length ? rows[0] : null;
    }

    async obtenerGrupoPorId(idGrupo: number): Promise<GrupoChat | null> {

        const { rows } = await pool.query(
            "SELECT * FROM grupo_chat WHERE id_grupo = $1;",
            [idGrupo]
        );

        return rows.length ? rows[0] : null;
    }

    // Chats visibles para un usuario: el público siempre, más los grupos
    // de materia donde es alumno inscrito o el docente dueño. Admin ve
    // todos.
    async listarGruposDeUsuario(idUsuario: number, rol: string): Promise<GrupoChat[]> {

        if (rol === "admin") {
            const { rows } = await pool.query(
                "SELECT * FROM grupo_chat ORDER BY tipo, nombre;"
            );
            return rows;
        }

        if (rol === "docente") {
            const sql = `
                SELECT g.*
                FROM grupo_chat g
                WHERE g.tipo = 'publico'
                   OR g.id_materia IN (SELECT id_materia FROM materia WHERE id_docente = $1)
                ORDER BY g.tipo, g.nombre;
            `;
            const { rows } = await pool.query(sql, [idUsuario]);
            return rows;
        }

        // alumno
        const sql = `
            SELECT g.*
            FROM grupo_chat g
            WHERE g.tipo = 'publico'
               OR g.id_materia IN (SELECT id_materia FROM usuario_materia WHERE id_usuario = $1)
            ORDER BY g.tipo, g.nombre;
        `;
        const { rows } = await pool.query(sql, [idUsuario]);
        return rows;
    }

    // Si tipo = "publico", cualquier autenticado pertenece. Si tipo =
    // "materia", debe estar inscrito (alumno) o ser el dueño de la
    // materia (docente); admin siempre puede.
    async esMiembro(idGrupo: number, idUsuario: number, rol: string): Promise<boolean> {

        const grupo = await this.obtenerGrupoPorId(idGrupo);

        if (!grupo) {
            return false;
        }

        if (grupo.tipo === "publico") {
            return true;
        }

        if (rol === "admin") {
            return true;
        }

        if (!grupo.id_materia) {
            return false;
        }

        if (rol === "docente") {
            return RepositorioMaterias.esDelDocente(grupo.id_materia, idUsuario);
        }

        return RepositorioMaterias.estaInscrito(idUsuario, grupo.id_materia);
    }

    // ==========================
    // Mensajes
    // ==========================
    // Devuelve el mensaje ya con nombre/apellido/rol del autor (el JWT
    // solo trae id+rol -- ver utils/generarJWT.ts -- así que el nombre
    // para mostrar en el chat sale de aquí, no del token).
    async crearMensaje(mensaje: MensajeChat): Promise<MensajeChat> {

        const sql = `
            INSERT INTO mensaje_chat (id_grupo, id_usuario, contenido, archivos)
            VALUES ($1, $2, $3, $4)
            RETURNING id_mensaje;
        `;

        const values = [
            mensaje.id_grupo,
            mensaje.id_usuario,
            mensaje.contenido ?? null,
            JSON.stringify(mensaje.archivos ?? [])
        ];

        const { rows } = await pool.query(sql, values);

        const { rows: filaCompleta } = await pool.query(
            `SELECT m.*, u.nombre, u.apellido, u.rol
             FROM mensaje_chat m
             INNER JOIN Usuario u ON u.id_usuario = m.id_usuario
             WHERE m.id_mensaje = $1;`,
            [rows[0].id_mensaje]
        );

        return filaCompleta[0];
    }

    // Últimos "limite" mensajes del grupo, en orden cronológico. Si se
    // manda "antesDe" (id_mensaje), trae los "limite" mensajes
    // anteriores a ese -- para ir cargando historial hacia atrás.
    async listarMensajes(idGrupo: number, limite: number = 50, antesDe?: number): Promise<MensajeChat[]> {

        const condiciones = ["m.id_grupo = $1"];
        const valores: any[] = [idGrupo];

        if (antesDe) {
            valores.push(antesDe);
            condiciones.push(`m.id_mensaje < $${valores.length}`);
        }

        valores.push(limite);

        const sql = `
            SELECT m.*, u.nombre, u.apellido, u.rol
            FROM mensaje_chat m
            INNER JOIN Usuario u ON u.id_usuario = m.id_usuario
            WHERE ${condiciones.join(" AND ")}
            ORDER BY m.id_mensaje DESC
            LIMIT $${valores.length};
        `;

        const { rows } = await pool.query(sql, valores);

        return rows.reverse();
    }

}

export default new RepositorioChat();
