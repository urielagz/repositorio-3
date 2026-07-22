import { Request, Response } from "express";
import bcrypt from "bcrypt";

import { repos } from "../repositories";
import { generarJWT } from "../utils/generarJWT";
import {
    generarTokenRecuperacion,
    validarToken,
    eliminarToken
} from "../utils/tokensRecuperacion";
import { enviarCorreo } from "../config/mailer";

const repo = repos.usuarios;

export class UsuarioController {

    registrar = async (req: Request, res: Response) => {
        const {
            nombre,
            apellido,
            correo,
            contraseña,
            rol
        } = req.body;

        if (!nombre || !apellido || !correo || !contraseña) {
            return res.status(400).json({
                ok: false,
                mensaje: "Datos incompletos"
            });
        }

        try {
            const usuarioExistente = await repo.buscarPorCorreo(correo);

            if (usuarioExistente) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Usuario ya existe"
                });
            }

            const passwordEncriptada = await bcrypt.hash(contraseña, 10);

            // El endpoint público de registro solo crea alumnos.
            // Los docentes deben pasar por /docentes/solicitud y aprobación del admin.
            const user = await repo.agregar(
                nombre,
                apellido,
                correo,
                passwordEncriptada,
                "alumno"
            );

            const { contrasena: _, ...safeUser } = user;

            res.json({
                ok: true,
                data: safeUser
            });
        } catch (error: any) {
            if (error?.code === "23505") {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Usuario ya existe"
                });
            }

            console.error(error);

            res.status(500).json({
                ok: false,
                mensaje: "No fue posible completar el registro."
            });
        }
    };

    login = async (req: Request, res: Response) => {
        const { correo, contraseña } = req.body;

        const user = await repo.buscarPorCorreo(correo);

        if (!user) {
            return res.status(401).json({
                ok: false,
                mensaje: "Usuario no encontrado"
            });
        }

        const coincide = await bcrypt.compare(
            contraseña,
            user.contrasena
        );

        if (!coincide) {
            return res.status(401).json({
                ok: false,
                mensaje: "Credenciales inválidas"
            });
        }

        const token = generarJWT(
            user.id_usuario,
            user.rol
        );

        const { contrasena: _, ...safeUser } = user;

        res.json({
            ok: true,
            token,
            data: safeUser
        });
    };

    listar = async (_req: Request, res: Response) => {
        const usuarios = (await repo.listar()).map(usuario => {
            const { contrasena, ...safeUser } = usuario;
            return safeUser;
        });

        res.json({
            ok: true,
            data: usuarios
        });
    };

    buscarPorId = async (req: Request, res: Response) => {
        const user = await repo.buscarPorId(
            Number(req.params.id)
        );

        if (!user) {
            return res.status(404).json({
                ok: false,
                mensaje: "No encontrado"
            });
        }

        const { contrasena: _, ...safeUser } = user;

        res.json({
            ok: true,
            data: safeUser
        });
    };

    actualizarPerfil = async (
        req: Request,
        res: Response
    ) => {
        const usuarioToken = (req as any).usuario;
        const {
            nombre,
            apellido,
            correo
        } = req.body;

        const usuario = await repo.actualizar(
            usuarioToken.id_usuario || usuarioToken.id,
            {
                nombre,
                apellido,
                correo
            }
        );

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: "Usuario no encontrado"
            });
        }

        const { contrasena: _, ...safeUser } = usuario;

        res.json({
            ok: true,
            mensaje: "Perfil actualizado",
            data: safeUser
        });
    };

    eliminar = async (req: Request, res: Response) => {
        const ok = await repo.eliminar(
            Number(req.params.id)
        );

        res.json({
            ok,
            mensaje: ok
                ? "Eliminado"
                : "No encontrado"
        });
    };

    cambiarContraseña = async (
        req: Request,
        res: Response
    ) => {
        const usuarioToken = (req as any).usuario;
        const {
            contraseñaActual,
            nuevaContraseña
        } = req.body;

        if (!contraseñaActual || !nuevaContraseña) {
            return res.status(400).json({
                ok: false,
                mensaje: "Datos incompletos"
            });
        }

        const usuario = await repo.buscarPorId(
            usuarioToken.id_usuario || usuarioToken.id
        );

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: "Usuario no encontrado"
            });
        }

        const coincide = await bcrypt.compare(
            contraseñaActual,
            usuario.contrasena
        );

        if (!coincide) {
            return res.status(401).json({
                ok: false,
                mensaje: "La contraseña actual es incorrecta"
            });
        }

        const passwordEncriptada =
            await bcrypt.hash(
                nuevaContraseña,
                10
            );

        await repo.actualizarContraseña(
            usuario.id_usuario,
            passwordEncriptada
        );

        res.json({
            ok: true,
            mensaje: "Contraseña actualizada correctamente"
        });
    };

    forgotPassword = async (
        req: Request,
        res: Response
    ) => {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe enviar un correo"
            });
        }

        const usuario = await repo.buscarPorCorreo(correo);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: "No existe un usuario con ese correo"
            });
        }

        const token = generarTokenRecuperacion(correo);

        try {
            await enviarCorreo(
                correo,
                "Recuperación de contraseña - Miztontli",
                `<p>Usa este código para restablecer tu contraseña:</p><p><b>${token}</b></p>`
            );
        } catch (errorCorreo) {
            console.error("No se pudo enviar el correo de recuperación:", errorCorreo);
            return res.status(500).json({
                ok: false,
                mensaje: "No fue posible enviar el correo de recuperación."
            });
        }

        res.json({
            ok: true,
            mensaje: "Se envió un código de recuperación a tu correo."
        });
    };

    resetPassword = async (
        req: Request,
        res: Response
    ) => {
        const {
            token,
            nuevaContraseña
        } = req.body;

        if (!token || !nuevaContraseña) {
            return res.status(400).json({
                ok: false,
                mensaje: "Datos incompletos"
            });
        }

        const correo = validarToken(token);

        if (!correo) {
            return res.status(400).json({
                ok: false,
                mensaje: "Token inválido"
            });
        }

        const usuario = await repo.buscarPorCorreo(correo);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                mensaje: "Usuario no encontrado"
            });
        }

        const passwordEncriptada =
            await bcrypt.hash(
                nuevaContraseña,
                10
            );

        await repo.actualizarContraseña(
            usuario.id_usuario,
            passwordEncriptada
        );

        eliminarToken(token);

        res.json({
            ok: true,
            mensaje: "Contraseña actualizada correctamente"
        });
    };
}
