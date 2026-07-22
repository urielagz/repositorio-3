import bcrypt from "bcrypt";

import { repos } from "../repositories";
import { generarJWT } from "../utils/generarJWT";

const repo = repos.usuarios;

export class LoginController {

    iniciarSesion = async (
        correo: string,
        contraseña: string
    ) => {

        const user = await repo.buscarPorCorreo(correo);

        if (!user) {
            return {
                ok: false,
                mensaje: "Usuario no encontrado"
            };
        }

        const coincide = await bcrypt.compare(
            contraseña,
            user.contrasena
        );

        if (!coincide) {
            return {
                ok: false,
                mensaje: "Credenciales incorrectas"
            };
        }

        const token = generarJWT(
            user.id_usuario,
            user.rol
        );

        return {
            ok: true,
            token,
            data: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                correo: user.correo,
                rol: user.rol
            }
        };
    };
}