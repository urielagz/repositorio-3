export class Usuario {
    id_usuario: number;
    nombre: string;
    apellido: string;
    correo: string;
    contrasena: string;
    rol: string;
    foto_perfil?: string;
    biografia?: string;
    fecha_registro?: Date;
    estado: boolean = true;

    constructor(
        id_usuario: number,
        nombre: string,
        apellido: string,
        correo: string,
        contrasena: string,
        rol: string = "ESTUDIANTE",
        foto_perfil?: string,
        biografia?: string,
        fecha_registro?: Date,
        estado: boolean = true
    ) {
        this.id_usuario = id_usuario;
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.contrasena = contrasena;
        this.rol = rol;
        this.foto_perfil = foto_perfil;
        this.biografia = biografia;
        this.fecha_registro = fecha_registro;
        this.estado = estado;
    }
}