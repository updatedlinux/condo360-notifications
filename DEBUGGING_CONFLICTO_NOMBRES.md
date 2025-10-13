# Debugging - Conflicto de Nombres de Variables

## Problema Identificado

### **Conflicto con otro plugin**
- **Síntoma**: `window.condo360_ajax` existe pero tiene estructura diferente
- **Contenido actual**: `{ajax_url: '...', nonce: '...', current_user_id: '1', per_page: '20', ...}`
- **Contenido esperado**: `{user_id: X, is_admin: true, is_logged_in: true, ...}`
- **Causa**: Otro plugin está sobrescribiendo `window.condo360_ajax`

## Solución Implementada

### **Nombre Único para Evitar Conflictos**

**Antes (Problemático)**:
```php
// Conflicto con otro plugin
$inline_script = "window.condo360_ajax = {$script_data};";
```

**Después (Corregido)**:
```php
// Nombre único específico para este plugin
$inline_script = "window.condo360_notifications_data = {$script_data}; console.log('🔍 Script inline ejecutado:', window.condo360_notifications_data);";
```

### **JavaScript con Prioridad Correcta**

```javascript
// Usar window.condo360_notifications_data como fuente principal
var ajaxData = window.condo360_notifications_data || 
              (typeof condo360_ajax !== 'undefined' ? condo360_ajax : window.condo360_ajax);

// Asignar para compatibilidad
window.condo360_ajax = ajaxData;
window.condo360_notifications_data = ajaxData;
```

## Debugging Mejorado

### **Logs Adicionales**
```javascript
console.log('🔍 Window condo360_notifications_data:', typeof window.condo360_notifications_data !== 'undefined');
console.log('🔍 Window condo360_notifications_data content:', window.condo360_notifications_data);
```

### **Script Inline con Log**
```php
// El script inline ahora incluye un log para verificar ejecución
$inline_script = "window.condo360_notifications_data = {$script_data}; console.log('🔍 Script inline ejecutado:', window.condo360_notifications_data);";
```

## Verificación

### **1. Recargar la página**
- Limpiar caché del navegador (Ctrl+F5)
- Recargar la página donde está el shortcode

### **2. Verificar logs en consola**
Ahora deberías ver:
```
🔍 Script inline ejecutado: {user_id: X, is_admin: true, is_logged_in: true, ...}
🔍 Window condo360_notifications_data: true
🔍 Window condo360_notifications_data content: {user_id: X, is_admin: true, ...}
🔍 User ID: [número > 0]
🔍 Is Admin: true
🔍 Is Logged In: true
```

### **3. Si aún hay problemas**
Verificar en consola:
```javascript
// Verificar que el script inline se ejecutó
console.log('Manual check:', window.condo360_notifications_data);
console.log('User ID manual:', window.condo360_notifications_data?.user_id);
```

## Estado Esperado

- ✅ **Script inline ejecutado**: Debe aparecer el log del script inline
- ✅ **Window condo360_notifications_data**: Debe ser `true`
- ✅ **Window condo360_notifications_data content**: Debe mostrar objeto con `user_id`, `is_admin`, etc.
- ✅ **User ID**: Debe ser un número > 0
- ✅ **Is Admin**: Debe ser `true`
- ✅ **Is Logged In**: Debe ser `true`
- ✅ **Sin conflictos**: No más interferencia de otros plugins

## Próximo Paso

Una vez que `window.condo360_notifications_data` esté disponible con la estructura correcta:
1. El sistema debería inicializar correctamente
2. Cargar las notificaciones del dashboard
3. Mostrar "No hay notificaciones activas" si no hay datos
4. Permitir crear nuevas notificaciones
5. Funcionar completamente sin errores

¡Recarga la página y verifica que ahora `window.condo360_notifications_data` esté disponible con la estructura correcta!
