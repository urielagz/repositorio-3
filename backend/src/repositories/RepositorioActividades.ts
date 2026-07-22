import { pool } from "../config/database";
import { Actividad, EntregaActividad } from "../models/Actividad";

// Mismo default que la columna actividad.archivos_permitidos en
// database.sql. Se necesita duplicado acá porque un NULL explícito en el
// INSERT/UPDATE pisa el DEFAULT de Postgres en vez de dejarlo actuar.
// Son categorías (las mismas que devuelve clasificarTipo() en
// config/uploadAcademico.ts), no extensiones sueltas -- por defecto se
// permiten todas.
const ARCHIVOS_PERMITIDOS_DEFAULT =
    "pdf,documento,presentacion,hoja_calculo,imagen,audio,video,comprimido,codigo,diseno,modelo_3d";

class RepositorioActividades {

    // ==========================
    // Obtener actividades de un tema
    // ==========================
    async obtenerPorTema(idTema: number): Promise<Actividad[]> {

        const sql = `
            SELECT *
            FROM Actividad
            WHERE id_tema = $1
            ORDER BY fecha_limite NULLS LAST, id_actividad;
        `;

        const { rows } = await pool.query(sql, [idTema]);

        return rows;
    }

    // ==========================
    // Buscar por ID
    // ==========================
    async obtenerPorId(id: number): Promise<Actividad | null> {

        const sql = `SELECT * FROM Actividad WHERE id_actividad = $1;`;

        const { rows } = await pool.query(sql, [id]);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Crear
    // ==========================
    async crear(actividad: Actividad): Promise<Actividad> {

        const sql = `
            INSERT INTO Actividad
            (titulo, descripcion, fecha_limite, puntaje, archivos_permitidos, archivos_apoyo, id_tema, id_docente)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;

        const values = [
            actividad.titulo,
            actividad.descripcion ?? null,
            actividad.fecha_limite ?? null,
            actividad.puntaje ?? 10,
            actividad.archivos_permitidos ?? ARCHIVOS_PERMITIDOS_DEFAULT,
            JSON.stringify(actividad.archivos_apoyo ?? []),
            actividad.id_tema,
            actividad.id_docente ?? null
        ];

        const { rows } = await pool.query(sql, values);

        return rows[0];
    }

    // ==========================
    // Actualizar
    // ==========================
    async actualizar(
        id: number,
        datos: Pick<Actividad, "titulo" | "descripcion" | "fecha_limite" | "puntaje" | "archivos_permitidos" | "archivos_apoyo">
    ): Promise<Actividad | null> {

        const sql = `
            UPDATE Actividad
            SET titulo = $1, descripcion = $2, fecha_limite = $3, puntaje = $4, archivos_permitidos = $5, archivos_apoyo = $6
            WHERE id_actividad = $7
            RETURNING *;
        `;

        const values = [
            datos.titulo,
            datos.descripcion ?? null,
            datos.fecha_limite ?? null,
            datos.puntaje ?? 10,
            datos.archivos_permitidos ?? ARCHIVOS_PERMITIDOS_DEFAULT,
            JSON.stringify(datos.archivos_apoyo ?? []),
            id
        ];

        const { rows } = await pool.query(sql, values);

        return rows.length ? rows[0] : null;
    }

    // ==========================
    // Eliminar
    // ==========================
    async eliminar(id: number): Promise<boolean> {

        const result = await pool.query("DELETE FROM Actividad WHERE id_actividad = $1;", [id]);

        return result.rowCount !== null && result.rowCount > 0;
    }

    // ==========================
    // Existe
    // ==========================
    async existe(id: number): Promise<boolean> {

        const { rows } = await pool.query("SELECT 1 FROM Actividad WHERE id_actividad = $1;", [id]);

        return rows.length > 0;
    }

    // ==========================
    // Verificar propietario (docente dueño de la materia del tema)
    // ==========================
    async esDelDocente(idActividad: number, idDocente: number): Promise<boolean> {

        const sql = `
            SELECT a.id_actividad
            FROM Actividad a
            INNER JOIN Tema t ON t.id_tema = a.id_tema
            INNER JOIN Materia m ON m.id_materia = t.id_materia
            WHERE a.id_actividad = $1 AND m.id_docente = $2;
        `;

        const { rows } = await pool.query(sql, [idActividad, idDocente]);

        return rows.length > 0;
    }

    // ==========================================================
    // Entregas (tabla actividad_completada)
    // ==========================================================

    async entregar(entrega: EntregaActividad): Promise<EntregaActividad> {

        const sql = `
            INSERT INTO actividad_completada
            (id_usuario, id_actividad, fecha_entrega, archivos, url_entrega, comentario_alumno)
            VALUES ($1, $2, NOW(), $3, $4, $5)
            ON CONFLICT (id_usuario, id_actividad)
            DO UPDATE SET
                fecha_entrega = NOW(),
                archivos = EXCLUDED.archivos,
                url_entrega = EXCLUDED.url_entrega,
                comentario_alumno = EXCLUDED.comentario_alumno,
                calificacion = NULL,
                observaciones_docente = NULL
            RETURNING *;
        `;

        const values = [
            entrega.id_usuario,
            entrega.id_actividad,
            JSON.stringify(entrega.archivos ?? []),
            entrega.url_entrega ?? null,
            entrega.comentario_alumno ?? null
        ];

        const { rows } = await pool.query(sql, values);

        return rows[0];
    }

    async obtenerEntregasDeActividad(idActividad: number): Promise<EntregaActividad[]> {

        const sql = `
            SELECT ac.*, u.nombre, u.apellido
            FROM actividad_completada ac
            INNER JOIN Usuario u ON u.id_usuario = ac.id_usuario
            WHERE ac.id_actividad = $1
            ORDER BY ac.fecha_entrega DESC;
        `;

        const { rows } = await pool.query(sql, [idActividad]);

        return rows;
    }

    async obtenerEntregasDeAlumno(idAlumno: number): Promise<EntregaActividad[]> {

        const sql = `
            SELECT ac.*, a.titulo, a.puntaje
            FROM actividad_completada ac
            INNER JOIN Actividad a ON a.id_actividad = ac.id_actividad
            WHERE ac.id_usuario = $1
            ORDER BY ac.fecha_entrega DESC;
        `;

        const { rows } = await pool.query(sql, [idAlumno]);

        return rows;
    }

    async obtenerEntregaPorId(idRegistro: number): Promise<EntregaActividad | null> {

        const { rows } = await pool.query("SELECT * FROM actividad_completada WHERE id_registro = $1", [idRegistro]);

        return rows.length ? rows[0] : null;
    }

    // La entrega de un alumno es única por (id_usuario, id_actividad) --
    // así el alumno la busca sin necesitar el id_registro.
    async obtenerEntregaDeAlumno(idUsuario: number, idActividad: number): Promise<EntregaActividad | null> {

        const { rows } = await pool.query(
            "SELECT * FROM actividad_completada WHERE id_usuario = $1 AND id_actividad = $2",
            [idUsuario, idActividad]
        );

        return rows.length ? rows[0] : null;
    }

    async eliminarEntrega(idRegistro: number): Promise<boolean> {

        const result = await pool.query("DELETE FROM actividad_completada WHERE id_registro = $1;", [idRegistro]);

        return result.rowCount !== null && result.rowCount > 0;
    }

    async calificar(idRegistro: number, calificacion: number, observaciones_docente: string): Promise<EntregaActividad | null> {

        const sql = `
            UPDATE actividad_completada
            SET calificacion = $1, observaciones_docente = $2
            WHERE id_registro = $3
            RETURNING *;
        `;

        const { rows } = await pool.query(sql, [calificacion, observaciones_docente ?? null, idRegistro]);

        return rows.length ? rows[0] : null;
    }

}

export default new RepositorioActividades();
