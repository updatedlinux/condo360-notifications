# 🔔 Debugging de Notificaciones Push - Condo360

## Problema Identificado
Las notificaciones push no están llegando a los dispositivos después de crear notificaciones activas.

## Soluciones Implementadas

### 1. **Logging Mejorado**
- ✅ Agregados logs detallados en cada paso del proceso
- ✅ Verificación de estado de permisos
- ✅ Tracking de notificaciones nuevas vs conocidas

### 2. **Funciones de Prueba**
- ✅ `window.Condo360PushNotifications.testNotification()` - Envía notificación de prueba
- ✅ `window.Condo360PushNotifications.checkNow()` - Verifica notificaciones inmediatamente

### 3. **Polling Optimizado**
- ✅ Reducido a 10 segundos para pruebas
- ✅ Mejor manejo de errores
- ✅ Verificación de estado antes de procesar

## Pasos para Debugging

### **Paso 1: Verificar Permisos**
```javascript
// En la consola del navegador
console.log('Estado de permisos:', window.Condo360PushNotifications.getPermissionStatus());
```

**Resultado esperado:**
```javascript
{
  supported: true,
  permission: "granted",
  canSend: true
}
```

### **Paso 2: Probar Notificación Manual**
```javascript
// En la consola del navegador
window.Condo360PushNotifications.testNotification();
```

**Resultado esperado:**
- Debe aparecer una notificación push en el dispositivo
- Logs en consola: `🔔 Enviando notificación de prueba:`

### **Paso 3: Verificar API REST**
```javascript
// En la consola del navegador
fetch('/wp-json/condo360/v1/notifications/active')
  .then(response => response.json())
  .then(data => console.log('API Response:', data));
```

**Resultado esperado:**
```javascript
{
  success: true,
  data: [...], // Array de notificaciones activas
  count: 1
}
```

### **Paso 4: Verificar Polling Automático**
```javascript
// En la consola del navegador
window.Condo360PushNotifications.checkNow();
```

**Logs esperados:**
```
🔔 Verificación manual de notificaciones...
🔔 Verificando nuevas notificaciones...
🔔 Respuesta del API: 200
🔔 Datos recibidos: {success: true, data: [...], count: 1}
🔔 Notificaciones activas encontradas: 1
🔔 Procesando notificación: [título] Creada: [timestamp]
```

## Posibles Problemas y Soluciones

### **Problema 1: Permisos No Concedidos**
**Síntomas:**
- `permission: "denied"` o `permission: "default"`
- No aparecen notificaciones

**Solución:**
```javascript
// Solicitar permisos manualmente
window.Condo360PushNotifications.requestPermission();
```

### **Problema 2: API No Responde**
**Síntomas:**
- Error 404 o 500 en la consola
- `🔔 Error al verificar notificaciones:`

**Solución:**
1. Verificar que el plugin esté activo
2. Verificar que el API de Node.js esté funcionando
3. Verificar permisos de WordPress

### **Problema 3: Notificaciones No Nuevas**
**Síntomas:**
- `🔔 Notificación ya conocida:`
- No se envían notificaciones

**Solución:**
```javascript
// Limpiar cache de notificaciones
localStorage.removeItem('condo360_last_notification_check');
// Verificar inmediatamente
window.Condo360PushNotifications.checkNow();
```

### **Problema 4: Notificación No Cumple Criterios**
**Síntomas:**
- `🔔 Notificación no cumple criterios para envío:`
- Datos de notificación incorrectos

**Solución:**
1. Verificar que `estado: 1` y `estado_actual: 1`
2. Verificar fechas de inicio y fin
3. Verificar que esté dentro del rango de tiempo

## Flujo de Prueba Completo

### **1. Preparación**
```javascript
// Limpiar cache
localStorage.removeItem('condo360_last_notification_check');

// Verificar estado inicial
console.log('Estado inicial:', window.Condo360PushNotifications.getPermissionStatus());
```

### **2. Crear Notificación Activa**
1. Ir al área de administración
2. Crear notificación con:
   - Fecha de inicio: Ahora
   - Fecha de fin: Mañana
   - Estado: Activa
3. Guardar

### **3. Verificar Envío**
```javascript
// Verificar inmediatamente
window.Condo360PushNotifications.checkNow();

// O esperar el polling automático (10 segundos)
```

### **4. Verificar Logs**
Buscar en consola:
- `🔔 Notificación nueva detectada:`
- `🔔 Enviando notificación push:`
- `🔔 Notificación enviada:`

## Configuración del Navegador

### **Chrome/Edge:**
1. Configuración → Privacidad y seguridad → Notificaciones
2. Verificar que el sitio tenga permisos
3. Configuración → Avanzado → Contenido → Notificaciones

### **Firefox:**
1. Configuración → Privacidad y seguridad → Permisos
2. Notificaciones → Configuración
3. Verificar que el sitio esté permitido

### **Safari:**
1. Preferencias → Sitios web → Notificaciones
2. Verificar que el sitio esté permitido

## Notas Importantes

1. **HTTPS Requerido**: Las notificaciones push solo funcionan en HTTPS
2. **Usuario Activo**: El usuario debe estar en la página para recibir notificaciones
3. **Polling Limitado**: El polling se detiene si el usuario no está activo
4. **Cache Local**: Se usa localStorage para evitar notificaciones duplicadas

## Próximos Pasos

Si las pruebas manuales funcionan pero las automáticas no:

1. **Verificar timing**: El polling puede tardar hasta 10 segundos
2. **Verificar estado de página**: El usuario debe estar activo
3. **Verificar cache**: Limpiar localStorage si es necesario
4. **Verificar API**: Asegurar que el endpoint REST funcione

¡Usa estas funciones de prueba para identificar exactamente dónde está el problema!
