export class Tema {
    id_tema: number;
    nombre: string;
    descripcion: string;
    introduccion: string | null;
    contenido: string | null;
    imagen1: string | null;
    imagen2: string | null;
    orden: number;
    id_materia: number;

    constructor(
        id_tema: number,
        nombre: string,
        descripcion: string,
        introduccion: string | null,
        contenido: string | null,
        imagen1: string | null,
        imagen2: string | null,
        orden: number,
        id_materia: number
    ) {
        this.id_tema = id_tema;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.introduccion = introduccion;
        this.contenido = contenido;
        this.imagen1 = imagen1;
        this.imagen2 = imagen2;
        this.orden = orden;
        this.id_materia = id_materia;
    }
}
