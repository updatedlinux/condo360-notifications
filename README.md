# README - API de Notificaciones Condo360

## Descripción

API RESTful desarrollada en Node.js para gestionar notificaciones push que se visualizarán en el frontend de WooCommerce. La API maneja correctamente las zonas horarias (UTC/GMT-4) y proporciona un sistema completo de notificaciones con integración a WordPress.

## Características Principales

- ✅ API RESTful completa con endpoints CRUD
- ✅ Manejo correcto de zonas horarias (UTC para almacenamiento, GMT-4 para visualización)
- ✅ Sistema de notificaciones push automáticas
- ✅ Validación de administradores de WordPress
- ✅ Documentación Swagger completa
- ✅ Shortcode de WordPress para gestión
- ✅ Desactivación automática de notificaciones expiradas
- ✅ Tareas cron para mantenimiento automático

## Estructura del Proyecto

```
condo360-notifications/
├── config/
│   └── database.js              # Configuración de base de datos
├── utils/
│   ├── timezone.js              # Utilidades de zona horaria
│   └── validation.js            # Esquemas de validación
├── services/
│   └── pushNotificationService.js # Servicio de notificaciones push
├── wordpress/
│   ├── condo360-notifications-manager.php # Plugin de WordPress
│   └── assets/
│       ├── style.css            # Estilos del plugin
│       └── script.js           # JavaScript del plugin
├── server.js                    # Servidor principal
├── package.json                 # Dependencias
├── database.sql                 # Estructura de tablas
└── env.example                  # Variables de entorno
```

## Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `env.example` a `.env` y configurar:

```bash
cp env.example .env
```

Editar `.env` con tus configuraciones:

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
API_SECRET_KEY=tu_clave_secreta_aqui
ADMIN_ROLES=administrator,editor

# Configuración de notificaciones push
PUSH_NOTIFICATION_ENABLED=true
```

### 3. Crear tablas en la base de datos

Ejecutar el archivo `database.sql` en tu base de datos de WordPress:

```bash
mysql -u tu_usuario -p tu_base_de_datos < database.sql
```

### 4. Instalar plugin de WordPress

1. Copiar la carpeta `wordpress/` a `/wp-content/plugins/condo360-notifications-manager/`
2. Activar el plugin desde el panel de administración de WordPress
3. Usar el shortcode `[condo360_notifications]` en cualquier página o post

## Uso

### Iniciar el servidor

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en:
- Desarrollo: `http://localhost:3001`
- Producción: `https://notifications.bonaventurecclub.com`

### Documentación API

La documentación Swagger estará disponible en:
- `http://localhost:3001/api-docs`

## Endpoints de la API

### Notificaciones

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| GET | `/notificaciones` | Listar todas las notificaciones | No |
| GET | `/notificaciones/dashboard` | Últimas 5 notificaciones activas | No |
| GET | `/notificaciones/:id` | Obtener notificación específica | No |
| POST | `/notificaciones` | Crear nueva notificación | Admin |
| PUT | `/notificaciones/:id` | Actualizar notificación | Admin |
| DELETE | `/notificaciones/:id` | Eliminar notificación | Admin |
| GET | `/notificaciones/estado/:id` | Estado actual de notificación | No |

### Parámetros de consulta

- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 100)

### Headers requeridos para administradores

```
X-User-ID: [ID del usuario de WordPress]
```

## Estructura de datos

### Notificación

```json
{
  "id": 1,
  "titulo": "Mantenimiento programado",
  "descripcion": "Se realizará mantenimiento del sistema el próximo viernes",
  "fecha_notificacion": "2024-01-15T10:00:00Z",
  "fecha_fin": "2024-01-20T18:00:00Z",
  "estado": true,
  "created_at": "2024-01-10T08:00:00Z",
  "updated_at": "2024-01-10T08:00:00Z",
  "fecha_notificacion_local": "2024-01-15 06:00:00",
  "fecha_fin_local": "2024-01-20 14:00:00",
  "created_at_local": "2024-01-10 04:00:00",
  "updated_at_local": "2024-01-10 04:00:00"
}
```

### Respuesta del dashboard

```json
{
  "success": true,
  "message": "Notificaciones del dashboard obtenidas exitosamente",
  "data": [
    {
      "id": 1,
      "titulo": "Mantenimiento programado",
      "descripcion": "Se realizará mantenimiento del sistema",
      "tiempo_transcurrido": {
        "valor": 2,
        "unidad": "días",
        "texto_completo": "2 días"
      }
    }
  ]
}
```

## Sistema de Notificaciones Push

### Características

- Envío automático cuando una notificación se activa
- Procesamiento de notificaciones pendientes cada 5 minutos
- Logging completo de envíos
- Configuración por usuario (push/email)
- Limpieza automática de logs antiguos

### Configuración de usuario

Los usuarios pueden configurar sus preferencias de notificación:

```sql
INSERT INTO wp_notificaciones_user_settings (user_id, push_enabled, email_enabled)
VALUES (1, 1, 1);
```

## Tareas Automáticas

### Cron Jobs

1. **Cada hora**: Desactiva notificaciones expiradas
2. **Cada 5 minutos**: Procesa notificaciones pendientes
3. **Diariamente a las 2 AM**: Limpia logs antiguos (30 días)

## Shortcode de WordPress

### Uso básico

```php
[condo360_notifications]
```

### Opciones

```php
[condo360_notifications show_dashboard="true" show_management="true"]
```

### Parámetros

- `show_dashboard`: Mostrar notificaciones activas (default: true)
- `show_management`: Mostrar panel de gestión (default: true)

## Seguridad

- Validación de permisos de administrador
- Rate limiting (100 requests/15min por IP)
- CORS configurado para acceso libre
- Sanitización de datos de entrada
- Validación con Joi

## Manejo de Zonas Horarias

- **Almacenamiento**: Todas las fechas se guardan en UTC
- **Visualización**: Se convierten a GMT-4 (America/Caracas)
- **Procesamiento**: Se considera la zona horaria local para lógica de negocio

## Monitoreo y Logs

### Logs importantes

- Conexión a base de datos
- Envío de notificaciones push
- Errores de validación
- Tareas cron ejecutadas

### Métricas disponibles

- Notificaciones enviadas/fallidas
- Usuarios activos
- Estadísticas de envío por notificación

## Desarrollo

### Estructura de archivos

- `config/`: Configuraciones del sistema
- `utils/`: Utilidades y helpers
- `services/`: Lógica de negocio
- `wordpress/`: Plugin de WordPress

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Despliegue

### Con Nginx Proxy Manager

1. Configurar proxy reverso hacia puerto 3001
2. Configurar SSL
3. Configurar dominio: `notifications.bonaventurecclub.com`

### Variables de entorno de producción

```env
NODE_ENV=production
DB_HOST=tu_host_produccion
DB_USER=tu_usuario_produccion
DB_PASSWORD=tu_password_produccion
DB_NAME=tu_bd_produccion
```

## Soporte

Para soporte técnico o consultas sobre la implementación, contactar al equipo de desarrollo de Condo360.

## Licencia

MIT License - Ver archivo LICENSE para más detalles.
