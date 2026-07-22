import { Resend } from "resend";

// Antes se mandaba por Gmail/SMTP (nodemailer), pero Render bloquea el
// puerto SMTP saliente en el plan gratis -- toda petición se colgaba
// hasta el timeout. Resend manda por HTTPS (API normal), que sí sale.
const resend = new Resend(process.env.RESEND_API_KEY);

// Sin un dominio propio verificado en Resend, el remitente tiene que ser
// este ("sandbox"), y solo se puede mandar correo a la cuenta con la que
// te registraste en Resend -- no a cualquier alumno/docente todavía. En
// cuanto haya un dominio verificado, cambiar esto por "algo@tudominio.com".
const REMITENTE = "Miztontli <onboarding@resend.dev>";

// "content" (buffer en memoria) en vez de "path": los archivos subidos ya
// no tocan disco local (ver config/uploadAcademico.ts), así que no hay
// una ruta de archivo que adjuntar directamente.
export interface AdjuntoCorreo {
    filename: string;
    content: Buffer;
}

export async function enviarCorreo(
    destinatario: string,
    asunto: string,
    html: string,
    adjuntos?: AdjuntoCorreo[]
) {
    const { error } = await resend.emails.send({
        from: REMITENTE,
        to: destinatario,
        subject: asunto,
        html,
        attachments: adjuntos?.map(adjunto => ({
            filename: adjunto.filename,
            content: adjunto.content
        }))
    });

    if (error) {
        throw new Error(error.message || "Falló el envío del correo con Resend.");
    }
}
