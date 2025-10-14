const Database = require('./config/database');

async function clearWhatsAppLogs() {
    const database = new Database();
    
    try {
        await database.connect();
        console.log('🔗 Conectado a la base de datos');
        
        // Limpiar todos los logs de WhatsApp existentes
        const result = await database.query('DELETE FROM wp_notification_whatsapp_log');
        console.log(`✅ ${result.affectedRows} logs de WhatsApp eliminados`);
        
        console.log('🧹 Logs limpiados. El sistema ahora enviará WhatsApp solo una vez por notificación.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await database.close();
    }
}

clearWhatsAppLogs();
