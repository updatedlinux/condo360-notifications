const Database = require('./config/database');

async function checkWhatsAppLogs() {
    const database = new Database();
    
    try {
        await database.connect();
        console.log('🔗 Conectado a la base de datos');
        
        // Verificar notificaciones activas
        console.log('🔍 Verificando notificaciones activas...');
        const [activeNotifications] = await database.query(`
            SELECT 
                id,
                titulo,
                descripcion,
                estado,
                CASE 
                    WHEN NOW() >= fecha_notificacion AND NOW() <= fecha_fin THEN 1
                    ELSE 0
                END as estado_actual,
                fecha_notificacion,
                fecha_fin
            FROM wp_notificaciones 
            WHERE estado = 1 
            AND NOW() >= fecha_notificacion 
            AND NOW() <= fecha_fin
            ORDER BY id DESC
        `);
        
        console.log(`📊 Notificaciones activas encontradas: ${activeNotifications.length}`);
        activeNotifications.forEach(n => {
            console.log(`  - ID: ${n.id}, Título: "${n.titulo}", Estado: ${n.estado}, Estado Actual: ${n.estado_actual}`);
        });
        
        // Verificar logs de WhatsApp
        console.log('\n🔍 Verificando logs de WhatsApp...');
        const [whatsappLogs] = await database.query(`
            SELECT 
                id,
                notification_id,
                message,
                sent_at,
                created_at
            FROM wp_notification_whatsapp_log 
            ORDER BY created_at DESC
        `);
        
        console.log(`📊 Logs de WhatsApp encontrados: ${whatsappLogs.length}`);
        whatsappLogs.forEach(log => {
            console.log(`  - ID: ${log.id}, Notification ID: ${log.notification_id}, Mensaje: "${log.message}", Enviado: ${log.sent_at}`);
        });
        
        // Verificar qué notificaciones activas NO tienen log
        console.log('\n🔍 Verificando notificaciones activas SIN log...');
        const [notificationsWithoutLog] = await database.query(`
            SELECT 
                n.id,
                n.titulo,
                n.descripcion,
                n.estado,
                CASE 
                    WHEN NOW() >= n.fecha_notificacion AND NOW() <= n.fecha_fin THEN 1
                    ELSE 0
                END as estado_actual
            FROM wp_notificaciones n
            WHERE n.estado = 1 
            AND NOW() >= n.fecha_notificacion 
            AND NOW() <= n.fecha_fin
            AND n.id NOT IN (
                SELECT COALESCE(w.notification_id, 0)
                FROM wp_notification_whatsapp_log w
                WHERE w.notification_id IS NOT NULL
            )
        `);
        
        console.log(`📊 Notificaciones activas SIN log: ${notificationsWithoutLog.length}`);
        notificationsWithoutLog.forEach(n => {
            console.log(`  - ID: ${n.id}, Título: "${n.titulo}", Estado: ${n.estado}, Estado Actual: ${n.estado_actual}`);
        });
        
        if (notificationsWithoutLog.length > 0) {
            console.log('\n⚠️  Estas notificaciones deberían enviar WhatsApp en el próximo cron job');
        } else {
            console.log('\n✅ Todas las notificaciones activas ya tienen log de WhatsApp');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await database.close();
    }
}

checkWhatsAppLogs();
