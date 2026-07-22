export interface Materia {

    id_materia?: number;

    nombre: string;

    icono?: string;

    color?: string;

    orden?: number;

    fecha_creacion?: Date;

    fecha_actualizacion?: Date;

    id_docente: number;

    // Código que el alumno necesita para inscribirse. Se genera solo al
    // crear la materia y se envía por correo al docente -- no se expone
    // en los listados públicos de materias.
    token?: string;

}
