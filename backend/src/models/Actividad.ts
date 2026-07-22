// Archivo de apoyo subido por el docente al crear/editar una actividad.
export interface ArchivoApoyo {
    url: string;
    nombre_original: string;
}

export interface Actividad {

    id_actividad?: number;

    titulo: string;

    descripcion?: string;

    fecha_limite?: Date;

    puntaje?: number;

    archivos_permitidos?: string;

    archivos_apoyo?: ArchivoApoyo[];

    id_tema: number;

    id_docente?: number;

}

// Archivo adjunto a una entrega de alumno (mismo patrón que ArchivoApoyo).
export interface ArchivoEntrega {
    url: string;
    nombre_original: string;
}

// Entrega de un alumno para una actividad (tabla actividad_completada).
// El alumno entrega vía archivos (hasta 5), texto y/o una URL (ej. un
// enlace a Drive o un video) -- se exige al menos una de las tres, pero
// ninguna es obligatoria por sí sola.
export interface EntregaActividad {

    id_registro?: number;

    id_usuario: number;

    id_actividad: number;

    archivos?: ArchivoEntrega[];

    url_entrega?: string;

    fecha_entrega?: Date;

    calificacion?: number | null;

    comentario_alumno?: string;

    observaciones_docente?: string;

}
