import { RepositorioUsuarios } from "../repositories/RepositorioUsuarios";
import { Usuario } from "../models/Usuario";

export class RegistroController {

    constructor(private repoUsuarios: RepositorioUsuarios) {}

    async registrar(nombre: string, apellido: string, correo: string, contraseña: string): Promise<Usuario> {
        return this.repoUsuarios.agregar(nombre, apellido, correo, contraseña);
    }

}
