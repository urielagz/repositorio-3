import "dotenv/config";
import { enviarCorreo } from "./config/mailer";

async function probar() {
    try {
        // Sin dominio verificado en Resend, solo se puede mandar a la
        // cuenta con la que te registraste ahí -- por eso ADMIN_EMAIL y
        // no un correo cualquiera.
        await enviarCorreo(
            process.env.ADMIN_EMAIL as string,
            "Prueba de Resend - Miztontli",
            "<p>Si recibiste esto, la integración con Resend funciona correctamente.</p>"
        );
        console.log("✅ Correo enviado correctamente. Revisa tu bandeja de entrada.");
    } catch (error) {
        console.error("❌ Error al enviar correo:", error);
    }
}

probar();