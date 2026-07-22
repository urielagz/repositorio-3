// "publico": un único grupo, visible para cualquier autenticado.
// "materia": grupo privado, solo el docente dueño y los alumnos
// inscritos en esa materia (como un grupo de WhatsApp/Teams de la clase).
export type TipoGrupoChat = "publico" | "materia";

export interface ArchivoMensajeChat {
    url: string;
    nombre_original: string;
    tipo: string;
}

export interface GrupoChat {

    id_grupo?: number;

    nombre: string;

    tipo: TipoGrupoChat;

    // Solo aplica cuando tipo = "materia".
    id_materia?: number;

    // Docente que creó el grupo de su materia.
    id_docente?: number;

    fecha_creacion?: Date;

}

export interface MensajeChat {

    id_mensaje?: number;

    id_grupo: number;

    id_usuario: number;

    contenido?: string;

    archivos?: ArchivoMensajeChat[];

    fecha_envio?: Date;

}
