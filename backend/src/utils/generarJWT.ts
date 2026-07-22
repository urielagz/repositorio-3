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
        "SECRETO_SUPER_SECRETO",
        {
            expiresIn: "2h"
        }
    );
};