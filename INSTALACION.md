# Instrucciones de Instalación - Condo360 Notifications

## Requisitos Previos

- Node.js 16+ 
- MySQL 5.7+
- WordPress con acceso a base de datos
- Nginx Proxy Manager (para producción)

## Paso 1: Configuración del Backend Node.js

### 1.1 Instalar dependencias

```bash
cd /Users/jmelendez/Documents/github_repos/condo360-2025/condo360-notifications
npm install
```

### 1.2 Configurar variables de entorno

```bash
cp env.example .env
```

Editar el archivo `.env` con tus configuraciones:

```env
# Configuración de la base de datos
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=tu_base_de_datos_wordpress
DB_PORT=3306

# Configuración del servidor
PORT=3001
NODE_ENV=development

# Configuración de zonas horarias
TIMEZONE_UTC=UTC
TIMEZONE_LOCAL=America/Caracas

# Configuración de seguridad
API_SECRET_KEY=tu_clave_secreta_muy_segura_aqui
ADMIN_ROLES=administrator,editor

# Configuración de notificaciones push
PUSH_NOTIFICATION_ENABLED=true
```

### 1.3 Crear tablas en la base de datos

Ejecutar el archivo SQL en tu base de datos de WordPress:

```bash
mysql -u tu_usuario -p tu_base_de_datos < database.sql
```

O ejecutar manualmente el contenido de `database.sql` en phpMyAdmin o tu cliente MySQL preferido.

### 1.4 Iniciar el servidor

```bash
# Para desarrollo
npm run dev

# Para producción
npm start
```

El servidor estará disponible en `http://localhost:3001`

## Paso 2: Configuración de WordPress

### 2.1 Instalar el plugin

1. Copiar toda la carpeta `wordpress/` a `/wp-content/plugins/condo360-notifications-manager/`
2. Asegurarse de que la estructura sea:
   ```
   /wp-content/plugins/condo360-notifications-manager/
   ├── condo360-notifications-manager.php
   └── assets/
       ├── style.css
       └── script.js
   ```

### 2.2 Activar el plugin

1. Ir al panel de administración de WordPress
2. Navegar a `Plugins > Plugins instalados`
3. Buscar "Condo360 Notifications Manager"
4. Hacer clic en "Activar"

### 2.3 Usar el shortcode

Agregar el shortcode en cualquier página o post:

```php
[condo360_notifications]
```

O con opciones específicas:

```php
[condo360_notifications show_dashboard="true" show_management="true"]
```

## Paso 3: Configuración de Producción (Nginx Proxy Manager)

### 3.1 Configurar proxy reverso

1. Acceder a Nginx Proxy Manager
2. Crear nuevo Proxy Host
3. Configurar:
   - **Domain Names**: `notifications.bonaventurecclub.com`
   - **Scheme**: `http`
   - **Forward Hostname/IP**: `localhost` (o IP del servidor)
   - **Forward Port**: `3001`
   - **Forward Path**: `/`

### 3.2 Configurar SSL

1. En la configuración del proxy host
2. Habilitar "Force SSL"
3. Configurar certificado SSL (Let's Encrypt recomendado)

### 3.3 Actualizar configuración de producción

Actualizar el archivo `.env` para producción:

```env
NODE_ENV=production
DB_HOST=tu_host_produccion
DB_USER=tu_usuario_produccion
DB_PASSWORD=tu_password_produccion
DB_NAME=tu_bd_produccion
```

## Paso 4: Verificación de la Instalación

### 4.1 Verificar API

Acceder a la documentación Swagger:
- Desarrollo: `http://localhost:3001/api-docs`
- Producción: `https://notifications.bonaventurecclub.com/api-docs`

### 4.2 Verificar endpoints

```bash
# Verificar endpoint principal
curl http://localhost:3001/

# Verificar notificaciones (debe devolver array vacío inicialmente)
curl http://localhost:3001/notificaciones

# Verificar dashboard
curl http://localhost:3001/notificaciones/dashboard
```

### 4.3 Verificar plugin de WordPress

1. Ir a cualquier página donde hayas agregado el shortcode
2. Verificar que aparezca la interfaz de gestión
3. Solo usuarios administradores deberían ver la interfaz

## Paso 5: Configuración Adicional

### 5.1 Configurar servicio systemd (Linux)

Crear archivo `/etc/systemd/system/condo360-notifications.service`:

```ini
[Unit]
Description=Condo360 Notifications API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/ruta/a/tu/proyecto
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activar el servicio:

```bash
sudo systemctl enable condo360-notifications
sudo systemctl start condo360-notifications
sudo systemctl status condo360-notifications
```

### 5.2 Configurar PM2 (Alternativa)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
pm2 start server.js --name "condo360-notifications"

# Configurar para inicio automático
pm2 startup
pm2 save
```

## Paso 6: Pruebas

### 6.1 Crear notificación de prueba

Usar la interfaz de WordPress o hacer petición directa:

```bash
curl -X POST http://localhost:3001/notificaciones \
  -H "Content-Type: application/json" \
  -H "X-User-ID: 1" \
  -d '{
    "titulo": "Notificación de prueba",
    "descripcion": "Esta es una notificación de prueba",
    "fecha_notificacion": "2024-01-15T10:00:00Z",
    "fecha_fin": "2024-01-20T18:00:00Z",
    "estado": true
  }'
```

### 6.2 Verificar en dashboard

Acceder al endpoint del dashboard para ver la notificación creada.

## Solución de Problemas

### Error de conexión a base de datos

1. Verificar credenciales en `.env`
2. Verificar que MySQL esté ejecutándose
3. Verificar que el usuario tenga permisos en la base de datos

### Error 403 en endpoints de administrador

1. Verificar que el usuario tenga rol de administrador en WordPress
2. Verificar que el header `X-User-ID` esté presente
3. Verificar que el ID del usuario sea válido

### Plugin de WordPress no aparece

1. Verificar que los archivos estén en la ubicación correcta
2. Verificar permisos de archivos (644 para archivos, 755 para directorios)
3. Verificar que no haya errores de PHP en los logs

### Notificaciones push no se envían

1. Verificar que `PUSH_NOTIFICATION_ENABLED=true` en `.env`
2. Verificar logs del servidor para errores
3. Verificar configuración de usuarios en `wp_notificaciones_user_settings`

## Mantenimiento

### Logs importantes

- Logs de conexión a base de datos
- Logs de envío de notificaciones
- Logs de tareas cron
- Logs de errores de validación

### Limpieza automática

El sistema limpia automáticamente:
- Notificaciones expiradas (cada hora)
- Logs antiguos (diariamente)
- Notificaciones pendientes (cada 5 minutos)

### Monitoreo recomendado

1. Monitorear uso de CPU y memoria del proceso Node.js
2. Monitorear conexiones a base de datos
3. Monitorear logs de errores
4. Verificar que las tareas cron se ejecuten correctamente

## Soporte

Para soporte técnico:
- Revisar logs del servidor
- Verificar configuración de variables de entorno
- Consultar documentación Swagger en `/api-docs`
- Contactar al equipo de desarrollo de Condo360
