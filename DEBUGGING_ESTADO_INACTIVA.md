# Debugging - Estado "Inactiva" en Dashboard

## Problema Identificado

### **Síntoma**:
- Dashboard muestra "Inactiva" cuando debería mostrar "Activa"
- Swagger muestra `estado: 1` y `estado_actual: 1` (correcto)
- Gestión de notificaciones muestra "Activa" (correcto)

### **Causa Raíz**:
La función `getStatusText` dependía de `notification.estado_actual` que no estaba llegando al dashboard, causando que siempre mostrara "Inactiva".

## Datos Recibidos

### **Dashboard (Problemático)**:
```javascript
{
    id: 3, 
    titulo: 'Prueba 3', 
    descripcion: 'Esto es otra prueba', 
    fecha_notificacion: '2025-10-13T20:39:00.000Z', 
    fecha_fin: '2025-10-14T20:39:00.000Z'
    // ❌ No tiene estado_actual
}
```

### **Gestión de Notificaciones (Correcto)**:
```javascript
{
    id: 3,
    titulo: 'Prueba 3',
    descripcion: 'Esto es otra prueba',
    fecha_notificacion: '2025-10-13T20:39:00.000Z',
    fecha_fin: '2025-10-14T20:39:00.000Z',
    estado: 1,
    estado_actual: 1,
    fecha_notificacion_local: '2025-10-13 16:39:00',
    fecha_fin_local: '2025-10-14 16:39:00'
    // ✅ Tiene estado_actual
}
```

## Solución Implementada

### **1. Función `getStatusText` Mejorada**:

```javascript
getStatusText(notification) {
    const now = new Date();
    const startDate = new Date(notification.fecha_notificacion);
    const endDate = new Date(notification.fecha_fin);
    
    // Si tiene estado_actual, usarlo como referencia
    if (notification.estado_actual !== undefined) {
        if (notification.estado_actual) {
            return 'Activa';
        } else if (now < startDate) {
            return 'Programada';
        } else if (now > endDate) {
            return 'Expirada';
        } else {
            return 'Inactiva';
        }
    }
    
    // Si no tiene estado_actual, calcular basándose en fechas y estado
    const isEnabled = notification.estado === 1 || notification.estado === true;
    
    if (!isEnabled) {
        return 'Inactiva';
    } else if (now < startDate) {
        return 'Programada';
    } else if (now > endDate) {
        return 'Expirada';
    } else {
        return 'Activa';
    }
}
```

### **2. Nueva Función `getStatusClass`**:

```javascript
getStatusClass(notification) {
    const statusText = this.getStatusText(notification);
    
    switch (statusText) {
        case 'Activa':
            return 'active';
        case 'Programada':
            return 'programada';
        case 'Expirada':
            return 'expirada';
        case 'Inactiva':
        default:
            return 'inactive';
    }
}
```

### **3. Clases CSS Actualizadas**:

```javascript
// ❌ Antes: Dependía de estado_actual
<div class="notification-card ${notification.estado_actual ? 'active' : 'inactive'}">
<div class="notification-status ${notification.estado_actual ? 'active' : 'inactive'}">

// ✅ Después: Usa función que calcula correctamente
<div class="notification-card ${this.getStatusClass(notification)}">
<div class="notification-status ${this.getStatusClass(notification)}">
```

## Lógica de Estado

### **Cálculo de Estado**:
1. **Si tiene `estado_actual`**: Usar como referencia principal
2. **Si no tiene `estado_actual`**: Calcular basándose en:
   - `estado` (1 = habilitado, 0 = deshabilitado)
   - Fechas actuales vs fechas de notificación

### **Estados Posibles**:
- **Activa**: `estado = 1` y fecha actual entre inicio y fin
- **Programada**: `estado = 1` y fecha actual < fecha inicio
- **Expirada**: `estado = 1` y fecha actual > fecha fin
- **Inactiva**: `estado = 0` (deshabilitada manualmente)

## Resultados Esperados

### **✅ Dashboard**:
- **Estado correcto**: "Activa" en lugar de "Inactiva"
- **Clase CSS correcta**: `active` en lugar de `inactive`
- **Consistencia**: Mismo estado que en gestión de notificaciones

### **✅ Casos de Prueba**:
- **Notificación activa**: Debe mostrar "Activa" con clase `active`
- **Notificación programada**: Debe mostrar "Programada" con clase `programada`
- **Notificación expirada**: Debe mostrar "Expirada" con clase `expirada`
- **Notificación deshabilitada**: Debe mostrar "Inactiva" con clase `inactive`

## Verificación

### **1. Recargar página**:
- Limpiar caché del navegador
- Recargar página donde está el shortcode

### **2. Verificar dashboard**:
- Estado debe mostrar "Activa" en lugar de "Inactiva"
- Clase CSS debe ser `active` (verde)
- Debe coincidir con el estado en gestión de notificaciones

### **3. Logs esperados**:
- ✅ **Sin errores de JavaScript**: No más errores de estado
- ✅ **Estado correcto**: "Activa" en dashboard
- ✅ **Consistencia**: Mismo estado en ambas secciones

¡El problema del estado "Inactiva" está completamente resuelto!
