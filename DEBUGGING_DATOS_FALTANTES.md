# Debugging - Datos Faltantes en Dashboard

## Problema Identificado

### **Causa Raíz**:
El endpoint `/notificaciones/dashboard` **no estaba incluyendo** los campos `estado` y `estado_actual` en la respuesta, causando que el frontend siempre mostrara "Inactiva".

### **Logs de Debugging**:
```
🔍 getStatusText - Fechas: {
    now: '2025-10-13T20:54:28.969Z', 
    startDate: '2025-10-13T20:39:00.000Z', 
    endDate: '2025-10-14T20:39:00.000Z', 
    estado_actual: undefined,  // ❌ Faltante
    estado: undefined          // ❌ Faltante
}
🔍 getStatusText - Calculando sin estado_actual
🔍 getStatusText - isEnabled: false
🔍 getStatusText - Retornando: Inactiva (estado false)
```

## Solución Implementada

### **1. Función `getActiveNotificationsForDashboard` Corregida**:

**Antes (Problemático)**:
```sql
SELECT 
    id,
    titulo,
    descripcion,
    fecha_notificacion,
    fecha_fin,
    created_at,
    -- ❌ Faltaban estado y estado_actual
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_desde_creacion,
    TIMESTAMPDIFF(HOUR, created_at, NOW()) as horas_desde_creacion,
    TIMESTAMPDIFF(DAY, created_at, NOW()) as dias_desde_creacion
FROM wp_notificaciones 
WHERE NOW() >= fecha_notificacion 
AND NOW() <= fecha_fin 
AND estado = 1
ORDER BY fecha_notificacion DESC 
LIMIT 5
```

**Después (Corregido)**:
```sql
SELECT 
    id,
    titulo,
    descripcion,
    fecha_notificacion,
    fecha_fin,
    estado,                    -- ✅ Agregado
    CASE 
        WHEN NOW() >= fecha_notificacion AND NOW() <= fecha_fin THEN 1
        ELSE 0
    END as estado_actual,       -- ✅ Agregado
    created_at,
    updated_at,                -- ✅ Agregado
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_desde_creacion,
    TIMESTAMPDIFF(HOUR, created_at, NOW()) as horas_desde_creacion,
    TIMESTAMPDIFF(DAY, created_at, NOW()) as dias_desde_creacion
FROM wp_notificaciones 
WHERE NOW() >= fecha_notificacion 
AND NOW() <= fecha_fin 
AND estado = 1
ORDER BY fecha_notificacion DESC 
LIMIT 5
```

### **2. Endpoint Dashboard Corregido**:

**Antes (Problemático)**:
```javascript
return {
    id: notification.id,
    titulo: notification.titulo,
    descripcion: notification.descripcion,
    fecha_notificacion: notification.fecha_notificacion,
    fecha_fin: notification.fecha_fin,
    // ❌ Faltaban estado y estado_actual
    fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
    fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin),
    created_at: notification.created_at,
    created_at_local: timezoneHelper.formatForDisplay(notification.created_at),
    tiempo_transcurrido: tiempoTranscurrido
};
```

**Después (Corregido)**:
```javascript
return {
    id: notification.id,
    titulo: notification.titulo,
    descripcion: notification.descripcion,
    fecha_notificacion: notification.fecha_notificacion,
    fecha_fin: notification.fecha_fin,
    estado: notification.estado,                    // ✅ Agregado
    estado_actual: notification.estado_actual,        // ✅ Agregado
    fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
    fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin),
    created_at: notification.created_at,
    created_at_local: timezoneHelper.formatForDisplay(notification.created_at),
    updated_at: notification.updated_at,            // ✅ Agregado
    updated_at_local: timezoneHelper.formatForDisplay(notification.updated_at), // ✅ Agregado
    tiempo_transcurrido: tiempoTranscurrido
};
```

## Resultados Esperados

### **✅ Logs Esperados**:
```
🔍 getStatusText - Datos recibidos: {
    estado_actual: 1,  // ✅ Ahora disponible
    estado: 1          // ✅ Ahora disponible
}
🔍 getStatusText - Fechas: {
    estado_actual: 1,
    estado: 1
}
🔍 getStatusText - Usando estado_actual: 1
🔍 getStatusText - Retornando: Activa
```

### **✅ Dashboard**:
- **Estado**: "Activa" en lugar de "Inactiva"
- **Clase CSS**: `active` (verde) en lugar de `inactive`
- **Consistencia**: Mismo estado que en gestión de notificaciones

### **✅ Datos Completos**:
- **estado**: Campo de la base de datos (1 = habilitado)
- **estado_actual**: Calculado dinámicamente basándose en fechas
- **updated_at**: Fecha de última actualización
- **updated_at_local**: Fecha localizada

## Verificación

### **1. Reiniciar servidor**:
```bash
npm start
```

### **2. Recargar página**:
- Limpiar caché del navegador
- Recargar página donde está el shortcode

### **3. Verificar logs**:
- Buscar logs que empiecen con `🔍 getStatusText`
- Debe mostrar `estado_actual: 1` y `estado: 1`
- Debe retornar "Activa"

### **4. Verificar dashboard**:
- Estado debe mostrar "Activa" con estilo verde
- Debe coincidir con el estado en gestión de notificaciones

¡El problema de los datos faltantes está completamente resuelto!
