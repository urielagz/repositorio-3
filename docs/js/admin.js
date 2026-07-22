const API_URL = "https://miztontli-backend.onrender.com";

let usuarioActual = null;

// El backend responde HTML (404 de Express) cuando una ruta no existe;
// sin esto, .json() falla con "Unexpected token '<'" en vez de decir qué ruta falta.
async function solicitarJSON(url, opciones) {
    const respuesta = await fetch(url, opciones);
    const contentType = respuesta.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(`La ruta ${url.replace(API_URL, "")} no devolvió JSON (status ${respuesta.status}). Verifica que exista en el backend.`);
    }
    const json = await respuesta.json();
    if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
    return json;
}

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user || user.rol.toLowerCase() !== "admin") {
        alert("Acceso denegado. Por favor inicia sesión con una cuenta de administrador.");
        window.location.href = "login.html";
        return;
    }

    usuarioActual = user;
    document.getElementById("userDisplay").innerText = `${user.nombre} ${user.apellido}`;

    cargarSolicitudesDocentes();
});

// ===================== SOLICITUDES DE DOCENTES =====================
async function cargarSolicitudesDocentes() {
    const contenedor = document.getElementById("listaSolicitudesDocentes");
    contenedor.innerHTML = "<p>Cargando...</p>";
    try {
        const token = localStorage.getItem("token");
        const json = await solicitarJSON(`${API_URL}/docentes/pendientes`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });
        renderizarSolicitudesDocentes(json.data || []);
    } catch (error) {
        console.error("Error al obtener solicitudes de docentes:", error);
        contenedor.innerHTML = `<p>${error.message}</p>`;
    }
}

function renderizarSolicitudesDocentes(solicitudes) {
    const contenedor = document.getElementById("listaSolicitudesDocentes");
    if (!solicitudes || solicitudes.length === 0) {
        contenedor.innerHTML = "<p>No hay solicitudes de docentes pendientes.</p>";
        return;
    }
    contenedor.innerHTML = "";
    solicitudes.forEach(solicitud => contenedor.appendChild(crearSolicitudItem(solicitud)));
}

function crearSolicitudItem(solicitud) {
    const item = document.createElement("div");
    item.className = "perfil-card";
    item.style.cssText = "margin-bottom: 1rem;";
    item.innerHTML = `
        <strong>${solicitud.nombre} ${solicitud.apellido}</strong>
        <p>${solicitud.correo}</p>
        <p>Solicitado: ${new Date(solicitud.fecha_solicitud).toLocaleString("es-MX")}</p>
        <div style="display:flex; gap:0.5rem; margin: 0.75rem 0; flex-wrap:wrap;">
            <button type="button" class="btn-secondary btn-ver-cedula">Ver cédula profesional</button>
            <button type="button" class="btn-secondary btn-ver-diploma">Ver diploma</button>
        </div>
        <div style="display:flex; gap:0.5rem;">
            <button type="button" class="btn-primary btn-aprobar">Aprobar</button>
            <button type="button" class="btn-secondary btn-rechazar" style="border-color: var(--secondary-red, #C93638); color: var(--secondary-red, #C93638);">Rechazar</button>
        </div>
    `;

    item.querySelector(".btn-ver-cedula").addEventListener("click", () => verArchivoDocente(solicitud.cedula_profesional));
    item.querySelector(".btn-ver-diploma").addEventListener("click", () => verArchivoDocente(solicitud.diploma));
    item.querySelector(".btn-aprobar").addEventListener("click", (e) => decidirSolicitud(solicitud.id_solicitud, "aprobar", e.target));
    item.querySelector(".btn-rechazar").addEventListener("click", (e) => decidirSolicitud(solicitud.id_solicitud, "rechazar", e.target));

    return item;
}

// El archivo está protegido (solo admin), así que no se puede abrir con un
// <a href> normal -- hay que pedirlo con el token y abrirlo desde un blob.
async function verArchivoDocente(nombreArchivo) {
    if (!nombreArchivo) {
        alert("Este archivo no está disponible.");
        return;
    }
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/docentes/archivo/${nombreArchivo}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!respuesta.ok) throw new Error("No se pudo abrir el archivo.");
        const blob = await respuesta.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
    } catch (error) {
        console.error("Error al abrir archivo de docente:", error);
        alert(error.message);
    }
}

async function decidirSolicitud(idSolicitud, accion, boton) {
    const confirmado = confirm(accion === "aprobar" ? "¿Aprobar esta solicitud de docente?" : "¿Rechazar esta solicitud de docente?");
    if (!confirmado) return;

    boton.disabled = true;
    try {
        const token = localStorage.getItem("token");
        const respuesta = await fetch(`${API_URL}/docentes/${idSolicitud}/${accion}`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const json = await respuesta.json();
        if (!respuesta.ok || !json.ok) throw new Error(json.mensaje || `Error del servidor (${respuesta.status})`);
        cargarSolicitudesDocentes();
    } catch (error) {
        console.error(`Error al ${accion} solicitud:`, error);
        alert(error.message);
        boton.disabled = false;
    }
}
