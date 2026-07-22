import jwt from "jsonwebtoken";

export const generarJWT = (
    id: number,
    rol: string
): string => {

    return jwt.sign(
        {
            id,
            rol
        },
        process.env.JWT_SECRET || "SECRETO_SUPER_SECRETO",
        {
            // No hay "sesión" en el servidor que expirar -- el login es
            // stateless (JWT) y "cerrar sesión" solo borra el token del
            // localStorage del navegador. Para que no saque al usuario a
            // media clase, se hace largo (30 días) en vez de las 2h de antes.
            expiresIn: "30d"
        }
    );
};