import { pool } from "../config/database";
import { Materia } from "../models/Materia";
import { generarTokenMateria } from "../utils/generarTokenMateria";

const MAX_INTENTOS_TOKEN = 5;

// Materia es un contenedor simple (título + imagen + color) y es el
// nivel superior del módulo académico. "token" NUNCA se incluye en estas
// columnas públicas -- solo se devuelve una vez, en crear(), y se manda
// por correo al docente. El alumno lo necesita para inscribirse.
const COLUMNAS = `
    m.id_materia, m.nombre, m.icono, m.color, m.orden,
    m.id_docente, m.fecha_creacion, m.fecha_actualizacion
`;

class RepositorioMaterias {

    // ============================================
    // Obtener todas las materias
    // ============================================
    async obtenerTodas() {

        const sql = `
            SELECT ${COLUMNAS}
            FROM Materia m
            ORDER BY m.orden, m.nombre;
        `;

        const { rows } = await pool.query(sql);

        return rows;

    }

    // ============================================
    // Obtener por ID
    // ============================================

    async obtenerPorId(id: number) {

        const sql = `
            SELECT ${COLUMNAS}
            FROM Materia m
            WHERE m.id_materia = $1;
        `;

        const { rows } = await pool.query(sql, [id]);

        return rows.length ? rows[0] : null;

    }

    // ============================================
    // Obtener materias de un docente
    // ============================================

    async obtenerPorDocente(idDocente: number) {

        const sql = `
            SELECT ${COLUMNAS}
            FROM Materia m
            WHERE m.id_docente = $1
            ORDER BY m.orden, m.nombre;
        `;

        const { rows } = await pool.query(sql, [idDocente]);

        return rows;

    }

    // ============================================
    // Crear (genera un token de inscripción único)
    // ============================================

    async crear(materia: Materia) {

        const sql = `
            INSERT INTO Materia (nombre, icono, color, orden, id_docente, token)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING ${COLUMNAS.replace(/m\./g, "")}, token;
        `;

        for (let intento = 1; intento <= MAX_INTENTOS_TOKEN; intento++) {

            const token = await this.generarTokenUnico();

            const values = [
                materia.nombre,
                materia.icono ?? null,
                materia.color ?? null,
                materia.orden ?? 0,
                materia.id_docente,
                token
            ];

            try {

                const { rows } = await pool.query(sql, values);

                return rows[0];

            } catch (error: any) {

                // 23505 = unique_violation de Postgres. Si justo choca el
                // token (condición de carrera: otra petición concurrente
                // se coló entre nuestra verificación y el INSERT), se
                // reintenta con un token nuevo. Cualquier otro error se
                // propaga tal cual.
                const esTokenDuplicado = error?.code === "23505"
                    && String(error?.constraint ?? "").toLowerCase().includes("token");

                if (!esTokenDuplicado || intento === MAX_INTENTOS_TOKEN) {
                    throw error;
                }

            }

        }

        throw new Error("No fue posible generar un token de materia único, intenta de nuevo.");

    }

    // Genera un token y verifica contra la BD que no lo tenga ya otra
    // materia. No garantiza unicidad por sí solo (queda la constraint
    // UNIQUE de la tabla como respaldo ante condiciones de carrera), pero
    // evita el caso común de colisión.
    private async generarTokenUnico(): Promise<string> {

        for (let i = 0; i < MAX_INTENTOS_TOKEN * 2; i++) {

            const token = generarTokenMateria(8);

            const { rows } = await pool.query("SELECT 1 FROM Materia WHERE token = $1;", [token]);

            if (rows.length === 0) {
                return token;
            }

        }

        throw new Error("No fue posible generar un token de materia único, intenta de nuevo.");

    }

    // ============================================
    // Actualizar
    // ============================================

    async actualizar(id: number, materia: Materia) {

        const sql = `
            UPDATE Materia
            SET nombre = $1, icono = $2, color = $3, orden = $4
            WHERE id_materia = $5
            RETURNING ${COLUMNAS.replace(/m\./g, "")};
        `;

        const values = [
            materia.nombre,
            materia.icono ?? null,
            materia.color ?? null,
            materia.orden ?? 0,
            id
        ];

        const { rows } = await pool.query(sql, values);

        return rows.length ? rows[0] : null;

    }

    // ============================================
    // Eliminar
    // ============================================

    async eliminar(id: number) {

        const sql = `DELETE FROM Materia WHERE id_materia = $1;`;

        const result = await pool.query(sql, [id]);

        return (result.rowCount ?? 0) > 0;

    }

    // ============================================
    // Verificar existencia
    // ============================================

    async existe(id: number) {

        const sql = `SELECT id_materia FROM Materia WHERE id_materia = $1;`;

        const { rows } = await pool.query(sql, [id]);

        return rows.length > 0;

    }

    // ============================================
    // Obtener el token de inscripción (solo para el docente dueño o admin,
    // el controlador es quien filtra eso -- aquí no se valida propiedad)
    // ============================================

    async obtenerToken(id: number): Promise<string | null> {

        const sql = `SELECT token FROM Materia WHERE id_materia = $1;`;

        const { rows } = await pool.query(sql, [id]);

        return rows.length ? rows[0].token : null;

    }

    // ============================================
    // Verificar propietario
    // ============================================

    async esDelDocente(idMateria: number, idDocente: number) {

        const sql = `
            SELECT id_materia
            FROM Materia
            WHERE id_materia = $1 AND id_docente = $2;
        `;

        const { rows } = await pool.query(sql, [idMateria, idDocente]);

        return rows.length > 0;

    }

    // ============================================
    // Inscripción de alumnos (tabla usuario_materia)
    // ============================================

    // Correo/nombre de los alumnos inscritos -- para notificaciones.
    async obtenerAlumnosInscritos(idMateria: number): Promise<{ id_usuario: number; nombre: string; correo: string }[]> {

        const sql = `
            SELECT u.id_usuario, u.nombre, u.correo
            FROM usuario_materia um
            INNER JOIN Usuario u ON u.id_usuario = um.id_usuario
            WHERE um.id_materia = $1;
        `;

        const { rows } = await pool.query(sql, [idMateria]);

        return rows;

    }

    // Roster completo (con apellido y fecha de inscripción) para el panel
    // del docente -- a diferencia de obtenerAlumnosInscritos(), que solo
    // trae lo mínimo para mandar correos.
    async obtenerRosterInscritos(idMateria: number): Promise<{ id_usuario: number; nombre: string; apellido: string; correo: string; fecha_inscripcion: Date }[]> {

        const sql = `
            SELECT u.id_usuario, u.nombre, u.apellido, u.correo, um.fecha_inscripcion
            FROM usuario_materia um
            INNER JOIN Usuario u ON u.id_usuario = um.id_usuario
            WHERE um.id_materia = $1
            ORDER BY u.nombre, u.apellido;
        `;

        const { rows } = await pool.query(sql, [idMateria]);

        return rows;

    }

    // Busca la materia por su token de inscripción (columnas públicas,
    // sin exponer el token de vuelta).
    async buscarPorToken(token: string) {

        const sql = `
            SELECT ${COLUMNAS}
            FROM Materia m
            WHERE m.token = $1;
        `;

        const { rows } = await pool.query(sql, [token]);

        return rows.length ? rows[0] : null;

    }

    async estaInscrito(idUsuario: number, idMateria: number): Promise<boolean> {

        const { rows } = await pool.query(
            "SELECT 1 FROM usuario_materia WHERE id_usuario = $1 AND id_materia = $2;",
            [idUsuario, idMateria]
        );

        return rows.length > 0;

    }

    async estaInscritoPorTema(idUsuario: number, idTema: number): Promise<boolean> {

        const sql = `
            SELECT 1
            FROM usuario_materia um
            INNER JOIN Tema t ON t.id_materia = um.id_materia
            WHERE um.id_usuario = $1 AND t.id_tema = $2;
        `;

        const { rows } = await pool.query(sql, [idUsuario, idTema]);

        return rows.length > 0;

    }

    async estaInscritoPorRecurso(idUsuario: number, idRecurso: number): Promise<boolean> {

        const sql = `
            SELECT 1
            FROM usuario_materia um
            INNER JOIN Tema t ON t.id_materia = um.id_materia
            INNER JOIN Recurso r ON r.id_tema = t.id_tema
            WHERE um.id_usuario = $1 AND r.id_recurso = $2;
        `;

        const { rows } = await pool.query(sql, [idUsuario, idRecurso]);

        return rows.length > 0;

    }

    async estaInscritoPorActividad(idUsuario: number, idActividad: number): Promise<boolean> {

        const sql = `
            SELECT 1
            FROM usuario_materia um
            INNER JOIN Tema t ON t.id_materia = um.id_materia
            INNER JOIN Actividad a ON a.id_tema = t.id_tema
            WHERE um.id_usuario = $1 AND a.id_actividad = $2;
        `;

        const { rows } = await pool.query(sql, [idUsuario, idActividad]);

        return rows.length > 0;

    }

    async estaInscritoPorExamen(idUsuario: number, idExamen: number): Promise<boolean> {

        const sql = `
            SELECT 1
            FROM usuario_materia um
            INNER JOIN Tema t ON t.id_materia = um.id_materia
            INNER JOIN examen e ON e.id_tema = t.id_tema
            WHERE um.id_usuario = $1 AND e.id_examen = $2;
        `;

        const { rows } = await pool.query(sql, [idUsuario, idExamen]);

        return rows.length > 0;

    }

    // Materias en las que un alumno está inscrito -- para mostrar su
    // avance por materia en el perfil.
    async obtenerInscritasPorAlumno(idUsuario: number) {

        const sql = `
            SELECT ${COLUMNAS}
            FROM Materia m
            INNER JOIN usuario_materia um ON um.id_materia = m.id_materia
            WHERE um.id_usuario = $1
            ORDER BY m.orden, m.nombre;
        `;

        const { rows } = await pool.query(sql, [idUsuario]);

        return rows;

    }

    async inscribir(idUsuario: number, idMateria: number) {

        const sql = `
            INSERT INTO usuario_materia (id_usuario, id_materia)
            VALUES ($1, $2)
            RETURNING *;
        `;

        const { rows } = await pool.query(sql, [idUsuario, idMateria]);

        return rows[0];

    }

}

export default new RepositorioMaterias();
