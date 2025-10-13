-- Estructura de tabla para notificaciones
-- Esta tabla debe crearse en la misma base de datos de WordPress

CREATE TABLE IF NOT EXISTS `wp_notificaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `fecha_notificacion` datetime NOT NULL COMMENT 'Fecha y hora en UTC cuando la notificación se activa',
  `fecha_fin` datetime NOT NULL COMMENT 'Fecha y hora en UTC cuando la notificación se desactiva',
  `estado` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=activa, 0=inactiva',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fecha_notificacion` (`fecha_notificacion`),
  KEY `idx_fecha_fin` (`fecha_fin`),
  KEY `idx_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para tracking de notificaciones push enviadas
CREATE TABLE IF NOT EXISTS `wp_notificaciones_push_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `notificacion_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'ID del usuario de WordPress que recibió la notificación',
  `sent_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('sent','failed','pending') NOT NULL DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notificacion_id` (`notificacion_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_sent_at` (`sent_at`),
  FOREIGN KEY (`notificacion_id`) REFERENCES `wp_notificaciones`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para configuración de notificaciones push por usuario
CREATE TABLE IF NOT EXISTS `wp_notificaciones_user_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `push_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `email_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_id` (`user_id`),
  FOREIGN KEY (`user_id`) REFERENCES `wp_users`(`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
