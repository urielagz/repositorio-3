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
            expiresIn: "2h"
        }
    );
};