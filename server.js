const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cron = require('node-cron');
const moment = require('moment-timezone');

const database = require('./config/database');
const timezoneHelper = require('./utils/timezone');
const { notificationSchemas, authSchemas, validateData } = require('./utils/validation');
const pushNotificationService = require('./services/pushNotificationService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-User-ID']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP cada 15 minutos
    message: {
        error: 'Demasiadas solicitudes desde esta IP, inténtalo de nuevo más tarde.',
        code: 'RATE_LIMIT_EXCEEDED'
    }
});
app.use(limiter);

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Configuración de Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Notificaciones Condo360',
            version: '1.0.0',
            description: 'API RESTful para gestión de notificaciones push en WooCommerce',
            contact: {
                name: 'Condo360',
                email: 'support@condo360.com'
            }
        },
        servers: [
            {
                url: 'https://notifications.bonaventurecclub.com',
                description: 'Servidor de producción'
            },
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                AdminHeader: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-User-ID',
                    description: 'ID del usuario administrador de WordPress'
                }
            },
            schemas: {
                Notificacion: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'ID único de la notificación'
                        },
                        titulo: {
                            type: 'string',
                            description: 'Título de la notificación',
                            maxLength: 255
                        },
                        descripcion: {
                            type: 'string',
                            description: 'Descripción de la notificación',
                            maxLength: 2000
                        },
                        fecha_notificacion: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Fecha y hora en UTC cuando la notificación se activa'
                        },
                        fecha_fin: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Fecha y hora en UTC cuando la notificación se desactiva'
                        },
                        estado: {
                            type: 'boolean',
                            description: 'Estado actual de la notificación'
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Fecha de creación en UTC'
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Fecha de última actualización en UTC'
                        }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Mensaje de error'
                        },
                        code: {
                            type: 'string',
                            description: 'Código de error'
                        },
                        details: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Detalles adicionales del error'
                        }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            description: 'Indica si la operación fue exitosa'
                        },
                        message: {
                            type: 'string',
                            description: 'Mensaje de éxito'
                        },
                        data: {
                            type: 'object',
                            description: 'Datos de respuesta'
                        }
                    }
                }
            }
        }
    },
    apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware para verificar administrador
const requireAdmin = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(401).json({
                error: 'ID de usuario requerido',
                code: 'USER_ID_REQUIRED'
            });
        }

        const validation = validateData(authSchemas.adminCheck, { user_id: parseInt(userId) });
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'ID de usuario inválido',
                code: 'INVALID_USER_ID',
                details: validation.errors
            });
        }

        const isAdmin = await database.isUserAdmin(validation.data.user_id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Acceso denegado. Se requieren permisos de administrador.',
                code: 'ADMIN_REQUIRED'
            });
        }

        req.userId = validation.data.user_id;
        next();
    } catch (error) {
        console.error('Error en middleware de administrador:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
};

// Rutas de la API
app.get('/', (req, res) => {
    res.json({
        message: 'API de Notificaciones Condo360',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: {
            notifications: '/notificaciones',
            dashboard: '/notificaciones/dashboard',
            status: '/notificaciones/estado/:id'
        }
    });
});

/**
 * @swagger
 * /notificaciones:
 *   get:
 *     summary: Obtener todas las notificaciones
 *     tags: [Notificaciones]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Número de elementos por página
 *     responses:
 *       200:
 *         description: Lista de notificaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notificacion'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
app.get('/notificaciones', async (req, res) => {
    try {
        const validation = validateData(notificationSchemas.pagination, req.query);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Parámetros de paginación inválidos',
                code: 'INVALID_PAGINATION',
                details: validation.errors
            });
        }

        const { page, limit } = validation.data;
        const offset = (page - 1) * limit;

        // Obtener notificaciones con paginación
        const notifications = await database.query(`
            SELECT 
                id,
                titulo,
                descripcion,
                fecha_notificacion,
                fecha_fin,
                estado,
                created_at,
                updated_at,
                CASE 
                    WHEN NOW() >= fecha_notificacion AND NOW() <= fecha_fin THEN 1
                    ELSE 0
                END as estado_actual
            FROM wp_notificaciones 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Contar total de notificaciones
        const [countResult] = await database.query('SELECT COUNT(*) as total FROM wp_notificaciones');
        const total = countResult.total;
        const pages = Math.ceil(total / limit);

        // Formatear fechas para mostrar en zona horaria local
        const formattedNotifications = notifications.map(notification => ({
            ...notification,
            fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
            fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin),
            created_at_local: timezoneHelper.formatForDisplay(notification.created_at),
            updated_at_local: timezoneHelper.formatForDisplay(notification.updated_at)
        }));

        res.json({
            success: true,
            message: 'Notificaciones obtenidas exitosamente',
            data: {
                notifications: formattedNotifications,
                pagination: {
                    page,
                    limit,
                    total,
                    pages
                }
            }
        });

    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones/dashboard:
 *   get:
 *     summary: Obtener las últimas 5 notificaciones activas para el dashboard
 *     tags: [Notificaciones]
 *     responses:
 *       200:
 *         description: Notificaciones activas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Notificacion'
 *                       - type: object
 *                         properties:
 *                           tiempo_transcurrido:
 *                             type: object
 *                             properties:
 *                               valor:
 *                                 type: integer
 *                               unidad:
 *                                 type: string
 *                               texto_completo:
 *                                 type: string
 */
app.get('/notificaciones/dashboard', async (req, res) => {
    try {
        const notifications = await database.getActiveNotificationsForDashboard();

        // Formatear notificaciones con tiempo transcurrido
        const formattedNotifications = notifications.map(notification => {
            const tiempoTranscurrido = timezoneHelper.getTimeElapsed(notification.created_at);
            
            return {
                id: notification.id,
                titulo: notification.titulo,
                descripcion: notification.descripcion,
                fecha_notificacion: notification.fecha_notificacion,
                fecha_fin: notification.fecha_fin,
                fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
                fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin),
                created_at: notification.created_at,
                created_at_local: timezoneHelper.formatForDisplay(notification.created_at),
                tiempo_transcurrido: tiempoTranscurrido
            };
        });

        res.json({
            success: true,
            message: 'Notificaciones del dashboard obtenidas exitosamente',
            data: formattedNotifications
        });

    } catch (error) {
        console.error('Error al obtener notificaciones del dashboard:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones/{id}:
 *   get:
 *     summary: Obtener una notificación específica
 *     tags: [Notificaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Notificacion'
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/notificaciones/:id', async (req, res) => {
    try {
        const validation = validateData(notificationSchemas.id, req.params);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'ID de notificación inválido',
                code: 'INVALID_NOTIFICATION_ID',
                details: validation.errors
            });
        }

        const notification = await database.checkNotificationStatus(validation.data.id);
        
        if (!notification) {
            return res.status(404).json({
                error: 'Notificación no encontrada',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        // Formatear fechas para mostrar en zona horaria local
        const formattedNotification = {
            ...notification,
            fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
            fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin),
            created_at_local: timezoneHelper.formatForDisplay(notification.created_at),
            updated_at_local: timezoneHelper.formatForDisplay(notification.updated_at)
        };

        res.json({
            success: true,
            message: 'Notificación obtenida exitosamente',
            data: formattedNotification
        });

    } catch (error) {
        console.error('Error al obtener notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones:
 *   post:
 *     summary: Crear una nueva notificación
 *     tags: [Notificaciones]
 *     security:
 *       - AdminHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - descripcion
 *               - fecha_notificacion
 *               - fecha_fin
 *             properties:
 *               titulo:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Mantenimiento programado"
 *               descripcion:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Se realizará mantenimiento del sistema el próximo viernes"
 *               fecha_notificacion:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-15T10:00:00Z"
 *               fecha_fin:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-01-20T18:00:00Z"
 *               estado:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Notificación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Notificacion'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Acceso denegado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.post('/notificaciones', requireAdmin, async (req, res) => {
    try {
        const validation = validateData(notificationSchemas.create, req.body);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'Datos de entrada inválidos',
                code: 'INVALID_INPUT_DATA',
                details: validation.errors
            });
        }

        const { titulo, descripcion, fecha_notificacion, fecha_fin, estado } = validation.data;

        // Validar fechas
        if (!timezoneHelper.validateDateRange(fecha_notificacion, fecha_fin)) {
            return res.status(400).json({
                error: 'La fecha de fin debe ser posterior a la fecha de notificación',
                code: 'INVALID_DATE_RANGE'
            });
        }

        // Convertir fechas a UTC para almacenamiento
        const fechaNotificacionUtc = timezoneHelper.formatForStorage(fecha_notificacion);
        const fechaFinUtc = timezoneHelper.formatForStorage(fecha_fin);

        // Insertar notificación
        const result = await database.query(`
            INSERT INTO wp_notificaciones (titulo, descripcion, fecha_notificacion, fecha_fin, estado)
            VALUES (?, ?, ?, ?, ?)
        `, [titulo, descripcion, fechaNotificacionUtc, fechaFinUtc, estado]);

        // Obtener la notificación creada
        const [newNotification] = await database.query(`
            SELECT * FROM wp_notificaciones WHERE id = ?
        `, [result.insertId]);

        // Formatear fechas para mostrar en zona horaria local
        const formattedNotification = {
            ...newNotification,
            fecha_notificacion_local: timezoneHelper.formatForDisplay(newNotification.fecha_notificacion),
            fecha_fin_local: timezoneHelper.formatForDisplay(newNotification.fecha_fin),
            created_at_local: timezoneHelper.formatForDisplay(newNotification.created_at),
            updated_at_local: timezoneHelper.formatForDisplay(newNotification.updated_at)
        };

        // Enviar notificación push si está activa inmediatamente
        if (estado && timezoneHelper.getCurrentUtc().isAfter(moment.utc(fechaNotificacionUtc))) {
            pushNotificationService.sendNotificationToAllUsers(result.insertId)
                .catch(error => console.error('Error al enviar notificación push:', error));
        }

        res.status(201).json({
            success: true,
            message: 'Notificación creada exitosamente',
            data: formattedNotification
        });

    } catch (error) {
        console.error('Error al crear notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones/{id}:
 *   put:
 *     summary: Actualizar una notificación existente
 *     tags: [Notificaciones]
 *     security:
 *       - AdminHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la notificación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *                 maxLength: 255
 *               descripcion:
 *                 type: string
 *                 maxLength: 2000
 *               fecha_notificacion:
 *                 type: string
 *                 format: date-time
 *               fecha_fin:
 *                 type: string
 *                 format: date-time
 *               estado:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notificación actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Notificacion'
 *       400:
 *         description: Datos de entrada inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.put('/notificaciones/:id', requireAdmin, async (req, res) => {
    try {
        const idValidation = validateData(notificationSchemas.id, req.params);
        if (!idValidation.isValid) {
            return res.status(400).json({
                error: 'ID de notificación inválido',
                code: 'INVALID_NOTIFICATION_ID',
                details: idValidation.errors
            });
        }

        const updateValidation = validateData(notificationSchemas.update, req.body);
        if (!updateValidation.isValid) {
            return res.status(400).json({
                error: 'Datos de entrada inválidos',
                code: 'INVALID_INPUT_DATA',
                details: updateValidation.errors
            });
        }

        // Verificar que la notificación existe
        const existingNotification = await database.checkNotificationStatus(idValidation.data.id);
        if (!existingNotification) {
            return res.status(404).json({
                error: 'Notificación no encontrada',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        const updateData = updateValidation.data;
        const updateFields = [];
        const updateValues = [];

        // Construir query dinámicamente
        if (updateData.titulo !== undefined) {
            updateFields.push('titulo = ?');
            updateValues.push(updateData.titulo);
        }
        if (updateData.descripcion !== undefined) {
            updateFields.push('descripcion = ?');
            updateValues.push(updateData.descripcion);
        }
        if (updateData.fecha_notificacion !== undefined) {
            updateFields.push('fecha_notificacion = ?');
            updateValues.push(timezoneHelper.formatForStorage(updateData.fecha_notificacion));
        }
        if (updateData.fecha_fin !== undefined) {
            updateFields.push('fecha_fin = ?');
            updateValues.push(timezoneHelper.formatForStorage(updateData.fecha_fin));
        }
        if (updateData.estado !== undefined) {
            updateFields.push('estado = ?');
            updateValues.push(updateData.estado);
        }

        updateValues.push(idValidation.data.id);

        // Actualizar notificación
        await database.query(`
            UPDATE wp_notificaciones 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        // Obtener la notificación actualizada
        const updatedNotification = await database.checkNotificationStatus(idValidation.data.id);

        // Formatear fechas para mostrar en zona horaria local
        const formattedNotification = {
            ...updatedNotification,
            fecha_notificacion_local: timezoneHelper.formatForDisplay(updatedNotification.fecha_notificacion),
            fecha_fin_local: timezoneHelper.formatForDisplay(updatedNotification.fecha_fin),
            created_at_local: timezoneHelper.formatForDisplay(updatedNotification.created_at),
            updated_at_local: timezoneHelper.formatForDisplay(updatedNotification.updated_at)
        };

        res.json({
            success: true,
            message: 'Notificación actualizada exitosamente',
            data: formattedNotification
        });

    } catch (error) {
        console.error('Error al actualizar notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones/{id}:
 *   delete:
 *     summary: Eliminar una notificación
 *     tags: [Notificaciones]
 *     security:
 *       - AdminHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.delete('/notificaciones/:id', requireAdmin, async (req, res) => {
    try {
        const validation = validateData(notificationSchemas.id, req.params);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'ID de notificación inválido',
                code: 'INVALID_NOTIFICATION_ID',
                details: validation.errors
            });
        }

        // Verificar que la notificación existe
        const existingNotification = await database.checkNotificationStatus(validation.data.id);
        if (!existingNotification) {
            return res.status(404).json({
                error: 'Notificación no encontrada',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        // Eliminar notificación
        await database.query('DELETE FROM wp_notificaciones WHERE id = ?', [validation.data.id]);

        res.json({
            success: true,
            message: 'Notificación eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

/**
 * @swagger
 * /notificaciones/estado/{id}:
 *   get:
 *     summary: Obtener el estado actual de una notificación
 *     tags: [Notificaciones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Estado de la notificación obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     estado_actual:
 *                       type: boolean
 *                     estado_bd:
 *                       type: boolean
 *                     fecha_actual:
 *                       type: string
 *                       format: date-time
 *                     fecha_notificacion:
 *                       type: string
 *                       format: date-time
 *                     fecha_fin:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Notificación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/notificaciones/estado/:id', async (req, res) => {
    try {
        const validation = validateData(notificationSchemas.id, req.params);
        if (!validation.isValid) {
            return res.status(400).json({
                error: 'ID de notificación inválido',
                code: 'INVALID_NOTIFICATION_ID',
                details: validation.errors
            });
        }

        const notification = await database.checkNotificationStatus(validation.data.id);
        
        if (!notification) {
            return res.status(404).json({
                error: 'Notificación no encontrada',
                code: 'NOTIFICATION_NOT_FOUND'
            });
        }

        const currentTime = timezoneHelper.getCurrentUtc().format('YYYY-MM-DD HH:mm:ss');

        res.json({
            success: true,
            message: 'Estado de la notificación obtenido exitosamente',
            data: {
                id: notification.id,
                estado_actual: notification.estado_actual === 1,
                estado_bd: notification.estado === 1,
                fecha_actual: currentTime,
                fecha_actual_local: timezoneHelper.getCurrentLocal().format('YYYY-MM-DD HH:mm:ss'),
                fecha_notificacion: notification.fecha_notificacion,
                fecha_notificacion_local: timezoneHelper.formatForDisplay(notification.fecha_notificacion),
                fecha_fin: notification.fecha_fin,
                fecha_fin_local: timezoneHelper.formatForDisplay(notification.fecha_fin)
            }
        });

    } catch (error) {
        console.error('Error al obtener estado de notificación:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            code: 'INTERNAL_SERVER_ERROR'
        });
    }
});

// Tarea cron para desactivar notificaciones expiradas cada hora
cron.schedule('0 * * * *', async () => {
    try {
        console.log('🔄 Ejecutando tarea de limpieza de notificaciones expiradas...');
        const deactivatedCount = await database.deactivateExpiredNotifications();
        if (deactivatedCount > 0) {
            console.log(`✅ ${deactivatedCount} notificaciones expiradas desactivadas`);
        } else {
            console.log('ℹ️ No hay notificaciones expiradas para desactivar');
        }
    } catch (error) {
        console.error('❌ Error en tarea de limpieza:', error);
    }
});

// Tarea cron para procesar notificaciones pendientes cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
    try {
        await pushNotificationService.processPendingNotifications();
    } catch (error) {
        console.error('❌ Error al procesar notificaciones pendientes:', error);
    }
});

// Tarea cron para limpiar logs antiguos diariamente a las 2 AM
cron.schedule('0 2 * * *', async () => {
    try {
        await pushNotificationService.cleanupOldLogs(30);
    } catch (error) {
        console.error('❌ Error al limpiar logs antiguos:', error);
    }
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        code: 'ROUTE_NOT_FOUND',
        message: `La ruta ${req.method} ${req.originalUrl} no existe`
    });
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
    });
});

// Inicializar servidor
const startServer = async () => {
    try {
        // Conectar a la base de datos
        await database.connect();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
            console.log(`📚 Documentación disponible en: http://localhost:${PORT}/api-docs`);
            console.log(`🌍 Zona horaria configurada: ${process.env.TIMEZONE_LOCAL || 'America/Caracas'}`);
        });
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de señales para cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await database.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await database.close();
    process.exit(0);
});

startServer();

module.exports = app;
