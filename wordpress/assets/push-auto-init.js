// Inicialización automática de notificaciones push para usuarios finales
(function() {
    'use strict';
    
    // Esperar a que el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔔 Inicializando notificaciones push automáticas...');
        
        // Verificar si el servicio de notificaciones push está disponible
        if (typeof PushNotificationService === 'undefined') {
            console.warn('🔔 PushNotificationService no está disponible');
            return;
        }
        
        // Inicializar servicio de notificaciones push
        window.pushNotificationService = new PushNotificationService();
        
        // Verificar estado de permisos
        const permissionStatus = window.pushNotificationService.getPermissionStatus();
        console.log('🔔 Estado de permisos:', permissionStatus);
        
        // Solo solicitar permisos si el usuario no los ha concedido ni denegado
        if (permissionStatus.supported && permissionStatus.permission === 'default') {
            console.log('🔔 Solicitando permisos automáticamente...');
            
            // Solicitar permisos después de un breve delay para mejor UX
            setTimeout(async () => {
                try {
                    const granted = await window.pushNotificationService.requestPermission();
                    console.log('🔔 Permisos concedidos:', granted);
                    
                    if (granted) {
                        // Mostrar mensaje de confirmación
                        window.pushNotificationService.showToast(
                            '✅ Notificaciones activadas. Recibirás alertas de nuevas notificaciones.',
                            'success'
                        );
                    }
                } catch (error) {
                    console.error('🔔 Error al solicitar permisos:', error);
                }
            }, 2000); // 2 segundos de delay
        } else if (permissionStatus.permission === 'granted') {
            console.log('🔔 Permisos ya concedidos');
        } else if (permissionStatus.permission === 'denied') {
            console.log('🔔 Permisos denegados por el usuario');
        }
        
        // Configurar listener para notificaciones push del servidor
        setupPushNotificationListener();
    });
    
    // Configurar listener para recibir notificaciones push
    function setupPushNotificationListener() {
        // Escuchar mensajes del servidor (para futuras implementaciones con WebSocket)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
                    console.log('🔔 Notificación push recibida:', event.data);
                    handlePushNotification(event.data.notification);
                }
            });
        }
        
        // Polling para verificar nuevas notificaciones (implementación temporal)
        setInterval(checkForNewNotifications, 30000); // Cada 30 segundos
    }
    
    // Verificar nuevas notificaciones
    function checkForNewNotifications() {
        if (!window.pushNotificationService || 
            !window.pushNotificationService.getPermissionStatus().canSend) {
            return;
        }
        
        // Hacer petición al API para obtener notificaciones activas
        fetch('/wp-json/condo360/v1/notifications/active')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.data && data.data.length > 0) {
                    // Verificar si hay notificaciones nuevas
                    const lastCheck = localStorage.getItem('condo360_last_notification_check');
                    const currentTime = new Date().toISOString();
                    
                    data.data.forEach(notification => {
                        // Solo enviar si es nueva (creada después del último check)
                        if (!lastCheck || notification.created_at > lastCheck) {
                            if (window.pushNotificationService.shouldSendNotification(notification)) {
                                console.log('🔔 Enviando notificación push:', notification.titulo);
                                window.pushNotificationService.sendNotification(notification);
                            }
                        }
                    });
                    
                    // Actualizar timestamp del último check
                    localStorage.setItem('condo360_last_notification_check', currentTime);
                }
            })
            .catch(error => {
                console.error('🔔 Error al verificar notificaciones:', error);
            });
    }
    
    // Manejar notificación push recibida
    function handlePushNotification(notification) {
        if (window.pushNotificationService && 
            window.pushNotificationService.getPermissionStatus().canSend) {
            console.log('🔔 Procesando notificación push:', notification);
            window.pushNotificationService.sendNotification(notification);
        }
    }
    
    // Exponer funciones globalmente para uso del admin
    window.Condo360PushNotifications = {
        sendNotification: function(notification) {
            if (window.pushNotificationService) {
                return window.pushNotificationService.sendNotification(notification);
            }
            return false;
        },
        
        getPermissionStatus: function() {
            if (window.pushNotificationService) {
                return window.pushNotificationService.getPermissionStatus();
            }
            return { supported: false, permission: 'denied', canSend: false };
        },
        
        requestPermission: async function() {
            if (window.pushNotificationService) {
                return await window.pushNotificationService.requestPermission();
            }
            return false;
        }
    };
    
})();
