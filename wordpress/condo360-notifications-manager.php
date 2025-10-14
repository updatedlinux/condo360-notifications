<?php
/**
 * Plugin Name: Condo360 Notifications Manager
 * Description: Shortcode para gestionar notificaciones push desde WordPress
 * Version: 1.0.0
 * Author: Condo360
 */

// Prevenir acceso directo
if (!defined('ABSPATH')) {
    exit;
}

class Condo360NotificationsManager {
    
    private $api_url;
    private $api_timeout;
    
    public function __construct() {
        $this->api_url = 'https://notifications.bonaventurecclub.com';
        $this->api_timeout = 30;
        
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_ajax_condo360_notifications_action', array($this, 'handle_ajax_request'));
        add_action('wp_ajax_nopriv_condo360_notifications_action', array($this, 'handle_ajax_request'));
        add_action('wp_ajax_condo360_get_nonce', array($this, 'get_new_nonce'));
    }
    
    public function init() {
        add_shortcode('condo360_notifications', array($this, 'render_notifications_shortcode'));
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('jquery');
        wp_enqueue_style('condo360-notifications-style', plugin_dir_url(__FILE__) . 'assets/style.css', array(), '1.0.0');
        wp_enqueue_script('condo360-notifications-script', plugin_dir_url(__FILE__) . 'assets/script.js', array('jquery'), '1.0.0', true);
    }
    
    public function render_notifications_shortcode($atts) {
        // Solo mostrar a administradores
        if (!current_user_can('administrator') && !current_user_can('editor')) {
            return '<div class="condo360-notifications-error">Acceso denegado. Se requieren permisos de administrador.</div>';
        }
        
        // Asegurar que los scripts estén cargados
        $this->enqueue_scripts();
        
        // Obtener datos del usuario
        $user_id = get_current_user_id();
        $is_logged_in = is_user_logged_in();
        $current_user = wp_get_current_user();
        
        // Crear script inline con variables de usuario
        $ajax_data = array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('condo360_notifications_nonce'),
            'nonce_backup' => wp_create_nonce('condo360_notifications_nonce_' . $user_id),
            'user_id' => $user_id,
            'is_logged_in' => $is_logged_in,
            'is_admin' => current_user_can('administrator') || current_user_can('editor'),
            'api_url' => $this->api_url,
            'debug' => array(
                'user_roles' => $current_user->roles,
                'user_caps' => $current_user->allcaps,
                'current_user_can_admin' => current_user_can('administrator'),
                'current_user_can_editor' => current_user_can('editor'),
                'wp_get_current_user' => $current_user,
                'is_user_logged_in' => $is_logged_in,
                'user_id_raw' => $user_id,
                'user_login' => $current_user->user_login,
                'user_email' => $current_user->user_email
            )
        );
        
        // Script inline para definir variables con nombre único
        $script_data = json_encode($ajax_data);
        $inline_script = "window.condo360_notifications_data = {$script_data}; console.log('🔍 Script inline ejecutado:', window.condo360_notifications_data);";
        
        $atts = shortcode_atts(array(
            'show_dashboard' => 'true',
            'show_management' => 'true'
        ), $atts);
        
        ob_start();
        ?>
        <!-- Script inline con variables de usuario -->
        <script type="text/javascript">
            <?php echo $inline_script; ?>
        </script>
        
        <div class="condo360-notifications-container">
            <!-- Estado de conexión WhatsApp -->
            <div class="condo360-whatsapp-status">
                <div class="whatsapp-status-container">
                    <h3>Conexión con WhatsApp</h3>
                    <div id="whatsapp-status-content">
                        <div class="status-loading">
                            <i class="icon-loading"></i> Verificando conexión...
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="condo360-notifications-header">
                <div class="condo360-notifications-actions">
                    <button type="button" class="btn btn-primary" data-action="create">
                        <i class="icon-plus"></i> Nueva Notificación
                    </button>
                    <button type="button" class="btn btn-secondary" data-action="refresh">
                        <i class="icon-refresh"></i> Actualizar
                    </button>
                </div>
            </div>
            
            <?php if ($atts['show_dashboard'] === 'true'): ?>
            <div class="condo360-notifications-dashboard">
                <h3>Notificaciones Activas</h3>
                <div id="condo360-dashboard-notifications" class="dashboard-notifications">
                    <div class="loading">Cargando notificaciones...</div>
                </div>
            </div>
            <?php endif; ?>
            
            <?php if ($atts['show_management'] === 'true'): ?>
            <div class="condo360-notifications-management">
                <h3>Gestión de Notificaciones</h3>
                <div class="notifications-filters">
                    <input type="text" id="search-notifications" placeholder="Buscar notificaciones..." class="form-control">
                    <select id="status-filter" class="form-control">
                        <option value="">Todas</option>
                        <option value="active">Activas</option>
                        <option value="inactive">Inactivas</option>
                    </select>
                </div>
                <div id="condo360-notifications-list" class="notifications-list">
                    <div class="loading">Cargando lista de notificaciones...</div>
                </div>
                <div class="pagination-container">
                    <div id="condo360-pagination"></div>
                </div>
            </div>
            <?php endif; ?>
        </div>
        
        <!-- Modal para crear/editar notificación -->
        <div id="condo360-notification-modal" class="condo360-modal" style="display: none;">
            <div class="condo360-modal-content">
                <div class="condo360-modal-header">
                    <h3 id="condo360-modal-title">Nueva Notificación</h3>
                    <span class="condo360-close">&times;</span>
                </div>
                <div class="condo360-modal-body">
                    <form id="condo360-notification-form">
                        <input type="hidden" id="condo360-notification-id" name="id">
                        
                        <div class="form-group">
                            <label for="condo360-titulo">Título *</label>
                            <input type="text" id="condo360-titulo" name="titulo" class="form-control" required maxlength="255">
                            <div class="error-message" id="condo360-titulo-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="condo360-descripcion">Descripción *</label>
                            <textarea id="condo360-descripcion" name="descripcion" class="form-control" rows="4" required maxlength="2000"></textarea>
                            <div class="error-message" id="condo360-descripcion-error"></div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="condo360-fecha_notificacion">Fecha de Inicio *</label>
                                <input type="datetime-local" id="condo360-fecha_notificacion" name="fecha_notificacion" class="form-control" required>
                                <div class="error-message" id="condo360-fecha_notificacion-error"></div>
                            </div>
                            
                            <div class="form-group">
                                <label for="condo360-fecha_fin">Fecha de Fin *</label>
                                <input type="datetime-local" id="condo360-fecha_fin" name="fecha_fin" class="form-control" required>
                                <div class="error-message" id="condo360-fecha_fin-error"></div>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="condo360-estado" name="estado" checked>
                                <span class="checkmark"></span>
                                Notificación activa
                            </label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
                            <button type="submit" class="btn btn-primary">
                                <span class="btn-text">Guardar</span>
                                <span class="btn-loading" style="display: none;">Guardando...</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Modal de confirmación -->
        <div id="condo360-confirm-modal" class="condo360-modal" style="display: none;">
            <div class="condo360-modal-content">
                <div class="condo360-modal-header">
                    <h3>Confirmar Acción</h3>
                </div>
                <div class="condo360-modal-body">
                    <p id="condo360-confirm-message">¿Estás seguro de que deseas realizar esta acción?</p>
                </div>
                <div class="condo360-modal-footer">
                    <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
                    <button type="button" class="btn btn-danger" id="condo360-confirm-action">Confirmar</button>
                </div>
            </div>
        </div>
        
        <!-- Modal de detalles de notificación -->
        <div id="condo360-details-modal" class="condo360-modal" style="display: none;">
            <div class="condo360-modal-content condo360-details-modal-content">
                <div class="condo360-modal-header">
                    <h3 id="condo360-details-title">Detalles de la Notificación</h3>
                    <button type="button" class="condo360-close" data-action="close-details">&times;</button>
                </div>
                <div class="condo360-modal-body">
                    <div id="condo360-details-content"></div>
                </div>
                <div class="condo360-modal-footer">
                    <button type="button" class="btn btn-primary" data-action="close-details">Cerrar</button>
                </div>
            </div>
        </div>
        
        <!-- Toast para mensajes -->
        <div id="condo360-toast" class="toast"></div>
        <?php
        return ob_get_clean();
    }
    
    public function handle_ajax_request() {
        // Debugging
        error_log('Condo360 AJAX Request - User ID: ' . get_current_user_id());
        error_log('Condo360 AJAX Request - POST data: ' . print_r($_POST, true));
        
        // Verificar nonce con solución robusta
        if (!isset($_POST['nonce'])) {
            error_log('Condo360 AJAX Request - No nonce provided');
            wp_send_json_error('Acceso no autorizado - No se proporcionó nonce');
        }
        
        $nonce = sanitize_text_field($_POST['nonce']);
        
        // Verificar nonce con múltiples métodos
        $nonce_valid = wp_verify_nonce($nonce, 'condo360_notifications_nonce');
        
        // Si falla, intentar con nonce de sesión (para casos de caché)
        if (!$nonce_valid && isset($_COOKIE[LOGGED_IN_COOKIE])) {
            $nonce_valid = wp_verify_nonce($nonce, 'condo360_notifications_nonce_' . get_current_user_id());
        }
        
        error_log('Condo360 AJAX Request - Nonce received: ' . $nonce);
        error_log('Condo360 AJAX Request - Nonce valid: ' . ($nonce_valid ? 'true' : 'false'));
        
        if (!$nonce_valid) {
            error_log('Condo360 AJAX Request - Nonce verification failed');
            wp_send_json_error('Acceso no autorizado - Nonce inválido. Recarga la página e intenta de nuevo.');
        }
        
        // Verificar permisos
        if (!current_user_can('administrator') && !current_user_can('editor')) {
            error_log('Condo360 AJAX Request - Insufficient permissions for user: ' . get_current_user_id());
            wp_send_json_error('Permisos insuficientes - Se requiere rol de administrador');
        }
        
        $action = sanitize_text_field($_POST['action_type']);
        $user_id = get_current_user_id();
        
        switch ($action) {
            case 'get_notifications':
                $this->get_notifications();
                break;
            case 'get_dashboard':
                $this->get_dashboard_notifications();
                break;
            case 'create_notification':
                $this->create_notification($user_id);
                break;
            case 'update_notification':
                $this->update_notification($user_id);
                break;
            case 'delete_notification':
                $this->delete_notification($user_id);
                break;
            case 'get_notification_status':
                $this->get_notification_status();
                break;
            default:
                wp_send_json_error('Acción no válida');
        }
    }
    
    private function make_api_request($endpoint, $method = 'GET', $data = null, $user_id = null) {
        $url = $this->api_url . $endpoint;
        
        $args = array(
            'method' => $method,
            'timeout' => $this->api_timeout,
            'headers' => array(
                'Content-Type' => 'application/json',
            )
        );
        
        if ($user_id) {
            $args['headers']['X-User-ID'] = $user_id;
        }
        
        if ($data && in_array($method, array('POST', 'PUT'))) {
            $args['body'] = json_encode($data);
        }
        
        $response = wp_remote_request($url, $args);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'error' => $response->get_error_message()
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $status_code = wp_remote_retrieve_response_code($response);
        
        return array(
            'success' => $status_code >= 200 && $status_code < 300,
            'status_code' => $status_code,
            'data' => json_decode($body, true)
        );
    }
    
    private function get_notifications() {
        $page = isset($_POST['page']) ? intval($_POST['page']) : 1;
        $limit = isset($_POST['limit']) ? intval($_POST['limit']) : 10;
        
        $response = $this->make_api_request("/notificaciones?page={$page}&limit={$limit}");
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al obtener notificaciones'));
        }
    }
    
    private function get_dashboard_notifications() {
        $response = $this->make_api_request('/notificaciones/dashboard');
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al obtener notificaciones del dashboard'));
        }
    }
    
    private function create_notification($user_id) {
        $data = array(
            'titulo' => sanitize_text_field($_POST['titulo']),
            'descripcion' => sanitize_textarea_field($_POST['descripcion']),
            'fecha_notificacion' => sanitize_text_field($_POST['fecha_notificacion']),
            'fecha_fin' => sanitize_text_field($_POST['fecha_fin']),
            'estado' => isset($_POST['estado']) ? true : false
        );
        
        $response = $this->make_api_request('/notificaciones', 'POST', $data, $user_id);
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al crear notificación'));
        }
    }
    
    private function update_notification($user_id) {
        $id = intval($_POST['id']);
        $data = array();
        
        if (isset($_POST['titulo'])) $data['titulo'] = sanitize_text_field($_POST['titulo']);
        if (isset($_POST['descripcion'])) $data['descripcion'] = sanitize_textarea_field($_POST['descripcion']);
        if (isset($_POST['fecha_notificacion'])) $data['fecha_notificacion'] = sanitize_text_field($_POST['fecha_notificacion']);
        if (isset($_POST['fecha_fin'])) $data['fecha_fin'] = sanitize_text_field($_POST['fecha_fin']);
        if (isset($_POST['estado'])) $data['estado'] = true;
        
        $response = $this->make_api_request("/notificaciones/{$id}", 'PUT', $data, $user_id);
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al actualizar notificación'));
        }
    }
    
    private function delete_notification($user_id) {
        $id = intval($_POST['id']);
        
        $response = $this->make_api_request("/notificaciones/{$id}", 'DELETE', null, $user_id);
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al eliminar notificación'));
        }
    }
    
    private function get_notification_status() {
        $id = intval($_POST['id']);
        
        $response = $this->make_api_request("/notificaciones/estado/{$id}");
        
        if ($response['success']) {
            wp_send_json_success($response['data']);
        } else {
            wp_send_json_error($response['data'] ?? array('error' => 'Error al obtener estado de notificación'));
        }
    }
    
    // Función para obtener un nuevo nonce
    public function get_new_nonce() {
        // Verificar que el usuario esté logueado
        if (!is_user_logged_in()) {
            wp_send_json_error('Usuario no logueado');
        }
        
        // Verificar permisos básicos
        if (!current_user_can('read')) {
            wp_send_json_error('Permisos insuficientes');
        }
        
        $new_nonce = wp_create_nonce('condo360_notifications_nonce');
        wp_send_json_success(array('nonce' => $new_nonce));
    }
}

// Inicializar el plugin
new Condo360NotificationsManager();

// Hook para activación del plugin
register_activation_hook(__FILE__, function() {
    // Crear tablas si no existen
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}notificaciones_push_settings (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        push_enabled tinyint(1) NOT NULL DEFAULT 1,
        email_enabled tinyint(1) NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY unique_user_id (user_id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
});
