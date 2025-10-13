# Solución de Problemas - Condo360 Notifications

## Problemas Identificados y Soluciones

### ✅ 1. Configuración MySQL2 - SOLUCIONADO
**Problema**: Opciones de configuración inválidas en MySQL2
```
Ignoring invalid configuration option passed to Connection: acquireTimeout
Ignoring invalid configuration option passed to Connection: timeout  
Ignoring invalid configuration option passed to Connection: reconnect
```

**Solución**: Eliminé las opciones inválidas del archivo `config/database.js`

### ✅ 2. Rate Limiting con Proxy - SOLUCIONADO
**Problema**: Error de configuración de proxy para rate limiting
```
ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false
```

**Solución**: Agregué `app.set('trust proxy', 1);` en `server.js`

### ✅ 3. Error en Consulta SQL - SOLUCIONADO
**Problema**: Error en parámetros de consulta preparada
```
Error: Incorrect arguments to mysqld_stmt_execute
```

**Solución**: Cambié la consulta para usar interpolación directa en lugar de parámetros preparados para LIMIT/OFFSET

## Pasos para Verificar la Solución

### 1. Probar la Base de Datos
```bash
npm run test-db
```

Este comando verificará:
- ✅ Conexión a la base de datos
- ✅ Consultas básicas
- ✅ Existencia de la tabla wp_notificaciones
- ✅ Consultas en la tabla

### 2. Reiniciar el Servidor
```bash
npm start
```

### 3. Verificar Endpoints
```bash
# Probar endpoint principal
curl http://localhost:3002/

# Probar endpoint de notificaciones
curl http://localhost:3002/notificaciones

# Probar dashboard
curl http://localhost:3002/notificaciones/dashboard
```

## Si Aún Hay Problemas

### Verificar Variables de Entorno
Asegúrate de que tu archivo `.env` tenga las configuraciones correctas:

```env
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=tu_base_de_datos_wordpress
DB_PORT=3306
NODE_ENV=development
```

### Verificar Tablas de Base de Datos
Si el test-db indica que la tabla no existe:

```bash
mysql -u tu_usuario -p tu_base_de_datos < database.sql
```

### Verificar Permisos de Usuario MySQL
El usuario debe tener permisos para:
- SELECT, INSERT, UPDATE, DELETE en la base de datos
- CREATE TABLE (para crear las tablas iniciales)

### Logs de Debugging
Si necesitas más información de debugging, el sistema ahora muestra:
- Consultas SQL en modo desarrollo
- Parámetros de consulta
- Errores detallados

## Estado Actual Esperado

Después de aplicar las correcciones, deberías ver:

```
✅ Conexión a la base de datos establecida correctamente
🚀 Servidor iniciado en puerto 3002
📚 Documentación disponible en: http://localhost:3002/api-docs
🌍 Zona horaria configurada: America/Caracas
```

**Sin errores de MySQL2 ni rate limiting.**

## Próximos Pasos

1. Ejecutar `npm run test-db` para verificar la base de datos
2. Reiniciar el servidor con `npm start`
3. Probar los endpoints
4. Si todo funciona, proceder con la configuración de WordPress
