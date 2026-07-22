import crypto from "crypto";

// Contraseña temporal de un docente recién aprobado: se hashea con
// bcrypt antes de guardarse y se espera que el docente la cambie en su
// primer login. Para el token de inscripción de una materia (que no se
// hashea, no expira y lo comparten varios alumnos) usa
// utils/generarTokenMateria.ts -- son reglas distintas, no compartas
// esta función entre los dos flujos.
export function generarPasswordTemporal(longitud: number = 10): string {
    return crypto
        .randomBytes(longitud)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, longitud);
}