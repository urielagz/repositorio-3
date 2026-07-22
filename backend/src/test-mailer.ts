import "dotenv/config";
import { enviarCorreo } from "./config/mailer";

async function probar() {
    try {
        await enviarCorreo(
            process.env.EMAIL_USER as string, // se lo manda a sí mismo para probar
            "Prueba de Nodemailer - Miztontli",
            "<p>Si recibiste esto, la contraseña de aplicación de Gmail funciona correctamente.</p>"
        );
        console.log("✅ Correo enviado correctamente. Revisa tu bandeja de entrada.");
    } catch (error) {
        console.error("❌ Error al enviar correo:", error);
    }
}

probar();