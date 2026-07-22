export class Horario {
    id: number;
    materia: number;
    dia: string;
    horaInicio: string;
    horaFin: string;

    constructor(id: number, materia: number, dia: string, horaInicio: string, horaFin: string) {
        this.id = id;
        this.materia = materia;
        this.dia = dia;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
    }
}
