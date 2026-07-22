import { Request, Response } from "express";
import { RepositorioTemas } from "../repositories/RepositorioTemas";
import RepositorioMaterias from "../repositories/RepositorioMateria";
import { notificarMateria } from "../utils/notificaciones";
import { subirArchivo } from "../config/cloudinary";

const repo = new RepositorioTemas();

export class TemaController {

    listar = async (_req: Request, res: Response) => {
        try {
            const temas = await repo.listar();
            res.json({ ok: true, total: temas.length, data: temas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error al obtener los temas." });
        }
    };

    obtenerPorId = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const tema = await repo.buscarPorId(id);

            if (!tema) {
                return res.status(404).json({ ok: false, mensaje: "Tema no encontrado." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, tema.id_materia);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en la materia de este tema." });
                }
            }

            res.json({ ok: true, data: tema });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    };

    agregar = async (req: Request, res: Response) => {
        try {
            const usuario = (req as any).usuario;
            const { nombre, descripcion, id_materia } = req.body;

            if (!nombre || !descripcion || !id_materia) {
                return res.status(400).json({ ok: false, mensaje: "Datos incompletos" });
            }

            if (usuario.rol === "docente") {
                const propietario = await RepositorioMaterias.esDelDocente(Number(id_materia), usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes agregar temas a una materia que no es tuya." });
                }
            }

            // El "orden" ya no lo manda el cliente: se asigna solo, como
            // un contador (1, 2, 3...) dentro de la materia.
            const tema = await repo.agregar(nombre, descripcion, Number(id_materia));

            await notificarMateria(
                Number(id_materia),
                "tema",
                `Nuevo tema: ${nombre}`,
                `Tu docente agregó el tema "${nombre}" a la materia.`
            );

            res.status(201).json({ ok: true, mensaje: "Tema creado correctamente.", data: tema });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "No fue posible crear el tema." });
        }
    };

    actualizar = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            const temaExistente = await repo.buscarPorId(id);

            if (!temaExistente) {
                return res.status(404).json({ ok: false, mensaje: "Tema no encontrado." });
            }

            if (usuario.rol === "docente") {
                const propietario = await repo.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes modificar este tema." });
                }
            }

            const { nombre, descripcion, orden } = req.body;

            if (!nombre || !descripcion) {
                return res.status(400).json({ ok: false, mensaje: "Datos incompletos" });
            }

            // "orden" es opcional aquí: solo se manda cuando se quiere
            // reordenar el tema dentro de su materia (drag & drop). Si no
            // se manda, conserva su posición actual.
            const tema = await repo.actualizar(id, nombre, descripcion, orden !== undefined ? Number(orden) : undefined);

            await notificarMateria(
                temaExistente.id_materia,
                "tema",
                `Tema actualizado: ${nombre}`,
                `Tu docente actualizó el tema "${nombre}".`
            );

            res.json({ ok: true, mensaje: "Tema actualizado correctamente.", data: tema });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error al actualizar el tema." });
        }
    };

    // =====================================================
    // PUT /temas/:id/contenido  (docente/admin)
    // Edita el cuerpo del capítulo: introducción, contenido e imágenes.
    // =====================================================
    actualizarContenido = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const usuario = (req as any).usuario;

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "ID inválido."
            });
        }

        const temaExistente = await repo.buscarPorId(id);

        if (!temaExistente) {
            return res.status(404).json({
                ok: false,
                mensaje: "Tema no encontrado."
            });
        }

        if (usuario.rol === "docente") {
            const propietario = await repo.esDelDocente(id, usuario.id);

            if (!propietario) {
                return res.status(403).json({
                    ok: false,
                    mensaje: "No puedes modificar este tema."
                });
            }
        }

        // Textos enviados mediante form-data
        const { introduccion, contenido } = req.body;

        // Archivos procesados por Multer
        const archivos = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        // Si se sube una imagen nueva, se guarda su URL de Cloudinary.
        // Si no, se conserva la imagen anterior.
        const imagen1 = archivos?.imagen1?.[0]
            ? await subirArchivo(archivos.imagen1[0].buffer, archivos.imagen1[0].originalname, "temas")
            : temaExistente.imagen1;

        const imagen2 = archivos?.imagen2?.[0]
            ? await subirArchivo(archivos.imagen2[0].buffer, archivos.imagen2[0].originalname, "temas")
            : temaExistente.imagen2;

        const tema = await repo.actualizarContenido(id, {
            introduccion,
            contenido,
            imagen1,
            imagen2
        });

        await notificarMateria(
            temaExistente.id_materia,
            "tema",
            `Contenido actualizado: ${temaExistente.nombre}`,
            `Tu docente actualizó el contenido del tema "${temaExistente.nombre}".`
        );

        res.json({
            ok: true,
            mensaje: "Contenido del tema actualizado correctamente.",
            data: tema
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar el contenido del tema."
        });
    }
};

    buscarPorMateria = async (req: Request, res: Response) => {
        try {
            const idMateria = Number(req.params.idMateria);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(idMateria)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "alumno") {
                const inscrito = await RepositorioMaterias.estaInscrito(usuario.id, idMateria);

                if (!inscrito) {
                    return res.status(403).json({ ok: false, mensaje: "No estás inscrito en esta materia." });
                }
            }

            const data = await repo.buscarPorMateria(idMateria);
            res.json({ ok: true, total: data.length, data });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    };

    eliminar = async (req: Request, res: Response) => {
        try {
            const id = Number(req.params.id);
            const usuario = (req as any).usuario;

            if (!Number.isInteger(id)) {
                return res.status(400).json({ ok: false, mensaje: "ID inválido." });
            }

            if (usuario.rol === "docente") {
                const propietario = await repo.esDelDocente(id, usuario.id);

                if (!propietario) {
                    return res.status(403).json({ ok: false, mensaje: "No puedes eliminar este tema." });
                }
            }

            const ok = await repo.eliminar(id);

            if (!ok) {
                return res.status(404).json({ ok: false, mensaje: "Tema no encontrado." });
            }

            res.json({ ok: true, mensaje: "Tema eliminado." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ ok: false, mensaje: "Error del servidor." });
        }
    };
}
