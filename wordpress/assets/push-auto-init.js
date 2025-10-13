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
                    
                    // Obtener IDs de notificaciones ya procesadas
                    const processedIds = JSON.parse(localStorage.getItem('condo360_processed_notifications') || '[]');
                    const currentTime = new Date().toISOString();
                    
                    console.log('🔔 IDs ya procesados:', processedIds);
                    
                    data.data.forEach(notification => {
                        console.log('🔔 Procesando notificación:', notification.titulo, 'ID:', notification.id);
                        
                        // Solo enviar si no hemos procesado esta notificación antes
                        if (!processedIds.includes(notification.id)) {
                            console.log('🔔 Notificación nueva detectada:', notification.titulo, 'ID:', notification.id);
                            
                            if (window.pushNotificationService.shouldSendNotification(notification)) {
                                console.log('🔔 Enviando notificación push:', notification.titulo);
                                
                                // Enviar notificación y verificar si fue exitosa
                                const sent = window.pushNotificationService.sendNotification(notification);
                                
                                if (sent) {
                                    // Solo marcar como procesada si se envió exitosamente
                                    processedIds.push(notification.id);
                                    localStorage.setItem('condo360_processed_notifications', JSON.stringify(processedIds));
                                    console.log('🔔 Notificación enviada y marcada como procesada:', notification.id);
                                } else {
                                    console.log('🔔 Error al enviar notificación:', notification.titulo);
                                }
                            } else {
                                console.log('🔔 Notificación no cumple criterios para envío:', notification);
                                // Marcar como procesada aunque no se envíe para evitar procesarla repetidamente
                                processedIds.push(notification.id);
                                localStorage.setItem('condo360_processed_notifications', JSON.stringify(processedIds));
                                console.log('🔔 Notificación marcada como procesada (no cumple criterios):', notification.id);
                            }
                        } else {
                            console.log('🔔 Notificación ya procesada:', notification.titulo, 'ID:', notification.id);
                        }
                    });
                    
                    // Limpiar IDs antiguos (más de 24 horas)
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                    const filteredIds = processedIds.filter(id => {
                        // Mantener solo IDs de notificaciones que aún existen
                        return data.data.some(n => n.id === id);
                    });
                    
                    if (filteredIds.length !== processedIds.length) {
                        localStorage.setItem('condo360_processed_notifications', JSON.stringify(filteredIds));
                        console.log('🔔 Cache de IDs limpiado');
                    }
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
        },
        
        // Función para limpiar cache y procesar todas las notificaciones
        clearCacheAndCheck: function() {
            console.log('🔔 Limpiando cache y verificando todas las notificaciones...');
            localStorage.removeItem('condo360_processed_notifications');
            localStorage.removeItem('condo360_last_notification_check');
            checkForNewNotifications();
        },
        
        // Función para procesar notificación específica por ID
        processNotificationById: function(id) {
            if (!window.pushNotificationService) {
                console.error('🔔 Servicio de notificaciones no disponible');
                return false;
            }
            
            console.log('🔔 Procesando notificación específica ID:', id);
            
            fetch('/wp-json/condo360/v1/notifications/active')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data) {
                        const notification = data.data.find(n => n.id == id);
                        if (notification) {
                            console.log('🔔 Notificación encontrada:', notification.titulo);
                            if (window.pushNotificationService.shouldSendNotification(notification)) {
                                console.log('🔔 Enviando notificación push:', notification.titulo);
                                window.pushNotificationService.sendNotification(notification);
                            } else {
                                console.log('🔔 Notificación no cumple criterios:', notification);
                            }
                        } else {
                            console.log('🔔 Notificación no encontrada con ID:', id);
                        }
                    }
                })
                .catch(error => {
                    console.error('🔔 Error al procesar notificación:', error);
                });
        },
        
        // Función para forzar envío de todas las notificaciones (ignora cache)
        forceSendAll: function() {
            if (!window.pushNotificationService) {
                console.error('🔔 Servicio de notificaciones no disponible');
                return false;
            }
            
            console.log('🔔 Forzando envío de todas las notificaciones activas...');
            
            fetch('/wp-json/condo360/v1/notifications/active')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data && data.data.length > 0) {
                        console.log('🔔 Enviando', data.data.length, 'notificaciones...');
                        
                        data.data.forEach((notification, index) => {
                            setTimeout(() => {
                                console.log('🔔 Enviando notificación:', notification.titulo, 'ID:', notification.id);
                                
                                if (window.pushNotificationService.shouldSendNotification(notification)) {
                                    const sent = window.pushNotificationService.sendNotification(notification);
                                    if (sent) {
                                        console.log('✅ Notificación enviada:', notification.titulo);
                                    } else {
                                        console.log('❌ Error al enviar:', notification.titulo);
                                    }
                                } else {
                                    console.log('⚠️ Notificación no cumple criterios:', notification.titulo);
                                }
                            }, index * 1000); // 1 segundo entre cada notificación
                        });
                    } else {
                        console.log('🔔 No hay notificaciones activas para enviar');
                    }
                })
                .catch(error => {
                    console.error('🔔 Error al obtener notificaciones:', error);
                });
        }
    };
    
})();
