const database = require('./config/database');

async function testDatabase() {
    try {
        console.log('🔍 Probando conexión a la base de datos...');
        
        // Conectar
        await database.connect();
        console.log('✅ Conexión establecida');
        
        // Probar consulta simple
        console.log('🔍 Probando consulta simple...');
        const result = await database.query('SELECT 1 as test');
        console.log('✅ Consulta simple exitosa:', result);
        
        // Verificar si la tabla existe
        console.log('🔍 Verificando tabla wp_notificaciones...');
        const tableCheck = await database.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'wp_notificaciones'
        `);
        
        if (tableCheck[0].count > 0) {
            console.log('✅ Tabla wp_notificaciones existe');
            
            // Probar consulta en la tabla
            console.log('🔍 Probando consulta en wp_notificaciones...');
            const notifications = await database.query('SELECT COUNT(*) as total FROM wp_notificaciones');
            console.log('✅ Consulta en wp_notificaciones exitosa:', notifications[0]);
        } else {
            console.log('❌ Tabla wp_notificaciones no existe');
            console.log('💡 Ejecuta el archivo database.sql para crear las tablas');
        }
        
        // Cerrar conexión
        await database.close();
        console.log('✅ Prueba completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        process.exit(1);
    }
}

testDatabase();
