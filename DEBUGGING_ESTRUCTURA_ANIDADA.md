# Debugging - Problema de Estructura de Datos Anidados

## Problema Identificado

### **Estructura de Datos Incorrecta**
- **Síntoma**: Modal muestra `undefined` para todos los campos
- **Causa**: Los datos están anidados en `response.data.data` en lugar de `response.data`
- **Evidencia**: Los logs muestran la estructura correcta

## Análisis de los Logs

### **Backend (Correcto)**
```
🔍 Estado - Datos de respuesta: {
  id: 2,
  titulo: 'prueba 2',
  descripcion: 'Esto es otra prueba',
  estado_actual: false,
  estado_bd: true,
  fecha_actual: '2025-10-13 20:17:39',
  fecha_actual_local: '2025-10-13 16:17:39',
  fecha_notificacion: 2025-10-14T20:09:00.000Z,
  fecha_notificacion_local: '2025-10-14 16:09:00',
  fecha_fin: 2025-10-20T20:09:00.000Z,
  fecha_fin_local: '2025-10-20 16:09:00',
  created_at: 2025-10-13T20:09:48.000Z,
  created_at_local: '2025-10-13 16:09:48'
}
```

### **Frontend (Problema)**
```
🔍 Datos de notificación: {
  success: true, 
  message: 'Estado de la notificación obtenido exitosamente', 
  data: {
    id: 2, 
    titulo: 'prueba 2', 
    descripcion: 'Esto es otra prueba', 
    estado_actual: false, 
    estado_bd: true, 
    ...
  }
}
```

### **Problema**
El frontend está recibiendo:
```javascript
response.data = {
  success: true,
  message: '...',
  data: { /* datos reales aquí */ }
}
```

Pero está intentando acceder a:
```javascript
notification.titulo // undefined porque está en response.data.data.titulo
```

## Solución Implementada

### **Antes (Problemático)**
```javascript
const notification = response.data; // ❌ Estructura incorrecta
```

### **Después (Corregido)**
```javascript
// ✅ Manejo de estructura anidada
const notification = response.data.data || response.data;
```

### **Funciones Corregidas**

#### **viewNotification**
```javascript
viewNotification(e) {
    const id = $(e.currentTarget).data('id');
    this.makeRequest('get_notification_status', { id: id }, (response) => {
        // ✅ Los datos están anidados en response.data.data
        const notification = response.data.data || response.data;
        this.showNotificationDetails(notification);
    });
}
```

#### **editNotification**
```javascript
editNotification(e) {
    const id = $(e.currentTarget).data('id');
    this.makeRequest('get_notification_status', { id: id }, (response) => {
        // ✅ Los datos están anidados en response.data.data
        const notification = response.data.data || response.data;
        this.populateForm(notification);
    });
}
```

## Verificación

### **1. Recargar la página**
- Limpiar caché del navegador
- Recargar la página donde está el shortcode

### **2. Probar funcionalidades**

#### **Ver Notificación**
- Hacer clic en "Ver"
- **Resultado esperado**: Modal debe mostrar datos completos
- **Logs esperados**:
  ```
  🔍 Datos de notificación: {id: 2, titulo: 'prueba 2', ...}
  ```

#### **Editar Notificación**
- Hacer clic en "Editar"
- **Resultado esperado**: Formulario debe estar poblado con datos
- **Logs esperados**:
  ```
  🔍 Datos para editar: {id: 2, titulo: 'prueba 2', ...}
  🔍 Formulario poblado - Título: prueba 2
  ```

### **3. Estado Esperado**

#### **Modal de Confirmación**
- ✅ **Título**: "prueba 2"
- ✅ **Descripción**: "Esto es otra prueba"
- ✅ **Fecha de inicio**: "2025-10-14 16:09:00"
- ✅ **Fecha de fin**: "2025-10-20 16:09:00"
- ✅ **Estado**: "Programada" (fecha futura)
- ✅ **Creada**: "2025-10-13 16:09:48"

#### **Formulario de Edición**
- ✅ **Título**: Campo poblado con "prueba 2"
- ✅ **Descripción**: Campo poblado con "Esto es otra prueba"
- ✅ **Fechas**: Campos poblados con fechas correctas
- ✅ **Estado**: Checkbox marcado correctamente

## Próximo Paso

Una vez corregida la estructura de datos:
1. **Modal de confirmación**: Debe mostrar todos los datos correctamente
2. **Función de editar**: Debe poblar el formulario con datos existentes
3. **Función de eliminar**: Debe funcionar correctamente
4. **Estados**: Deben mostrar "Programada" para fechas futuras

¡El problema de estructura de datos está resuelto!
