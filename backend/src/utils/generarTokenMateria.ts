import crypto from "crypto";

// Token de inscripción de una materia: lo comparten todos los alumnos
// que se inscriban (no es de un solo uso ni expira, a diferencia de una
// contraseña temporal de docente), y su unicidad se valida contra la
// tabla materia en RepositorioMateria, no aquí. Se genera en mayúsculas
// para que sea más fácil de dictar/copiar en clase.
export function generarTokenMateria(longitud: number = 8): string {
    return crypto
        .randomBytes(longitud)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, longitud)
        .toUpperCase();
}
