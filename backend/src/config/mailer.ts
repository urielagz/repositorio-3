import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // Sin esto, un SMTP que no responde (ej. el puerto bloqueado en el
    // hosting) cuelga la conexión indefinidamente -- y como enviarCorreo()
    // se usa "best-effort" dentro de flujos como crear materia, eso
    // colgaba la petición HTTP completa en vez de solo fallar el correo.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
});

export interface AdjuntoCorreo {
    filename: string;
    path: string;
}

export async function enviarCorreo(
    destinatario: string,
    asunto: string,
    html: string,
    adjuntos?: AdjuntoCorreo[]
) {
    await transporter.sendMail({
        from: `"Miztontli" <${process.env.EMAIL_USER}>`,
        to: destinatario,
        subject: asunto,
        html,
        attachments: adjuntos,
    });
}
