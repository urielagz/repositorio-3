import { Request, Response } from "express";
import bcrypt from "bcrypt";

import { repos } from "../repositories";
import { enviarCorreo } from "../config/mailer";
import { subirArchivo } from "../config/cloudinary";
import { generarPasswordTemporal } from "../utils/generarPassword";

const repoEspera = repos.docentesEspera;
const repoUsuarios = repos.usuarios;

export class DocenteController {

    // POST /docentes/solicitud  (multipart/form-data)
    solicitar = async (req: Request, res: Response) => {
        try {
            const { nombre, apellido, correo } = req.body;
            const archivos = req.files as { [fieldname: string]: Express.Multer.File[] };

            if (!nombre || !apellido || !correo) {
                return res.status(400).json({ ok: false, mensaje: "Datos incompletos" });
            }

            if (!archivos?.cedula_profesional?.[0] || !archivos?.diploma?.[0]) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Debes adjuntar tu cédula profesional y tu diploma"
                });
            }

            const yaExisteUsuario = await repoUsuarios.buscarPorCorreo(correo);
            const yaExisteSolicitud = await repoEspera.buscarPorCorreo(correo);

            if (yaExisteUsuario || yaExisteSolicitud) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Ya existe una cuenta o solicitud con ese correo"
                });
            }

            const [urlCedula, urlDiploma] = await Promise.all([
                subirArchivo(archivos.cedula_profesional[0].buffer, archivos.cedula_profesional[0].originalname, "docentes"),
                subirArchivo(archivos.diploma[0].buffer, archivos.diploma[0].originalname, "docentes")
            ]);

            const solicitud = await repoEspera.agregar(
                nombre,
                apellido,
                correo,
                urlCedula,
                urlDiploma
            );

            // El envío de correo es best-effort: no se espera (ver
            // config/mailer.ts), así que un SMTP lento no tumba la respuesta.
            enviarCorreo(
                correo,
                "Solicitud recibida - Miztontli",
                `<p>Hola ${nombre}, recibimos tu solicitud para registrarte como docente.
                 Tu cédula y diploma están en revisión. Te avisaremos por este medio cuando sea aprobada.</p>`
            ).catch(errorCorreo => console.error("No se pudo enviar el correo de confirmación de docente:", errorCorreo));

            // Notificación al admin -- con la cédula y el diploma adjuntos de
            // verdad (antes el correo solo decía "revisa el panel" sin mandar
            // nada, y no había forma práctica de verlos sin conocer de
            // antemano el nombre del archivo en disco).
            enviarCorreo(
                process.env.ADMIN_EMAIL as string,
                "Nueva solicitud de docente pendiente",
                `<p>${nombre} ${apellido} (${correo}) solicitó registrarse como docente.</p>
                 <p>ID de solicitud: ${solicitud.id_solicitud}</p>
                 <p>Se adjuntan su cédula profesional y su diploma.</p>`,
                [
                    { filename: `cedula_${archivos.cedula_profesional[0].originalname}`, content: archivos.cedula_profesional[0].buffer },
                    { filename: `diploma_${archivos.diploma[0].originalname}`, content: archivos.diploma[0].buffer }
                ]
            ).catch(errorCorreo => console.error("No se pudo enviar el correo al admin de la nueva solicitud:", errorCorreo));

            res.json({
                ok: true,
                mensaje: "Solicitud enviada. Recibirás un correo cuando sea validada.",
                data: { id_solicitud: solicitud.id_solicitud }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "No fue posible registrar la solicitud." });
        }
    };

    // GET /docentes/pendientes  (admin)
    listarPendientes = async (_req: Request, res: Response) => {
        try {
            const pendientes = await repoEspera.listarPendientes();
            res.json({ ok: true, data: pendientes });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error al obtener las solicitudes pendientes." });
        }
    };

    // POST /docentes/:id/aprobar  (admin)
    aprobar = async (req: Request, res: Response) => {
        try {
            const id_solicitud = Number(req.params.id);
            const solicitud = await repoEspera.buscarPorId(id_solicitud);

            if (!solicitud) {
                return res.status(404).json({ ok: false, mensaje: "Solicitud no encontrada" });
            }

            if (solicitud.estado !== "pendiente") {
                return res.status(400).json({ ok: false, mensaje: "Esta solicitud ya fue revisada" });
            }

            const passwordTemporal = generarPasswordTemporal();
            const passwordHasheada = await bcrypt.hash(passwordTemporal, 10);

            await repoUsuarios.agregar(
                solicitud.nombre,
                solicitud.apellido,
                solicitud.correo,
                passwordHasheada,
                "docente"
            );

            await repoEspera.actualizarEstado(id_solicitud, "aprobado");

            try {
                await enviarCorreo(
                    solicitud.correo,
                    "¡Tu cuenta de docente fue aprobada! - Miztontli",
                    `<p>Hola ${solicitud.nombre}, tu documentación fue validada.</p>
                     <p>Ya puedes iniciar sesión con tu correo (${solicitud.correo}) y esta contraseña temporal:</p>
                     <p><strong>${passwordTemporal}</strong></p>
                     <p>Te recomendamos cambiarla en cuanto ingreses.</p>`
                );
            } catch (errorCorreo) {
                console.error("No se pudo enviar el correo de aprobación de docente:", errorCorreo);
            }

            res.json({ ok: true, mensaje: "Docente aprobado y notificado por correo" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "No fue posible aprobar la solicitud." });
        }
    };

    // POST /docentes/:id/rechazar  (admin)
    rechazar = async (req: Request, res: Response) => {
        try {
            const id_solicitud = Number(req.params.id);
            const solicitud = await repoEspera.buscarPorId(id_solicitud);

            if (!solicitud) {
                return res.status(404).json({ ok: false, mensaje: "Solicitud no encontrada" });
            }

            await repoEspera.actualizarEstado(id_solicitud, "rechazado");

            try {
                await enviarCorreo(
                    solicitud.correo,
                    "Solicitud de docente no aprobada - Miztontli",
                    `<p>Hola ${solicitud.nombre}, tu solicitud de registro como docente no fue aprobada.
                     Si crees que es un error, contacta al administrador.</p>`
                );
            } catch (errorCorreo) {
                console.error("No se pudo enviar el correo de rechazo de docente:", errorCorreo);
            }

            res.json({ ok: true, mensaje: "Solicitud rechazada y docente notificado" });

        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "No fue posible rechazar la solicitud." });
        }
    };
}
