const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        this.connection = null;
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'wordpress',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4',
            timezone: 'Z' // UTC
        };
    }

    async connect() {
        try {
            this.connection = await mysql.createConnection(this.config);
            console.log('✅ Conexión a la base de datos establecida correctamente');
            return this.connection;
        } catch (error) {
            console.error('❌ Error al conectar con la base de datos:', error.message);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            if (!this.connection) {
                await this.connect();
            }
            
            // Log de consulta para debugging
            if (process.env.NODE_ENV === 'development') {
                console.log('🔍 SQL Query:', sql);
                console.log('🔍 Params:', params);
            }
            
            const [rows] = await this.connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('❌ Error en consulta SQL:', error.message);
            console.error('❌ SQL:', sql);
            console.error('❌ Params:', params);
            console.error('❌ Error completo:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            console.log('🔌 Conexión a la base de datos cerrada');
        }
    }

    // Método para verificar si una notificación está activa según fechas
    async checkNotificationStatus(id) {
        const sql = `
            SELECT 
                id,
                titulo,
                descripcion,
                fecha_notificacion,
                fecha_fin,
                estado,
                CASE 
                    WHEN NOW() >= fecha_notificacion AND NOW() <= fecha_fin THEN 1
                    ELSE 0
                END as estado_actual,
                created_at,
                updated_at
            FROM wp_notificaciones 
            WHERE id = ?
        `;
        
        const result = await this.query(sql, [id]);
        return result[0] || null;
    }

    // Método para obtener las últimas 5 notificaciones activas
    async getActiveNotificationsForDashboard() {
        const sql = `
            SELECT 
                id,
                titulo,
                descripcion,
                fecha_notificacion,
                fecha_fin,
                created_at,
                TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_desde_creacion,
                TIMESTAMPDIFF(HOUR, created_at, NOW()) as horas_desde_creacion,
                TIMESTAMPDIFF(DAY, created_at, NOW()) as dias_desde_creacion
            FROM wp_notificaciones 
            WHERE NOW() >= fecha_notificacion 
            AND NOW() <= fecha_fin 
            AND estado = 1
            ORDER BY fecha_notificacion DESC 
            LIMIT 5
        `;
        
        return await this.query(sql);
    }

    // Método para desactivar notificaciones expiradas
    async deactivateExpiredNotifications() {
        const sql = `
            UPDATE wp_notificaciones 
            SET estado = 0 
            WHERE NOW() > fecha_fin 
            AND estado = 1
        `;
        
        const result = await this.query(sql);
        return result.affectedRows;
    }

    // Método para verificar si un usuario es administrador
    async isUserAdmin(userId) {
        const sql = `
            SELECT u.ID, u.user_login, um.meta_value as capabilities
            FROM wp_users u
            LEFT JOIN wp_usermeta um ON u.ID = um.user_id 
            WHERE u.ID = ? 
            AND um.meta_key = 'wp_capabilities'
        `;
        
        const result = await this.query(sql, [userId]);
        if (result.length === 0) return false;
        
        const capabilities = result[0].capabilities;
        if (!capabilities) return false;
        
        // Verificar si tiene capacidades de administrador
        const caps = JSON.parse(capabilities);
        return caps.administrator === true || caps.editor === true;
    }
}

module.exports = new Database();
