const Database = require('./config/database');

async function testWhatsAppLogTable() {
    const database = new Database();
    
    try {
        await database.connect();
        console.log('🔗 Conectado a la base de datos');
        
        // Verificar si la tabla existe
        console.log('🔍 Verificando si la tabla wp_notification_whatsapp_log existe...');
        const [tables] = await database.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'wp_notification_whatsapp_log'
        `);
        
        if (tables.length === 0) {
            console.log('❌ La tabla wp_notification_whatsapp_log NO existe');
            console.log('📝 Creando la tabla...');
            
            await database.query(`
                CREATE TABLE IF NOT EXISTS wp_notification_whatsapp_log (
                    id int(11) NOT NULL AUTO_INCREMENT,
                    notification_id int(11) NOT NULL,
                    message text NOT NULL COMMENT 'Mensaje enviado a WhatsApp',
                    sent_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    KEY idx_notification_id (notification_id),
                    KEY idx_sent_at (sent_at),
                    KEY idx_created_at (created_at),
                    FOREIGN KEY (notification_id) REFERENCES wp_notificaciones(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            
            console.log('✅ Tabla wp_notification_whatsapp_log creada exitosamente');
        } else {
            console.log('✅ La tabla wp_notification_whatsapp_log existe');
        }
        
        // Verificar estructura de la tabla
        console.log('🔍 Verificando estructura de la tabla...');
        const [columns] = await database.query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'wp_notification_whatsapp_log'
            ORDER BY ORDINAL_POSITION
        `);
        
        console.log('📋 Estructura de la tabla:');
        columns.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
        });
        
        // Probar inserción
        console.log('🧪 Probando inserción en la tabla...');
        const testResult = await database.query(`
            INSERT INTO wp_notification_whatsapp_log (notification_id, message, sent_at, created_at)
            VALUES (?, ?, NOW(), NOW())
        `, [999, 'Mensaje de prueba']);
        
        console.log(`✅ Inserción exitosa. ID insertado: ${testResult.insertId}`);
        
        // Verificar que se insertó
        const [inserted] = await database.query(`
            SELECT * FROM wp_notification_whatsapp_log WHERE id = ?
        `, [testResult.insertId]);
        
        console.log('📄 Registro insertado:', inserted[0]);
        
        // Limpiar el registro de prueba
        await database.query('DELETE FROM wp_notification_whatsapp_log WHERE id = ?', [testResult.insertId]);
        console.log('🧹 Registro de prueba eliminado');
        
        // Verificar registros existentes
        const [existing] = await database.query(`
            SELECT COUNT(*) as total FROM wp_notification_whatsapp_log
        `);
        
        console.log(`📊 Total de registros en la tabla: ${existing[0].total}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await database.close();
    }
}

testWhatsAppLogTable();
