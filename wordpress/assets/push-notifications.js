// Servicio de Notificaciones Push del Navegador
class PushNotificationService {
    constructor() {
        this.isSupported = 'Notification' in window;
        this.permission = this.isSupported ? Notification.permission : 'denied';
        this.serviceWorkerRegistration = null;
        
        console.log('🔔 PushNotificationService inicializado');
        console.log('🔔 Soporte de notificaciones:', this.isSupported);
        console.log('🔔 Permiso actual:', this.permission);
    }

    // Solicitar permisos de notificaciones
    async requestPermission() {
        if (!this.isSupported) {
            console.warn('🔔 Las notificaciones no son compatibles con este navegador');
            return false;
        }

        if (this.permission === 'granted') {
            console.log('🔔 Permisos ya concedidos');
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            console.log('🔔 Resultado de solicitud de permisos:', permission);
            
            if (permission === 'granted') {
                console.log('🔔 Permisos concedidos exitosamente');
                this.showPermissionGrantedMessage();
                return true;
            } else {
                console.log('🔔 Permisos denegados');
                this.showPermissionDeniedMessage();
                return false;
            }
        } catch (error) {
            console.error('🔔 Error al solicitar permisos:', error);
            return false;
        }
    }

    // Mostrar mensaje de permisos concedidos
    showPermissionGrantedMessage() {
        this.showToast('✅ Notificaciones activadas. Recibirás alertas de nuevas notificaciones.', 'success');
    }

    // Mostrar mensaje de permisos denegados
    showPermissionDeniedMessage() {
        this.showToast('❌ Permisos de notificaciones denegados. Puedes activarlos manualmente en la configuración del navegador.', 'warning');
    }

    // Enviar notificación push
    async sendNotification(notification) {
        if (!this.isSupported || this.permission !== 'granted') {
            console.warn('🔔 No se pueden enviar notificaciones: permisos no concedidos');
            return false;
        }

        try {
            const notificationOptions = {
                body: notification.descripcion,
                icon: '/wp-content/plugins/condo360-notifications/assets/icon-192x192.png',
                badge: '/wp-content/plugins/condo360-notifications/assets/badge-72x72.png',
                tag: `condo360-${notification.id}`,
                data: {
                    id: notification.id,
                    url: window.location.href
                },
                actions: [
                    {
                        action: 'view',
                        title: 'Ver',
                        icon: '/wp-content/plugins/condo360-notifications/assets/view-icon.png'
                    },
                    {
                        action: 'close',
                        title: 'Cerrar',
                        icon: '/wp-content/plugins/condo360-notifications/assets/close-icon.png'
                    }
                ],
                requireInteraction: true,
                silent: false
            };

            const browserNotification = new Notification(notification.titulo, notificationOptions);
            
            console.log('🔔 Notificación enviada:', notification.titulo);
            
            // Manejar clics en la notificación
            browserNotification.onclick = (event) => {
                event.preventDefault();
                console.log('🔔 Notificación clickeada:', notification.id);
                
                // Enfocar la ventana
                window.focus();
                
                // Cerrar la notificación
                browserNotification.close();
                
                // Opcional: scroll a la sección de notificaciones
                const notificationsSection = document.querySelector('.condo360-notifications-container');
                if (notificationsSection) {
                    notificationsSection.scrollIntoView({ behavior: 'smooth' });
                }
            };

            // Auto-cerrar después de 10 segundos
            setTimeout(() => {
                browserNotification.close();
            }, 10000);

            return true;
        } catch (error) {
            console.error('🔔 Error al enviar notificación:', error);
            return false;
        }
    }

    // Verificar si una notificación debe enviarse
    shouldSendNotification(notification) {
        const now = new Date();
        const startDate = new Date(notification.fecha_notificacion);
        const endDate = new Date(notification.fecha_fin);
        
        // Solo enviar si está activa y dentro del rango de fechas
        return notification.estado === 1 && 
               notification.estado_actual === 1 && 
               now >= startDate && 
               now <= endDate;
    }

    // Mostrar toast de mensaje
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10001;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(toast);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
    }

    // Obtener estado de permisos
    getPermissionStatus() {
        return {
            supported: this.isSupported,
            permission: this.permission,
            canSend: this.isSupported && this.permission === 'granted'
        };
    }

    // Verificar y solicitar permisos automáticamente
    async checkAndRequestPermission() {
        if (!this.isSupported) {
            return false;
        }

        if (this.permission === 'default') {
            return await this.requestPermission();
        }

        return this.permission === 'granted';
    }
}

// Exportar para uso global
window.PushNotificationService = PushNotificationService;
