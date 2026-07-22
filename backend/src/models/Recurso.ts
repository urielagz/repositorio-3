// Debe coincidir con las categorías que devuelve clasificarTipo() en
// config/uploadAcademico.ts.
export type TipoRecurso =
    | "pdf"
    | "documento"
    | "presentacion"
    | "hoja_calculo"
    | "imagen"
    | "audio"
    | "video"
    | "comprimido"
    | "codigo"
    | "diseno"
    | "modelo_3d"
    | "otro";

// Archivo adjunto a un recurso (mismo patrón que ArchivoApoyo de Actividad
// y ArchivoPublicacion de Comunidad). Un recurso admite hasta 5.
export interface ArchivoRecurso {
    url: string;
    nombre_original: string;
    tipo: TipoRecurso;
    extension?: string;
    tamano_bytes?: number;
}

export interface Recurso {

    id_recurso?: number;

    titulo: string;

    descripcion?: string;

    archivos: ArchivoRecurso[];

    fecha_publicacion?: Date;

    id_tema: number;

    id_usuario: number;

}
