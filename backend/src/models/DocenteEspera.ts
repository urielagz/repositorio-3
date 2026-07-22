export class DocenteEspera {
    id_solicitud: number;
    nombre: string;
    apellido: string;
    correo: string;
    cedula_profesional: string;
    diploma: string;
    estado: "pendiente" | "aprobado" | "rechazado";
    fecha_solicitud?: Date;
    fecha_revision?: Date;

    constructor(
        id_solicitud: number,
        nombre: string,
        apellido: string,
        correo: string,
        cedula_profesional: string,
        diploma: string,
        estado: "pendiente" | "aprobado" | "rechazado" = "pendiente",
        fecha_solicitud?: Date,
        fecha_revision?: Date
    ) {
        this.id_solicitud = id_solicitud;
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.cedula_profesional = cedula_profesional;
        this.diploma = diploma;
        this.estado = estado;
        this.fecha_solicitud = fecha_solicitud;
        this.fecha_revision = fecha_revision;
    }
}