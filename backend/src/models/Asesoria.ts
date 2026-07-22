export class Asesoria {
    id_asesoria: number;
    docente: string;
    fecha: Date;
    hora: string;
    enlace: string;

    constructor(id_asesoria: number, docente: string, fecha: Date, hora: string, enlace: string) {
        this.id_asesoria = id_asesoria;
        this.docente = docente;
        this.fecha = fecha;
        this.hora = hora;
        this.enlace = enlace;
    }
}
