import { pool } from "../config/database";
import { Anuncio } from "../models/Anuncio";

export class RepositorioAnuncios {

    private mapFilaAFila(row: any): Anuncio {
        return new Anuncio(
            row.id_publicacion,
            row.titulo,
            row.contenido,
            row.fecha_publicacion
        );
    }

    async listar(): Promise<Anuncio[]> {
        const resultado = await pool.query("SELECT * FROM publicacion");
        return resultado.rows.map(row => this.mapFilaAFila(row));
    }

    async agregar(titulo: string, descripcion: string, fecha: Date): Promise<Anuncio> {
        const resultado = await pool.query(
            `INSERT INTO publicacion (titulo, contenido, fecha_publicacion, id_usuario)
             VALUES ($1, $2, $3, 1)
             RETURNING *`,
            [titulo, descripcion, fecha]
        );

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async buscarPorId(id: number): Promise<Anuncio | undefined> {
        const resultado = await pool.query(
            "SELECT * FROM publicacion WHERE id_publicacion = $1",
            [id]
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async eliminar(id: number): Promise<boolean> {
        const resultado = await pool.query(
            "DELETE FROM publicacion WHERE id_publicacion = $1",
            [id]
        );

        return resultado.rowCount > 0;
    }

}
