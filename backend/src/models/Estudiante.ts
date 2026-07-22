import { Usuario } from "./Usuario";

export class Estudiante extends Usuario {
    matricula: string;
    carrera: string;
    semestre: number;

    constructor(id: number, nombre: string, apellido: string, correo: string, contraseña: string, matricula: string, carrera: string, semestre: number) {
        super(id, nombre, apellido, correo, contraseña);
        this.matricula = matricula;
        this.carrera = carrera;
        this.semestre = semestre;
    }
}
