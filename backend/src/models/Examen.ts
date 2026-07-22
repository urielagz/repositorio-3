// El examen no se desarrolla dentro del sistema: solo se guarda un
// título, una descripción y la URL de un formulario externo (Google
// Forms). Vive dentro de un tema (como las actividades) -- un tema
// puede tener varios exámenes.
export interface Examen {

    id_examen?: number;

    titulo: string;

    descripcion?: string;

    url_formulario: string;

    // Para el calendario/recordatorios del alumno.
    fecha_limite?: Date;

    id_tema: number;

    id_docente?: number;

    fecha_creacion?: Date;

    fecha_actualizacion?: Date;

}
