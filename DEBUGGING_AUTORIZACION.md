# Debugging - Error "Acceso no autorizado"

## Problema Identificado

El error "Acceso no autorizado" indica que hay un problema con la autenticación en WordPress. He agregado debugging completo para identificar la causa exacta.

## Pasos para Debuggear

### 1. Recargar la página y abrir consola
- Presionar F12 → Console
- Recargar la página donde está el shortcode

### 2. Verificar información de debugging
Deberías ver estos logs:
```
🔍 Inicializando Condo360 Notifications...
🔍 Variables disponibles: true
🔍 AJAX URL: /wp-admin/admin-ajax.php
🔍 User ID: [tu_id]
🔍 Is Admin: true
🔍 Nonce: [string_largo]
🔍 Debug Info: {user_roles: ["administrator"], ...}
```

### 3. Verificar roles de usuario
En el objeto `debug` deberías ver:
```javascript
debug: {
    user_roles: ["administrator"],  // o ["editor"]
    current_user_can_admin: true,   // o false
    current_user_can_editor: true   // o false
}
```

### 4. Verificar logs de WordPress
Revisar los logs de WordPress (generalmente en `/wp-content/debug.log`):
```
Condo360 AJAX Request - User ID: [tu_id]
Condo360 AJAX Request - POST data: Array(...)
```

## Posibles Causas y Soluciones

### Causa 1: Nonce Expirado
**Síntoma**: Nonce inválido en logs
**Solución**: 
- Recargar la página para generar nuevo nonce
- Verificar que no haya caché activo

### Causa 2: Usuario no tiene permisos
**Síntoma**: `is_admin: false` en consola
**Solución**:
- Verificar que el usuario tenga rol `administrator` o `editor`
- Verificar que esté logueado correctamente

### Causa 3: Plugin no activado correctamente
**Síntoma**: Variables de AJAX no disponibles
**Solución**:
- Verificar que el plugin esté activado
- Verificar que los archivos estén en la ubicación correcta

### Causa 4: Conflicto con otros plugins
**Síntoma**: Errores inesperados
**Solución**:
- Desactivar otros plugins temporalmente
- Verificar si hay conflictos de JavaScript

## Verificaciones Específicas

### 1. Verificar rol de usuario en WordPress
```php
// En el panel de administración de WordPress
// Ir a Usuarios → Tu perfil
// Verificar que el rol sea "Administrador"
```

### 2. Verificar que el usuario esté logueado
```javascript
// En consola del navegador
console.log('User ID:', condo360_ajax.user_id);
console.log('Is Admin:', condo360_ajax.is_admin);
```

### 3. Verificar nonce
```javascript
// En consola del navegador
console.log('Nonce:', condo360_ajax.nonce);
// Debe ser un string largo, no vacío
```

## Solución Temporal

Si el problema persiste, puedes desactivar temporalmente la verificación de nonce para testing:

```php
// En condo360-notifications-manager.php línea 187
// Comentar temporalmente:
// if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'condo360_notifications_nonce')) {
//     error_log('Condo360 AJAX Request - Nonce verification failed');
//     wp_send_json_error('Acceso no autorizado - Nonce inválido');
// }
```

**⚠️ IMPORTANTE**: Solo para testing, reactivar después.

## Próximos Pasos

1. **Recargar la página** donde está el shortcode
2. **Abrir consola** del navegador (F12)
3. **Copiar y pegar** todos los logs que aparezcan
4. **Verificar** que `is_admin: true` y `user_roles: ["administrator"]`
5. **Probar** crear una notificación

Con esta información podremos identificar exactamente dónde está el problema.
