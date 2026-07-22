import RepositorioMaterias from "../repositories/RepositorioMateria";
import RepositorioNotificaciones, { TipoNotificacion } from "../repositories/RepositorioNotificaciones";
import { enviarCorreo } from "../config/mailer";

// Avisa a todos los alumnos inscritos en una materia de un cambio
// (nuevo/editado tema, actividad o examen). Best-effort: si falla, se
// registra en consola pero NUNCA tumba la petición que lo llamó.
export async function notificarMateria(
    idMateria: number,
    tipo: TipoNotificacion,
    titulo: string,
    mensaje: string
): Promise<void> {

    try {

        const alumnos = await RepositorioMaterias.obtenerAlumnosInscritos(idMateria);
        const ids = alumnos.map(alumno => alumno.id_usuario);

        await RepositorioNotificaciones.crearParaUsuarios(ids, { titulo, mensaje, tipo });

    } catch (error) {

        console.error("No se pudieron generar las notificaciones:", error);

    }

}

// Manda un correo a todos los alumnos inscritos en una materia. Best-effort
// igual que notificarMateria: nunca tumba la petición que lo llamó. No
// todos los eventos deben mandar correo (ver call sites) -- esto es solo
// el mecanismo de envío masivo, la decisión de cuándo usarlo vive en cada
// controlador.
export async function correoMateria(
    idMateria: number,
    asunto: string,
    construirHtml: (alumno: { nombre: string; correo: string }) => string
): Promise<void> {

    try {

        const alumnos = await RepositorioMaterias.obtenerAlumnosInscritos(idMateria);

        await Promise.all(alumnos.map(alumno => enviarCorreo(
            alumno.correo,
            asunto,
            construirHtml(alumno)
        )));

    } catch (error) {

        console.error("No se pudieron enviar los correos:", error);

    }

}
