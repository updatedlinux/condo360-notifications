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
        
        // Polling para verificar nuevas notificaciones (cada 10 segundos para pruebas)
        setInterval(checkForNewNotifications, 10000); // Cada 10 segundos
    }
    
    // Verificar nuevas notificaciones
    function checkForNewNotifications() {
        if (!window.pushNotificationService || 
            !window.pushNotificationService.getPermissionStatus().canSend) {
            console.log('🔔 No se puede verificar notificaciones: servicio no disponible o permisos no concedidos');
            return;
        }
        
        console.log('🔔 Verificando nuevas notificaciones...');
        
        // Hacer petición al API para obtener notificaciones activas
        fetch('/wp-json/condo360/v1/notifications/active')
            .then(response => {
                console.log('🔔 Respuesta del API:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('🔔 Datos recibidos:', data);
                
                if (data.success && data.data && data.data.length > 0) {
                    console.log('🔔 Notificaciones activas encontradas:', data.data.length);
                    
                    // Verificar si hay notificaciones nuevas
                    const lastCheck = localStorage.getItem('condo360_last_notification_check');
                    const currentTime = new Date().toISOString();
                    
                    console.log('🔔 Último check:', lastCheck);
                    console.log('🔔 Tiempo actual:', currentTime);
                    
                    data.data.forEach(notification => {
                        console.log('🔔 Procesando notificación:', notification.titulo, 'Creada:', notification.created_at);
                        
                        // Solo enviar si es nueva (creada después del último check)
                        if (!lastCheck || notification.created_at > lastCheck) {
                            console.log('🔔 Notificación nueva detectada:', notification.titulo);
                            
                            if (window.pushNotificationService.shouldSendNotification(notification)) {
                                console.log('🔔 Enviando notificación push:', notification.titulo);
                                window.pushNotificationService.sendNotification(notification);
                            } else {
                                console.log('🔔 Notificación no cumple criterios para envío:', notification);
                            }
                        } else {
                            console.log('🔔 Notificación ya conocida:', notification.titulo);
                        }
                    });
                    
                    // Actualizar timestamp del último check
                    localStorage.setItem('condo360_last_notification_check', currentTime);
                    console.log('🔔 Timestamp actualizado:', currentTime);
                } else {
                    console.log('🔔 No hay notificaciones activas');
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
        },
        
        // Función de prueba para enviar notificación manual
        testNotification: function() {
            if (window.pushNotificationService) {
                const testNotification = {
                    id: 'test-' + Date.now(),
                    titulo: 'Prueba de Notificación Push',
                    descripcion: 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
                    fecha_notificacion: new Date().toISOString(),
                    fecha_fin: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas después
                    estado: 1,
                    estado_actual: 1
                };
                
                console.log('🔔 Enviando notificación de prueba:', testNotification);
                return window.pushNotificationService.sendNotification(testNotification);
            }
            return false;
        },
        
        // Función para verificar notificaciones inmediatamente
        checkNow: function() {
            console.log('🔔 Verificación manual de notificaciones...');
            checkForNewNotifications();
        }
    };
    
})();
