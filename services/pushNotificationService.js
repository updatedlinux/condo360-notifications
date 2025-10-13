const database = require('../config/database');
const timezoneHelper = require('../utils/timezone');

class PushNotificationService {
    constructor() {
        this.isEnabled = process.env.PUSH_NOTIFICATION_ENABLED === 'true';
    }

    // Enviar notificación push a todos los usuarios activos
    async sendNotificationToAllUsers(notificationId) {
        if (!this.isEnabled) {
            console.log('🔕 Notificaciones push deshabilitadas');
            return;
        }

        try {
            // Obtener la notificación
            const notification = await database.checkNotificationStatus(notificationId);
            if (!notification) {
                throw new Error('Notificación no encontrada');
            }

            // Obtener usuarios activos con notificaciones habilitadas
            const users = await this.getActiveUsers();
            
            if (users.length === 0) {
                console.log('ℹ️ No hay usuarios activos para enviar notificaciones');
                return;
            }

            console.log(`📤 Enviando notificación a ${users.length} usuarios...`);

            // Enviar notificaciones en lotes
            const batchSize = 100;
            for (let i = 0; i < users.length; i += batchSize) {
                const batch = users.slice(i, i + batchSize);
                await this.sendBatchNotifications(notification, batch);
            }

            console.log(`✅ Notificación enviada exitosamente a ${users.length} usuarios`);

        } catch (error) {
            console.error('❌ Error al enviar notificación push:', error);
            throw error;
        }
    }

    // Obtener usuarios activos con notificaciones habilitadas
    async getActiveUsers() {
        const sql = `
            SELECT 
                u.ID as user_id,
                u.user_email,
                u.display_name,
                u.user_login,
                COALESCE(settings.push_enabled, 1) as push_enabled,
                COALESCE(settings.email_enabled, 1) as email_enabled
            FROM wp_users u
            LEFT JOIN wp_notificaciones_user_settings settings ON u.ID = settings.user_id
            WHERE u.user_status = 0
            AND (settings.push_enabled IS NULL OR settings.push_enabled = 1)
            ORDER BY u.ID
        `;

        return await database.query(sql);
    }

    // Enviar notificaciones en lotes
    async sendBatchNotifications(notification, users) {
        const promises = users.map(user => this.sendToUser(notification, user));
        await Promise.allSettled(promises);
    }

    // Enviar notificación a un usuario específico
    async sendToUser(notification, user) {
        try {
            // Registrar intento de envío
            const logId = await this.logNotificationAttempt(notification.id, user.user_id);

            // Enviar notificación push (implementar según el servicio que uses)
            const pushResult = await this.sendPushNotification(notification, user);
            
            // Enviar email si está habilitado
            if (user.email_enabled) {
                await this.sendEmailNotification(notification, user);
            }

            // Marcar como enviado
            await this.markNotificationAsSent(logId, pushResult.success);

            return pushResult;

        } catch (error) {
            console.error(`❌ Error al enviar notificación al usuario ${user.user_id}:`, error);
            await this.markNotificationAsFailed(logId, error.message);
            throw error;
        }
    }

    // Enviar notificación push (implementar según tu servicio)
    async sendPushNotification(notification, user) {
        // Aquí implementarías el envío real usando servicios como:
        // - Firebase Cloud Messaging (FCM)
        // - OneSignal
        // - Pusher
        // - Web Push API
        
        // Por ahora, simulamos el envío
        console.log(`📱 Enviando push a usuario ${user.user_id}: ${notification.titulo}`);
        
        // Simular éxito/fallo aleatorio para testing
        const success = Math.random() > 0.1; // 90% de éxito
        
        return {
            success,
            messageId: success ? `msg_${Date.now()}_${user.user_id}` : null,
            error: success ? null : 'Error simulado de envío'
        };
    }

    // Enviar notificación por email
    async sendEmailNotification(notification, user) {
        try {
            // Aquí implementarías el envío de email usando:
            // - WordPress wp_mail()
            // - SendGrid
            // - Mailgun
            // - Amazon SES
            
            console.log(`📧 Enviando email a ${user.user_email}: ${notification.titulo}`);
            
            // Por ahora, solo logueamos
            return { success: true };
            
        } catch (error) {
            console.error(`❌ Error al enviar email a ${user.user_email}:`, error);
            throw error;
        }
    }

    // Registrar intento de envío
    async logNotificationAttempt(notificationId, userId) {
        const sql = `
            INSERT INTO wp_notificaciones_push_log (notificacion_id, user_id, status)
            VALUES (?, ?, 'pending')
        `;
        
        const result = await database.query(sql, [notificationId, userId]);
        return result.insertId;
    }

    // Marcar notificación como enviada
    async markNotificationAsSent(logId, success) {
        const sql = `
            UPDATE wp_notificaciones_push_log 
            SET status = ?, sent_at = NOW()
            WHERE id = ?
        `;
        
        const status = success ? 'sent' : 'failed';
        await database.query(sql, [status, logId]);
    }

    // Marcar notificación como fallida
    async markNotificationAsFailed(logId, errorMessage) {
        const sql = `
            UPDATE wp_notificaciones_push_log 
            SET status = 'failed', error_message = ?, sent_at = NOW()
            WHERE id = ?
        `;
        
        await database.query(sql, [errorMessage, logId]);
    }

    // Obtener estadísticas de envío
    async getNotificationStats(notificationId) {
        const sql = `
            SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
            FROM wp_notificaciones_push_log 
            WHERE notificacion_id = ?
        `;
        
        const result = await database.query(sql, [notificationId]);
        return result[0];
    }

    // Configurar preferencias de usuario
    async updateUserSettings(userId, settings) {
        const sql = `
            INSERT INTO wp_notificaciones_user_settings (user_id, push_enabled, email_enabled)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            push_enabled = VALUES(push_enabled),
            email_enabled = VALUES(email_enabled),
            updated_at = NOW()
        `;
        
        await database.query(sql, [
            userId,
            settings.push_enabled ? 1 : 0,
            settings.email_enabled ? 1 : 0
        ]);
    }

    // Obtener configuración de usuario
    async getUserSettings(userId) {
        const sql = `
            SELECT push_enabled, email_enabled
            FROM wp_notificaciones_user_settings
            WHERE user_id = ?
        `;
        
        const result = await database.query(sql, [userId]);
        return result[0] || { push_enabled: 1, email_enabled: 1 };
    }

    // Procesar notificaciones pendientes (para cron job)
    async processPendingNotifications() {
        try {
            console.log('🔄 Procesando notificaciones pendientes...');
            
            // Obtener notificaciones que deberían estar activas pero no se han enviado
            const sql = `
                SELECT n.id, n.titulo, n.descripcion, n.fecha_notificacion
                FROM wp_notificaciones n
                WHERE n.estado = 1
                AND NOW() >= n.fecha_notificacion
                AND NOW() <= n.fecha_fin
                AND n.id NOT IN (
                    SELECT DISTINCT notificacion_id 
                    FROM wp_notificaciones_push_log 
                    WHERE status IN ('sent', 'pending')
                )
            `;
            
            const pendingNotifications = await database.query(sql);
            
            for (const notification of pendingNotifications) {
                console.log(`📤 Procesando notificación pendiente: ${notification.titulo}`);
                await this.sendNotificationToAllUsers(notification.id);
            }
            
            console.log(`✅ Procesadas ${pendingNotifications.length} notificaciones pendientes`);
            
        } catch (error) {
            console.error('❌ Error al procesar notificaciones pendientes:', error);
        }
    }

    // Limpiar logs antiguos (para mantenimiento)
    async cleanupOldLogs(daysToKeep = 30) {
        try {
            const sql = `
                DELETE FROM wp_notificaciones_push_log 
                WHERE sent_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `;
            
            const result = await database.query(sql, [daysToKeep]);
            console.log(`🧹 Limpiados ${result.affectedRows} logs antiguos`);
            
        } catch (error) {
            console.error('❌ Error al limpiar logs antiguos:', error);
        }
    }
}

module.exports = new PushNotificationService();
