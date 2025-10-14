const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.apiUrl = 'https://wschat.bonaventurecclub.com/api/send-message';
        this.secretKey = 'condo360_whatsapp_secret_2025';
    }

    /**
     * Envía un mensaje a WhatsApp cuando una notificación se activa
     * @param {Object} notification - Objeto de notificación con titulo y descripcion
     * @returns {Promise<Object>} - Respuesta del API de WhatsApp
     */
    async sendNotificationMessage(notification) {
        try {
            const message = `${notification.titulo} - ${notification.descripcion}`;
            
            console.log('📱 Enviando mensaje a WhatsApp:', message);
            
            const response = await axios.post(this.apiUrl, {
                message: message,
                secretKey: this.secretKey
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000 // 10 segundos timeout
            });

            console.log('✅ Mensaje enviado exitosamente a WhatsApp:', response.data);
            return {
                success: true,
                data: response.data,
                message: 'Mensaje enviado a WhatsApp exitosamente',
                sent: true
            };

        } catch (error) {
            console.error('❌ Error al enviar mensaje a WhatsApp:', error.message);
            
            if (error.response) {
                console.error('📱 Respuesta del servidor WhatsApp:', error.response.data);
                return {
                    success: false,
                    error: error.response.data,
                    message: 'Error del servidor WhatsApp',
                    sent: false
                };
            } else if (error.request) {
                console.error('📱 Sin respuesta del servidor WhatsApp');
                return {
                    success: false,
                    error: 'Sin respuesta del servidor',
                    message: 'No se pudo conectar con el servidor WhatsApp',
                    sent: false
                };
            } else {
                console.error('📱 Error de configuración:', error.message);
                return {
                    success: false,
                    error: error.message,
                    message: 'Error de configuración al enviar mensaje',
                    sent: false
                };
            }
        }
    }

    /**
     * Verifica si una notificación debe enviarse a WhatsApp
     * @param {Object} notification - Objeto de notificación
     * @returns {boolean} - true si debe enviarse
     */
    shouldSendNotification(notification) {
        // Solo enviar si la notificación está activa (estado = 1 y estado_actual = 1)
        return notification.estado === 1 && notification.estado_actual === 1;
    }

    /**
     * Procesa una notificación y la envía a WhatsApp si es necesario
     * @param {Object} notification - Objeto de notificación
     * @returns {Promise<Object>} - Resultado del procesamiento
     */
    async processNotification(notification) {
        if (!this.shouldSendNotification(notification)) {
            console.log('📱 Notificación no requiere envío a WhatsApp:', {
                id: notification.id,
                estado: notification.estado,
                estado_actual: notification.estado_actual
            });
            return {
                success: true,
                message: 'Notificación no requiere envío a WhatsApp',
                sent: false
            };
        }

        return await this.sendNotificationMessage(notification);
    }
}

module.exports = WhatsAppService;
