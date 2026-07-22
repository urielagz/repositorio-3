document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    const userRoleInput = document.getElementById('userRole');

    const API_URL = 'https://miztontli-backend.onrender.com/api/publicaciones';

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const mensaje = messageInput.value.trim();
        // Toma automáticamente el valor 'user' sin interacción del usuario
        const rol = userRoleInput ? userRoleInput.value : 'user';

        if (!mensaje) return;

        // Agregar mensaje visualmente
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'sent');
        messageElement.textContent = mensaje;
        chatMessages.appendChild(messageElement);

        messageInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Enviar petición al backend
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mensaje, rol })
            });

            if (!response.ok) {
                console.error('Error al guardar la publicación en el servidor');
            }
        } catch (error) {
            console.error('Error de red:', error);
        }
    });
});