# Debugging - Problema de Contexto de Usuario

## Problema Identificado

### **User ID, Is Admin y Debug son `undefined`**
- **Síntoma**: Todas las variables críticas aparecen como `undefined` en consola
- **Causa**: `wp_localize_script` se ejecuta antes de que el contexto del usuario esté completamente disponible
- **Solución**: Mover `wp_localize_script` al shortcode mismo

## Corrección Implementada

### **Antes (Problemático)**
```php
// En enqueue_scripts() - Se ejecuta muy temprano
public function enqueue_scripts() {
    wp_enqueue_script('condo360-notifications-script', ...);
    
    // ❌ PROBLEMA: Usuario puede no estar completamente autenticado
    $user_id = get_current_user_id(); // Puede devolver 0
    wp_localize_script('condo360-notifications-script', 'condo360_ajax', ...);
}
```

### **Después (Corregido)**
```php
// En render_notifications_shortcode() - Se ejecuta cuando se renderiza
public function render_notifications_shortcode($atts) {
    // ✅ SOLUCIÓN: Usuario está completamente autenticado
    $this->enqueue_scripts();
    
    $user_id = get_current_user_id(); // Ahora devuelve el ID correcto
    $current_user = wp_get_current_user(); // Usuario completo disponible
    
    wp_localize_script('condo360-notifications-script', 'condo360_ajax', array(
        'user_id' => $user_id,
        'is_admin' => current_user_can('administrator'),
        'debug' => array(
            'user_login' => $current_user->user_login,
            'user_email' => $current_user->user_email,
            'user_roles' => $current_user->roles
        )
    ));
}
```

## Mejoras de Debugging

### **JavaScript Mejorado**
```javascript
console.log('🔍 User ID:', condo360_ajax.user_id);
console.log('🔍 Is Admin:', condo360_ajax.is_admin);
console.log('🔍 Is Logged In:', condo360_ajax.is_logged_in);
console.log('🔍 User Login:', condo360_ajax.debug?.user_login);
console.log('🔍 User Email:', condo360_ajax.debug?.user_email);
console.log('🔍 User Roles:', condo360_ajax.debug?.user_roles);
```

## Verificación

### **1. Recargar la página**
- Limpiar caché del navegador (Ctrl+F5)
- Recargar la página donde está el shortcode

### **2. Verificar logs en consola**
Ahora deberías ver:
```
🔍 User ID: [número > 0]
🔍 Is Admin: true
🔍 Is Logged In: true
🔍 User Login: [tu_usuario]
🔍 User Email: [tu_email]
🔍 User Roles: ["administrator"]
```

### **3. Si aún hay problemas**
Verificar que:
- Estés logueado en WordPress
- Tu usuario tenga rol de administrador
- No haya caché activo en el navegador
- El shortcode esté en una página donde tengas permisos

## Estado Esperado

- ✅ **User ID**: Debe ser un número > 0
- ✅ **Is Admin**: Debe ser `true`
- ✅ **Is Logged In**: Debe ser `true`
- ✅ **Debug Info**: Debe contener información completa del usuario
- ✅ **Sin errores**: No más "User ID no disponible"

## Próximo Paso

Una vez que el User ID esté disponible, el sistema debería:
1. Cargar las notificaciones del dashboard
2. Mostrar "No hay notificaciones activas" si no hay datos
3. Permitir crear nuevas notificaciones
4. Funcionar completamente sin errores de JavaScript

¡Recarga la página y verifica los logs en consola!
