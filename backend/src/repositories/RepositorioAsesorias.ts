import { pool } from "../config/database";
import { Asesoria } from "../models/Asesoria";

export class RepositorioAsesorias {

    private mapFilaAFila(row: any): Asesoria {
        let hora = "";
        let enlace = "";

        if (row.contenido) {
            try {
                const contenido = JSON.parse(row.contenido);
                if (typeof contenido === "object" && contenido !== null) {
                    hora = contenido.hora || "";
                    enlace = contenido.enlace || "";
                }
            } catch {
                const matches = /hora:\s*([^;]+);?/.exec(row.contenido);
                if (matches) {
                    hora = matches[1].trim();
                }
                const urlMatch = /enlace:\s*(\S+)/.exec(row.contenido);
                if (urlMatch) {
                    enlace = urlMatch[1].trim();
                }
            }
        }

        return new Asesoria(
            row.id_publicacion,
            row.titulo,
            row.fecha_publicacion,
            hora,
            enlace
        );
    }

    private getMarcaAsesoria(): string {
        return '"__asesoria":true';
    }

    async listar(): Promise<Asesoria[]> {
        const resultado = await pool.query(
            `SELECT * FROM publicacion WHERE contenido LIKE '%${this.getMarcaAsesoria()}%'`
        );
        return resultado.rows.map(row => this.mapFilaAFila(row));
    }

    async agregar(docente: string, fecha: Date, hora: string, enlace: string): Promise<Asesoria> {
        const usuarioDefault = await pool.query("SELECT id_usuario FROM usuario LIMIT 1");
        const id_usuario = usuarioDefault.rows[0]?.id_usuario;

        const contenido = JSON.stringify({ __asesoria: true, hora, enlace });

        const resultado = await pool.query(
            `INSERT INTO publicacion
             (titulo, contenido, fecha_publicacion, id_usuario)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [docente, contenido, fecha, id_usuario]
        );

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async buscarPorId(id_asesoria: number): Promise<Asesoria | undefined> {
        const resultado = await pool.query(
            `SELECT * FROM publicacion
             WHERE id_publicacion = $1
               AND contenido LIKE '%${this.getMarcaAsesoria()}%'`,
            [id_asesoria]
        );

        if (resultado.rows.length === 0) {
            return undefined;
        }

        return this.mapFilaAFila(resultado.rows[0]);
    }

    async eliminar(id_asesoria: number): Promise<boolean> {
        const resultado = await pool.query(
            `DELETE FROM publicacion
             WHERE id_publicacion = $1
               AND contenido LIKE '%${this.getMarcaAsesoria()}%'`,
            [id_asesoria]
        );

        return resultado.rowCount > 0;
    }

}
