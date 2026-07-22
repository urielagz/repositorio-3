const tokens = new Map<string, string>();

export function generarTokenRecuperacion(correo: string): string {

    const token = Math.random().toString(36).substring(2, 12);

    tokens.set(token, correo);

    return token;
}

export function validarToken(token: string): string | undefined {

    return tokens.get(token);

}

export function eliminarToken(token: string): void {

    tokens.delete(token);

}