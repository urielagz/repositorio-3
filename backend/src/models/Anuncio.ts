export class Anuncio {
    id: number;
    titulo: string;
    descripcion: string;
    fecha: Date;

    constructor(id: number, titulo: string, descripcion: string, fecha: Date) {
        this.id = id;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.fecha = fecha;
    }
}
