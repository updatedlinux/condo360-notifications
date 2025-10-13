# Debugging - Estado "Inactiva" Persistente

## Problema Actual

### **Síntoma**:
- Dashboard sigue mostrando "Inactiva" a pesar de tener `estado_actual: true`
- Los datos muestran claramente que debería ser "Activa"

### **Datos Recibidos**:
```javascript
{
  id: 3,
  titulo: 'Prueba 3',
  descripcion: 'Esto es otra prueba',
  estado_actual: true,  // ✅ Debería ser "Activa"
  estado_bd: true,
  fecha_actual: '2025-10-13 20:48:25',
  fecha_actual_local: '2025-10-13 16:48:25',
  fecha_notificacion: 2025-10-13T20:39:00.000Z,
  fecha_notificacion_local: '2025-10-13 16:39:00',
  fecha_fin: 2025-10-14T20:39:00.000Z,
  fecha_fin_local: '2025-10-14 16:39:00',
  created_at: 2025-10-13T20:39:40.000Z,
  created_at_local: '2025-10-13 16:39:40'
}
```

### **Resultado Actual**:
- Dashboard: "Inactiva" ❌
- Gestión: "Activa" ✅

## Debugging Implementado

### **Logs Agregados a `getStatusText`**:
```javascript
getStatusText(notification) {
    console.log('🔍 getStatusText - Datos recibidos:', notification);
    
    const now = new Date();
    const startDate = new Date(notification.fecha_notificacion);
    const endDate = new Date(notification.fecha_fin);
    
    console.log('🔍 getStatusText - Fechas:', {
        now: now.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        estado_actual: notification.estado_actual,
        estado: notification.estado
    });
    
    // Si tiene estado_actual, usarlo como referencia
    if (notification.estado_actual !== undefined) {
        console.log('🔍 getStatusText - Usando estado_actual:', notification.estado_actual);
        if (notification.estado_actual) {
            console.log('🔍 getStatusText - Retornando: Activa');
            return 'Activa';
        }
        // ... resto de la lógica
    }
}
```

## Próximos Pasos

### **1. Recargar página**:
- Limpiar caché del navegador
- Recargar página donde está el shortcode

### **2. Revisar logs de consola**:
- Buscar logs que empiecen con `🔍 getStatusText`
- Verificar qué datos está recibiendo la función
- Identificar por qué retorna "Inactiva"

### **3. Posibles Causas**:
- **Caché del navegador**: JavaScript antiguo en caché
- **Datos diferentes**: Dashboard recibe datos diferentes a los mostrados
- **Lógica incorrecta**: Error en la función `getStatusText`
- **Timing**: Función se ejecuta antes de que los datos estén disponibles

## Logs Esperados

Si funciona correctamente, debería ver:
```
🔍 getStatusText - Datos recibidos: {estado_actual: true, ...}
🔍 getStatusText - Fechas: {now: "2025-10-13T20:48:25.000Z", ...}
🔍 getStatusText - Usando estado_actual: true
🔍 getStatusText - Retornando: Activa
```

Si hay problema, veremos:
```
🔍 getStatusText - Datos recibidos: {estado_actual: undefined, ...}
🔍 getStatusText - Calculando sin estado_actual
🔍 getStatusText - isEnabled: false
🔍 getStatusText - Retornando: Inactiva (estado false)
```

## Solución Temporal

Si el problema persiste, podemos:
1. **Simplificar la lógica**: Solo usar `estado_actual` si existe
2. **Forzar estado**: Si `estado_actual: true`, siempre retornar "Activa"
3. **Verificar datos**: Asegurar que dashboard recibe los mismos datos

¡Necesitamos ver los logs para identificar la causa exacta!
