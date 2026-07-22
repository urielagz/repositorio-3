import { pool } from "../config/database";
import { Usuario } from "../models/Usuario";

export class RepositorioUsuarios {

    private mapFilaAFila(row: any): Usuario {
        return new Usuario(
            row.id_usuario,
            row.nombre,
            row.apellido,
            row.correo,
            row.contrasena,
            row.rol,
            row.foto_perfil,
            row.biografia,
            row.fecha_registro,
            row.estado
        );
    }

    async listar(): Promise<Usuario[]> {
        const resultado = await pool.query("SELECT * FROM Usuario");
        return resultado.rows.map(row => this.mapFilaAFila(row));
    }

    async agregar(
        nombre: string,
        apellido: string,
        correo: string,
        contrasena: string,
        rol: string = "ESTUDIANTE"
    ): Promise<Usuario> {
        const fecha_registro = new Date();
        const estado = true;

        const resultado = await pool.query(
            `INSERT INTO Usuario
             (nombre, apellido, correo, contrasena, rol, fecha_registro, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [nombre, apellido, correo, contrasena, rol, fecha_registro, estado]
        );

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async buscarPorId(id_usuario: number): Promise<Usuario | undefined> {
        const resultado = await pool.query(
            "SELECT * FROM Usuario WHERE id_usuario = $1",
            [id_usuario]
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async buscarPorCorreo(correo: string): Promise<Usuario | undefined> {
        const resultado = await pool.query(
            "SELECT * FROM Usuario WHERE correo = $1",
            [correo]
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async actualizar(
        id_usuario: number,
        datos: Partial<Usuario>
    ): Promise<Usuario | undefined> {
        const campos: string[] = [];
        const valores: any[] = [];
        let index = 1;

        if (datos.nombre) {
            campos.push(`nombre = $${index++}`);
            valores.push(datos.nombre);
        }

        if (datos.apellido) {
            campos.push(`apellido = $${index++}`);
            valores.push(datos.apellido);
        }

        if (datos.correo) {
            campos.push(`correo = $${index++}`);
            valores.push(datos.correo);
        }

        if (datos.rol) {
            campos.push(`rol = $${index++}`);
            valores.push(datos.rol);
        }

        if (datos.foto_perfil !== undefined) {
            campos.push(`foto_perfil = $${index++}`);
            valores.push(datos.foto_perfil);
        }

        if (datos.biografia !== undefined) {
            campos.push(`biografia = $${index++}`);
            valores.push(datos.biografia);
        }

        if (datos.estado !== undefined) {
            campos.push(`estado = $${index++}`);
            valores.push(datos.estado);
        }

        if (campos.length === 0) {
            return this.buscarPorId(id_usuario);
        }

        valores.push(id_usuario);

        const resultado = await pool.query(
            `UPDATE Usuario SET ${campos.join(", ")} WHERE id_usuario = $${index} RETURNING *`,
            valores
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async eliminar(id_usuario: number): Promise<boolean> {
        const resultado = await pool.query(
            "DELETE FROM Usuario WHERE id_usuario = $1",
            [id_usuario]
        );

        return resultado.rowCount > 0;
    }

    async actualizarContraseña(
        id_usuario: number,
        nuevaContrasena: string
    ): Promise<Usuario | undefined> {
        const resultado = await pool.query(
            `UPDATE Usuario SET contrasena = $1 WHERE id_usuario = $2 RETURNING *`,
            [nuevaContrasena, id_usuario]
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }
}
