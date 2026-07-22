// DTO de solo lectura sobre actividad_completada para dar una vista de
// calificaciones por materia/alumno. El examen final no calificaeq dentro
// dentro del sistema, así que el único origen posible es "actividad".
export interface Calificacion {

    tipo: "actividad";

    id_origen: number;

    titulo: string;

    id_usuario: number;

    nombre?: string;

    apellido?: string;

    calificacion: number | null;

    puntaje_maximo: number;

    fecha: Date;

    id_materia: number;

}
