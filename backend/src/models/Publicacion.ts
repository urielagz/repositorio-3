export type TipoPublicacion = "general" | "pregunta" | "recurso";

// Archivo adjunto a una publicación (igual patrón que ArchivoApoyo de
// Actividad): varias fotos/videos/PDF/Word/Excel por publicación.
export interface ArchivoPublicacion {
    url: string;
    nombre_original: string;
    tipo: string;
}

export interface Publicacion {

    id_publicacion?: number;

    titulo: string;

    contenido?: string;

    tipo: TipoPublicacion;

    archivos?: ArchivoPublicacion[];

    id_usuario: number;

    // Si se manda id_materia, el post vive dentro del feed de esa
    // materia (como un grupo de Facebook/Instagram por clase), acotado
    // por inscripción/propiedad. Si se omite, es un post del feed
    // general de la comunidad (visible para cualquier autenticado, sin
    // inscripción). id_tema/id_actividad/id_examen solo aplican cuando
    // hay id_materia, para dar contexto extra dentro de esa materia.
    id_materia?: number;

    id_tema?: number;

    id_actividad?: number;

    id_examen?: number;

    fecha_publicacion?: Date;

}
