import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
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
