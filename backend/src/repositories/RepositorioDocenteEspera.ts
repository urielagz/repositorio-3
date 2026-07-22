import { pool } from "../config/database";
import { DocenteEspera } from "../models/DocenteEspera";

export class RepositorioDocenteEspera {

    private mapFila(row: any): DocenteEspera {
        return new DocenteEspera(
            row.id_solicitud,
            row.nombre,
            row.apellido,
            row.correo,
            row.cedula_profesional,
            row.diploma,
            row.estado,
            row.fecha_solicitud,
            row.fecha_revision
        );
    }

    async agregar(
        nombre: string,
        apellido: string,
        correo: string,
        cedula_profesional: string,
        diploma: string
    ): Promise<DocenteEspera> {
        const resultado = await pool.query(
            `INSERT INTO DocenteEspera (nombre, apellido, correo, cedula_profesional, diploma)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [nombre, apellido, correo, cedula_profesional, diploma]
        );
        return this.mapFila(resultado.rows[0]);
    }

    async listarPendientes(): Promise<DocenteEspera[]> {
        const resultado = await pool.query(
            "SELECT * FROM DocenteEspera WHERE estado = 'pendiente' ORDER BY fecha_solicitud ASC"
        );
        return resultado.rows.map(row => this.mapFila(row));
    }

    async buscarPorId(id_solicitud: number): Promise<DocenteEspera | undefined> {
        const resultado = await pool.query(
            "SELECT * FROM DocenteEspera WHERE id_solicitud = $1",
            [id_solicitud]
        );
        return resultado.rows[0] ? this.mapFila(resultado.rows[0]) : undefined;
    }

    async buscarPorCorreo(correo: string): Promise<DocenteEspera | undefined> {
        const resultado = await pool.query(
            "SELECT * FROM DocenteEspera WHERE correo = $1",
            [correo]
        );
        return resultado.rows[0] ? this.mapFila(resultado.rows[0]) : undefined;
    }

    async actualizarEstado(id_solicitud: number, estado: "aprobado" | "rechazado"): Promise<void> {
        await pool.query(
            "UPDATE DocenteEspera SET estado = $1, fecha_revision = NOW() WHERE id_solicitud = $2",
            [estado, id_solicitud]
        );
    }
}