// ==== CONFIGURACIÓN DEL BACKEND ====
const API_URL = "https://PENDIENTE-URL-RENDER.onrender.com"; 
let esModoLogin = true;

// ==== MANEJO DE SESIÓN ====
function guardarSesion(token, usuario) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(usuario)); // Mantenemos 'user' como lo tenías estructurado
}

// Intercambia la interfaz visual entre Login y Registro
function invertirModo() {
    esModoLogin = !esModoLogin;
    
    const titulo = document.getElementById("auth-title");
    const subtitulo = document.getElementById("auth-subtitle");
    const camposRegistro = document.getElementById("register-fields");
    const btnEnviar = document.getElementById("auth-submit-btn");
    const btnCambio = document.getElementById("toggle-mode-btn");
    
    ocultarAlertas();

    if (esModoLogin) {
        titulo.innerText = "Iniciar Sesión";
        subtitulo.innerText = "Ingresa tus credenciales para acceder";
        camposRegistro.classList.add("hidden");
        btnEnviar.innerText = "Ingresar";
        btnCambio.innerText = "¿No tienes cuenta? Regístrate aquí";
        
        document.getElementById("auth-nombre").required = false;
        document.getElementById("auth-apellido").required = false;
    } else {
        titulo.innerText = "Crear Cuenta";
        subtitulo.innerText = "Regístrate para empezar a usar la plataforma";
        camposRegistro.classList.remove("hidden");
        btnEnviar.innerText = "Registrarse";
        btnCambio.innerText = "¿Ya tienes cuenta? Inicia sesión";
        
        document.getElementById("auth-nombre").required = true;
        document.getElementById("auth-apellido").required = true;
    }
}

// Envío del formulario al Backend (Maneja el submit de tu formulario)
async function enviarFormulario(event) {
    event.preventDefault();
    ocultarAlertas();

    const correo = document.getElementById("auth-correo").value;
    const contrasena = document.getElementById("auth-contrasena").value;

    // Evita doble envío (doble clic / Enter repetido) mientras la petición
    // está en curso -- el backend puede correr en condición de carrera si
    // dos registros con el mismo correo llegan casi al mismo tiempo.
    const boton = document.getElementById("auth-submit-btn");
    boton.disabled = true;

    try {
        if (esModoLogin) {
            // 1. PETICIÓN LOGIN
            const respuesta = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ correo: correo, contraseña: contrasena })
            });

            const data = await respuesta.json();

            if (!respuesta.ok || !data.ok) {
                throw new Error(data.mensaje || "Credenciales incorrectas.");
            }

            // Guardamos el token y los datos usando la función unificada
            guardarSesion(data.token, data.data);

            mostrarAlerta("success", `¡Ingreso exitoso! Bienvenido ${data.data.nombre}`);
            const rolUsuario = data.data.rol.toLowerCase(); 

            setTimeout(() => {
                if (rolUsuario === "alumno") {
                    window.location.href = "html/panel-alumno.html";
                } else if (rolUsuario === "docente" || rolUsuario === "admin") {
                    window.location.href = "html/panel.html"; // Panel con navbar (Materias/Comunidad/Perfil), en /html
                } else {
                    window.location.href = "html/dashboard-general.html";
                }
            }, 1500);

        } else {
            // 2. PETICIÓN REGISTRO
            const nombre = document.getElementById("auth-nombre").value;
            const apellido = document.getElementById("auth-apellido").value;

            const respuesta = await fetch(`${API_URL}/usuarios`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: nombre,
                    apellido: apellido,
                    correo: correo,
                    contraseña: contrasena
                })
            });

            let data = null;
            try { data = await respuesta.json(); } catch { /* respuesta no era JSON (ej. crash sin manejar en el backend) */ }

            if (!respuesta.ok || !data || !data.ok) {
                throw new Error((data && data.mensaje) || "No se pudo registrar el usuario.");
            }

            mostrarAlerta("success", "¡Registro completado! Ya puedes iniciar sesión.");
            document.getElementById("auth-form").reset();
            setTimeout(() => invertirModo(), 1800);
        }
    } catch (err) {
        console.error(err);
        mostrarAlerta("error", err.message || "Error de comunicación con el servidor.");
    } finally {
        boton.disabled = false;
    }
}

// ==== MANEJO DE ALERTAS VISUALES ====
function mostrarAlertaEn(prefijo, tipo, mensaje) {
    const el = document.getElementById(`${prefijo}-${tipo}`);
    if (el) {
        el.innerText = mensaje;
        el.classList.remove("hidden");
    }
}
function mostrarAlerta(tipo, mensaje) { mostrarAlertaEn("auth", tipo, mensaje); }

function ocultarAlertasEn(prefijo) {
    const errEl = document.getElementById(`${prefijo}-error`);
    const succEl = document.getElementById(`${prefijo}-success`);
    if (errEl) errEl.classList.add("hidden");
    if (succEl) succEl.classList.add("hidden");
}
function ocultarAlertas() { ocultarAlertasEn("auth"); }

// Vinculación automática si tu formulario tiene el ID clásico (Opcional, por si no usas 'onsubmit' en el HTML)
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("auth-form");
    if (formulario) {
        formulario.addEventListener("submit", enviarFormulario);
    }

    inicializarModalesAuth();
});

// ==== MODALES: RECUPERAR CONTRASEÑA / SOLICITUD DE DOCENTE ====
function abrirModal(id) { document.getElementById(id).classList.add("open"); }
function cerrarModal(modal) { modal.classList.remove("open"); }

function inicializarModalesAuth() {
    const btnOlvide = document.getElementById("olvide-btn");
    const btnDocente = document.getElementById("docente-btn");
    if (btnOlvide) btnOlvide.addEventListener("click", () => abrirModal("modalOlvide"));
    if (btnDocente) btnDocente.addEventListener("click", () => abrirModal("modalDocente"));

    document.querySelectorAll(".modal .close-modal").forEach(btn => {
        btn.addEventListener("click", (e) => cerrarModal(e.target.closest(".modal")));
    });
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(modal); });
    });

    const formOlvidePaso1 = document.getElementById("form-olvide-paso1");
    const formOlvidePaso2 = document.getElementById("form-olvide-paso2");
    const formDocente = document.getElementById("form-docente");
    if (formOlvidePaso1) formOlvidePaso1.addEventListener("submit", enviarCodigoRecuperacion);
    if (formOlvidePaso2) formOlvidePaso2.addEventListener("submit", restablecerContrasena);
    if (formDocente) formDocente.addEventListener("submit", enviarSolicitudDocente);
}

// Paso 1: pide el correo y el backend manda el código de recuperación.
async function enviarCodigoRecuperacion(event) {
    event.preventDefault();
    ocultarAlertasEn("olvide");
    const correo = document.getElementById("olvide-correo").value;

    try {
        const respuesta = await fetch(`${API_URL}/usuarios/forgot-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ correo })
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) throw new Error(data.mensaje || "No se pudo enviar el código.");

        mostrarAlertaEn("olvide", "success", data.mensaje || "Revisa tu correo, te enviamos un código.");
        document.getElementById("form-olvide-paso1").classList.add("hidden");
        document.getElementById("form-olvide-paso2").classList.remove("hidden");
    } catch (err) {
        mostrarAlertaEn("olvide", "error", err.message);
    }
}

// Paso 2: el código + la nueva contraseña.
async function restablecerContrasena(event) {
    event.preventDefault();
    ocultarAlertasEn("olvide");
    const token = document.getElementById("olvide-token").value;
    const nuevaContraseña = document.getElementById("olvide-nueva").value;

    try {
        const respuesta = await fetch(`${API_URL}/usuarios/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, nuevaContraseña })
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) throw new Error(data.mensaje || "No se pudo restablecer la contraseña.");

        mostrarAlertaEn("olvide", "success", "Contraseña actualizada. Ya puedes iniciar sesión.");
        setTimeout(() => {
            cerrarModal(document.getElementById("modalOlvide"));
            document.getElementById("form-olvide-paso1").reset();
            document.getElementById("form-olvide-paso2").reset();
            document.getElementById("form-olvide-paso1").classList.remove("hidden");
            document.getElementById("form-olvide-paso2").classList.add("hidden");
            ocultarAlertasEn("olvide");
        }, 1800);
    } catch (err) {
        mostrarAlertaEn("olvide", "error", err.message);
    }
}

// Solicitud de cuenta docente: multipart/form-data porque exige cédula + diploma.
async function enviarSolicitudDocente(event) {
    event.preventDefault();
    ocultarAlertasEn("docente");

    const cedula = document.getElementById("docente-cedula").files[0];
    const diploma = document.getElementById("docente-diploma").files[0];

    const formData = new FormData();
    formData.append("nombre", document.getElementById("docente-nombre").value);
    formData.append("apellido", document.getElementById("docente-apellido").value);
    formData.append("correo", document.getElementById("docente-correo").value);
    if (cedula) formData.append("cedula_profesional", cedula);
    if (diploma) formData.append("diploma", diploma);

    try {
        const respuesta = await fetch(`${API_URL}/docentes/solicitud`, {
            method: "POST",
            body: formData
        });
        const data = await respuesta.json();
        if (!respuesta.ok || !data.ok) throw new Error(data.mensaje || "No se pudo enviar la solicitud.");

        mostrarAlertaEn("docente", "success", data.mensaje || "Solicitud enviada correctamente.");
        document.getElementById("form-docente").reset();
        setTimeout(() => {
            cerrarModal(document.getElementById("modalDocente"));
            ocultarAlertasEn("docente");
        }, 2200);
    } catch (err) {
        mostrarAlertaEn("docente", "error", err.message);
    }
}