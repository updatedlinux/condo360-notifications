const axios = require('axios');

async function testWhatsApp() {
    try {
        console.log('🧪 Probando envío a WhatsApp...');
        
        const response = await axios.post('http://localhost:3002/test-whatsapp', {
            titulo: 'Prueba de WhatsApp',
            descripcion: 'Este es un mensaje de prueba desde el sistema de notificaciones'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        console.log('✅ Respuesta del servidor:', response.data);
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        
        if (error.response) {
            console.error('📱 Respuesta del servidor:', error.response.data);
        } else if (error.request) {
            console.error('📱 Sin respuesta del servidor');
        }
    }
}

// Ejecutar prueba
testWhatsApp();
