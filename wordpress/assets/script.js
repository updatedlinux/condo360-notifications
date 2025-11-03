/**
 * JavaScript para el plugin de notificaciones Condo360
 */

(function($) {
    'use strict';

    class Condo360Notifications {
        constructor() {
            this.currentPage = 1;
            this.currentLimit = 10;
            this.currentNotification = null;
            this.searchTimeout = null;
            this.whatsappStatusInterval = null;
            this.init();
        }

        init() {
            this.bindEvents();
            this.loadDashboardNotifications();
            this.loadNotifications();
            this.checkWhatsAppStatus();
            this.startWhatsAppStatusRefresh();
        }

        bindEvents() {
            // Botones principales
            $(document).on('click', '[data-action="create"]', () => this.showCreateModal());
            $(document).on('click', '[data-action="refresh"]', () => this.refreshAll());
            
            // Modal
            $(document).on('click', '.condo360-close', (e) => {
                console.log('🔍 Botón X clickeado (condo360)');
                console.log('🔍 Target:', e.target);
                console.log('🔍 Current target:', e.currentTarget);
                e.preventDefault();
                e.stopPropagation();
                this.hideModal();
            });
            $(document).on('click', '[data-action="cancel"]', (e) => {
                console.log('🔍 Botón Cancelar clickeado');
                console.log('🔍 Target:', e.target);
                console.log('🔍 Current target:', e.currentTarget);
                e.preventDefault();
                e.stopPropagation();
                this.hideModal();
            });
            
            // Event handler para cerrar modal de detalles
            $(document).on('click', '[data-action="close-details"]', (e) => {
                console.log('🔍 Botón Cerrar detalles clickeado');
                e.preventDefault();
                e.stopPropagation();
                $('#condo360-details-modal').hide();
            });
            $(document).on('click', '.condo360-modal', (e) => {
                if (e.target === e.currentTarget) {
                    this.hideModal();
                }
            });

            // Formulario
            console.log('🔍 Registrando event handler para formulario...');
            $(document).on('submit', '#condo360-notification-form', (e) => {
                console.log('🔍 Event handler del formulario ejecutado!');
                this.handleFormSubmit(e);
            });
            
            // Filtros
            $(document).on('input', '#search-notifications', () => this.debounceSearch());
            $(document).on('change', '#status-filter', () => this.filterNotifications());
            
            // Acciones de notificaciones
            $(document).on('click', '[data-action="edit"]', (e) => this.editNotification(e));
            $(document).on('click', '[data-action="delete"]', (e) => this.deleteNotification(e));
            $(document).on('click', '[data-action="view"]', (e) => this.viewNotification(e));
            
            // Confirmación
            $(document).on('click', '#condo360-confirm-action', (e) => {
                console.log('🔍 Botón Confirmar clickeado (condo360)');
                console.log('🔍 Event:', e);
                console.log('🔍 Target:', e.target);
                console.log('🔍 Current target:', e.currentTarget);
                e.preventDefault();
                e.stopPropagation();
                this.confirmAction();
            });
            
            // Validación en tiempo real
            $(document).on('input', '#condo360-titulo, #condo360-descripcion', () => this.validateField());
            $(document).on('change', '#condo360-fecha_notificacion, #condo360-fecha_fin', () => this.validateDates());
        }

        // Cargar notificaciones del dashboard
        loadDashboardNotifications() {
            this.makeRequest('get_dashboard', {}, (response) => {
                console.log('🔍 Respuesta get_dashboard:', response);
                
                // Verificar estructura de respuesta - puede ser directamente un array o un objeto con data
                let notifications = null;
                if (Array.isArray(response.data)) {
                    notifications = response.data;
                } else if (response.data && Array.isArray(response.data.data)) {
                    notifications = response.data.data;
                } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
                    notifications = response.data.data;
                }
                
                if (notifications !== null) {
                    this.renderDashboardNotifications(notifications);
                } else {
                    console.error('❌ Estructura de respuesta incorrecta:', response);
                    $('#condo360-dashboard-notifications').html('<div class="error">Error: Formato de datos incorrecto</div>');
                }
            }, (error) => {
                console.error('Error al cargar dashboard:', error);
                $('#condo360-dashboard-notifications').html('<div class="error">Error al cargar notificaciones del dashboard</div>');
            });
        }

        // Cargar lista de notificaciones
        loadNotifications(page = 1) {
            this.currentPage = page;
            const data = {
                page: page,
                limit: this.currentLimit
            };

            this.makeRequest('get_notifications', data, (response) => {
                console.log('🔍 Respuesta get_notifications:', response);
                
                // Verificar estructura de respuesta - puede ser directamente un objeto o anidado
                let notifications = null;
                let pagination = null;
                
                if (response.data && response.data.notifications && response.data.pagination) {
                    // Estructura esperada: {notifications: [...], pagination: {...}}
                    notifications = response.data.notifications;
                    pagination = response.data.pagination;
                } else if (response.data && response.data.data) {
                    // Estructura anidada: {data: {notifications: [...], pagination: {...}}}
                    if (response.data.data.notifications && response.data.data.pagination) {
                        notifications = response.data.data.notifications;
                        pagination = response.data.data.pagination;
                    }
                }
                
                if (notifications !== null) {
                    this.renderNotificationsList(notifications);
                    this.renderPagination(pagination);
                } else {
                    console.error('❌ Estructura de respuesta incorrecta:', response);
                    $('#condo360-notifications-list').html('<div class="error">Error: Formato de datos incorrecto</div>');
                }
            }, (error) => {
                console.error('Error al cargar notificaciones:', error);
                $('#condo360-notifications-list').html('<div class="error">Error al cargar la lista de notificaciones</div>');
            });
        }

        // Renderizar notificaciones del dashboard
        renderDashboardNotifications(notifications) {
            const container = $('#condo360-dashboard-notifications');
            
            console.log('🔍 Renderizando dashboard notifications:', notifications);
            
            // Verificar que notifications es un array
            if (!Array.isArray(notifications)) {
                console.error('❌ notifications no es un array:', notifications);
                container.html('<div class="error">Error: Formato de datos incorrecto</div>');
                return;
            }
            
            if (notifications.length === 0) {
                container.html('<div class="no-notifications">No hay notificaciones activas</div>');
                return;
            }

            const html = notifications.map(notification => `
                <div class="notification-card ${this.getStatusClass(notification)}">
                    <div class="notification-title">${this.escapeHtml(notification.titulo)}</div>
                    <div class="notification-description">${this.escapeHtml(notification.descripcion)}</div>
                    <div class="notification-meta">
                        <div class="notification-time">
                            <i class="icon-time"></i>
                            ${this.formatDateForDisplay(notification.fecha_notificacion)}
                        </div>
                        <div class="notification-status ${this.getStatusClass(notification)}">
                            ${this.getStatusText(notification)}
                        </div>
                    </div>
                </div>
            `).join('');

            container.html(html);
        }

        // Renderizar lista de notificaciones
        renderNotificationsList(notifications) {
            const container = $('#condo360-notifications-list');
            
            if (!notifications || notifications.length === 0) {
                container.html('<div class="no-notifications">No se encontraron notificaciones</div>');
                return;
            }

            const html = notifications.map(notification => `
                <div class="notification-item">
                    <div class="notification-item-header">
                        <h4 class="notification-item-title">${this.escapeHtml(notification.titulo)}</h4>
                        <div class="notification-item-actions">
                            <button class="btn btn-sm btn-warning" data-action="view" data-id="${notification.id}">
                                <i class="icon-view"></i> Ver
                            </button>
                            <button class="btn btn-sm btn-primary" data-action="edit" data-id="${notification.id}">
                                <i class="icon-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${notification.id}">
                                <i class="icon-delete"></i> Eliminar
                            </button>
                        </div>
                    </div>
                    <div class="notification-item-description">${this.escapeHtml(notification.descripcion)}</div>
                    <div class="notification-item-dates">
                        <div class="date-group">
                            <div class="date-label">Fecha de inicio:</div>
                            <div>${notification.fecha_notificacion_local || 'N/A'}</div>
                        </div>
                        <div class="date-group">
                            <div class="date-label">Fecha de fin:</div>
                            <div>${notification.fecha_fin_local || 'N/A'}</div>
                        </div>
                        <div class="date-group">
                            <div class="date-label">Estado:</div>
                            <div class="notification-status ${this.getStatusClass(notification)}">
                                ${this.getStatusText(notification)}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            container.html(html);
        }

        // Renderizar paginación
        renderPagination(pagination) {
            const container = $('#condo360-pagination');
            
            // Verificar que pagination existe y tiene las propiedades necesarias
            if (!pagination || typeof pagination !== 'object') {
                console.log('🔍 Paginación no disponible o formato incorrecto:', pagination);
                container.empty();
                return;
            }
            
            if (pagination.pages <= 1) {
                container.empty();
                return;
            }

            let html = '<div class="pagination">';
            
            // Botón anterior
            html += `<button ${pagination.page === 1 ? 'disabled' : ''} data-page="${pagination.page - 1}">‹</button>`;
            
            // Páginas
            const startPage = Math.max(1, pagination.page - 2);
            const endPage = Math.min(pagination.pages, pagination.page + 2);
            
            if (startPage > 1) {
                html += '<button data-page="1">1</button>';
                if (startPage > 2) {
                    html += '<span>...</span>';
                }
            }
            
            for (let i = startPage; i <= endPage; i++) {
                html += `<button class="${i === pagination.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
            }
            
            if (endPage < pagination.pages) {
                if (endPage < pagination.pages - 1) {
                    html += '<span>...</span>';
                }
                html += `<button data-page="${pagination.pages}">${pagination.pages}</button>`;
            }
            
            // Botón siguiente
            html += `<button ${pagination.page === pagination.pages ? 'disabled' : ''} data-page="${pagination.page + 1}">›</button>`;
            
            html += '</div>';
            container.html(html);
            
            // Bind eventos de paginación
            container.find('button[data-page]').on('click', (e) => {
                const page = parseInt($(e.target).data('page'));
                this.loadNotifications(page);
            });
        }

        // Mostrar modal de creación
        showCreateModal() {
            this.currentNotification = null;
            this.resetForm();
            $('#condo360-modal-title').text('Nueva Notificación');
            $('#condo360-notification-modal').show();
        }

        // Editar notificación
        editNotification(e) {
            const id = $(e.currentTarget).data('id');
            console.log('🔍 Editar notificación ID:', id);
            this.currentNotification = id;
            
            // Cargar datos de la notificación
            this.makeRequest('get_notification_status', { id: id }, (response) => {
                console.log('🔍 Respuesta edit get_notification_status:', response);
                // Los datos están anidados en response.data.data
                const notification = response.data.data || response.data;
                console.log('🔍 Datos para editar:', notification);
                this.populateForm(notification);
                $('#condo360-modal-title').text('Editar Notificación');
                $('#condo360-notification-modal').show();
            });
        }

        // Ver notificación
        viewNotification(e) {
            const id = $(e.currentTarget).data('id');
            console.log('🔍 Ver notificación ID:', id);
            this.makeRequest('get_notification_status', { id: id }, (response) => {
                console.log('🔍 Respuesta get_notification_status:', response);
                // Los datos están anidados en response.data.data
                const notification = response.data.data || response.data;
                console.log('🔍 Datos de notificación:', notification);
                this.showNotificationDetails(notification);
            });
        }

        // Eliminar notificación
        deleteNotification(e) {
            const id = $(e.currentTarget).data('id');
            console.log('🔍 Eliminar notificación ID:', id);
            console.log('🔍 === INICIO deleteNotification ===');
            console.log('🔍 ID extraído:', id);
            console.log('🔍 Tipo de ID:', typeof id);
            
            this.currentNotification = id;
            console.log('🔍 this.currentNotification asignado:', this.currentNotification);
            console.log('🔍 === FIN deleteNotification ===');
            
            $('#condo360-confirm-message').text('¿Estás seguro de que deseas eliminar esta notificación? Esta acción no se puede deshacer.');
            $('#condo360-confirm-modal').show();
            
            // Debugging: verificar que el botón existe
            console.log('🔍 Verificando botón condo360-confirm-action...');
            console.log('🔍 Botón existe:', $('#condo360-confirm-action').length);
            console.log('🔍 Botón en modal:', $('#condo360-confirm-modal #condo360-confirm-action').length);
            console.log('🔍 Botón visible:', $('#condo360-confirm-action').is(':visible'));
            
            // Intentar hacer clic programáticamente para testing
            setTimeout(() => {
                console.log('🔍 Intentando clic programático...');
                $('#condo360-confirm-action').trigger('click');
            }, 1000);
        }

        // Manejar envío del formulario
        handleFormSubmit(e) {
            console.log('🔍 === INICIO handleFormSubmit ===');
            console.log('🔍 Event:', e);
            e.preventDefault();
            
            console.log('🔍 Validando formulario...');
            if (!this.validateForm()) {
                console.log('❌ Validación falló');
                return;
            }
            console.log('✅ Validación exitosa');

            console.log('🔍 Obteniendo datos del formulario...');
            const formData = this.getFormData();
            console.log('🔍 Datos del formulario:', formData);
            
            const action = this.currentNotification ? 'update_notification' : 'create_notification';
            console.log('🔍 Acción:', action);
            console.log('🔍 Current notification ID:', this.currentNotification);
            
            if (this.currentNotification) {
                formData.id = this.currentNotification;
                console.log('🔍 Agregando ID al formData:', formData);
            }

            console.log('🔍 Enviando formulario...');
            this.submitForm(action, formData);
            console.log('🔍 === FIN handleFormSubmit ===');
        }

        // Enviar formulario
        submitForm(action, data) {
            console.log('🔍 === INICIO submitForm ===');
            console.log('🔍 Action:', action);
            console.log('🔍 Data:', data);
            
            const submitBtn = $('#condo360-notification-form button[type="submit"]');
            const btnText = submitBtn.find('.btn-text');
            const btnLoading = submitBtn.find('.btn-loading');
            
            console.log('🔍 Submit button encontrado:', submitBtn.length);
            console.log('🔍 Button text encontrado:', btnText.length);
            console.log('🔍 Button loading encontrado:', btnLoading.length);
            
            btnText.hide();
            btnLoading.show();
            submitBtn.prop('disabled', true);
            
            console.log('🔍 Haciendo request...');
            this.makeRequest(action, data, (response) => {
                console.log('✅ Respuesta exitosa:', response);
                this.showToast('Notificación guardada exitosamente', 'success');
                this.hideModal();
                this.refreshAll();
                
                // Restaurar estado del botón
                btnText.show();
                btnLoading.hide();
                submitBtn.prop('disabled', false);
                
                // Las notificaciones push se manejan automáticamente por el sistema
                // No es necesario enviarlas desde el admin
            }, (error) => {
                console.error('❌ Error en submitForm:', error);
                btnText.show();
                btnLoading.hide();
                submitBtn.prop('disabled', false);
            });
            console.log('🔍 === FIN submitForm ===');
        }

        // Confirmar acción
        confirmAction() {
            console.log('🔍 === INICIO confirmAction ===');
            console.log('🔍 Confirmar acción - ID:', this.currentNotification);
            console.log('🔍 Tipo de currentNotification:', typeof this.currentNotification);
            console.log('🔍 Valor de currentNotification:', this.currentNotification);
            
            if (this.currentNotification) {
                console.log('🔍 Eliminando notificación ID:', this.currentNotification);
                this.makeRequest('delete_notification', { id: this.currentNotification }, (response) => {
                    console.log('🔍 Respuesta eliminación:', response);
                    this.showToast('Notificación eliminada exitosamente', 'success');
                    this.hideModal();
                    this.refreshAll();
                }, (error) => {
                    console.error('🔍 Error al eliminar:', error);
                    this.showToast('Error al eliminar notificación', 'error');
                });
            } else {
                console.error('🔍 No hay ID de notificación para eliminar');
                console.error('🔍 this.currentNotification es:', this.currentNotification);
            }
            console.log('🔍 === FIN confirmAction ===');
        }

        // Refrescar todo
        refreshAll() {
            this.loadDashboardNotifications();
            this.loadNotifications(this.currentPage);
        }

        // Ocultar modal
        hideModal() {
            console.log('🔍 Cerrando modal...');
            console.log('🔍 Modal notification:', $('#condo360-notification-modal').length);
            console.log('🔍 Modal confirm:', $('#condo360-confirm-modal').length);
            $('#condo360-notification-modal').hide();
            $('#condo360-confirm-modal').hide();
            this.currentNotification = null;
            this.clearErrors();
            this.resetForm();
        }

        // Resetear formulario
        resetForm() {
            $('#condo360-notification-form')[0].reset();
            $('#condo360-notification-id').val('');
            this.clearErrors();
            
            // Restaurar estado del botón de envío
            const submitBtn = $('#condo360-notification-form button[type="submit"]');
            const btnText = submitBtn.find('.btn-text');
            const btnLoading = submitBtn.find('.btn-loading');
            
            btnText.show();
            btnLoading.hide();
            submitBtn.prop('disabled', false);
            
            // Establecer fechas por defecto
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            $('#condo360-fecha_notificacion').val(this.formatDateTimeLocal(tomorrow));
            $('#condo360-fecha_fin').val(this.formatDateTimeLocal(nextWeek));
        }

        // Poblar formulario
        populateForm(notification) {
            console.log('🔍 Poblando formulario con:', notification);
            $('#condo360-notification-id').val(notification.id);
            $('#condo360-titulo').val(notification.titulo);
            $('#condo360-descripcion').val(notification.descripcion);
            $('#condo360-fecha_notificacion').val(this.formatDateTimeLocal(new Date(notification.fecha_notificacion)));
            $('#condo360-fecha_fin').val(this.formatDateTimeLocal(new Date(notification.fecha_fin)));
            $('#condo360-estado').prop('checked', notification.estado);
            console.log('🔍 Formulario poblado - ID:', $('#condo360-notification-id').val());
            console.log('🔍 Formulario poblado - Título:', $('#condo360-titulo').val());
            console.log('🔍 Formulario poblado - Estado:', $('#condo360-estado').is(':checked'));
        }

        // Obtener clase CSS para el estado
        getStatusClass(notification) {
            const statusText = this.getStatusText(notification);
            
            switch (statusText) {
                case 'Activa':
                    return 'active';
                case 'Programada':
                    return 'programada';
                case 'Expirada':
                    return 'expirada';
                case 'Inactiva':
                default:
                    return 'inactive';
            }
        }

        // Obtener texto de estado más descriptivo
        getStatusText(notification) {
            console.log('🔍 getStatusText - Datos recibidos:', notification);
            
            const now = new Date();
            const startDate = new Date(notification.fecha_notificacion);
            const endDate = new Date(notification.fecha_fin);
            
            console.log('🔍 getStatusText - Fechas:', {
                now: now.toISOString(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                estado_actual: notification.estado_actual,
                estado: notification.estado
            });
            
            // Si tiene estado_actual, usarlo como referencia
            if (notification.estado_actual !== undefined) {
                console.log('🔍 getStatusText - Usando estado_actual:', notification.estado_actual);
                if (notification.estado_actual) {
                    console.log('🔍 getStatusText - Retornando: Activa');
                    return 'Activa';
                } else if (now < startDate) {
                    console.log('🔍 getStatusText - Retornando: Programada');
                    return 'Programada';
                } else if (now > endDate) {
                    console.log('🔍 getStatusText - Retornando: Expirada');
                    return 'Expirada';
                } else {
                    console.log('🔍 getStatusText - Retornando: Inactiva (estado_actual false)');
                    return 'Inactiva';
                }
            }
            
            // Si no tiene estado_actual, calcular basándose en fechas y estado
            console.log('🔍 getStatusText - Calculando sin estado_actual');
            const isEnabled = notification.estado === 1 || notification.estado === true;
            console.log('🔍 getStatusText - isEnabled:', isEnabled);
            
            if (!isEnabled) {
                console.log('🔍 getStatusText - Retornando: Inactiva (estado false)');
                return 'Inactiva';
            } else if (now < startDate) {
                console.log('🔍 getStatusText - Retornando: Programada');
                return 'Programada';
            } else if (now > endDate) {
                console.log('🔍 getStatusText - Retornando: Expirada');
                return 'Expirada';
            } else {
                console.log('🔍 getStatusText - Retornando: Activa (calculado)');
                return 'Activa';
            }
        }

        // Obtener datos del formulario
        getFormData() {
            return {
                titulo: $('#condo360-titulo').val(),
                descripcion: $('#condo360-descripcion').val(),
                fecha_notificacion: $('#condo360-fecha_notificacion').val(),
                fecha_fin: $('#condo360-fecha_fin').val(),
                estado: $('#condo360-estado').is(':checked')
            };
        }

        // Validar formulario
        validateForm() {
            let isValid = true;
            
            // Validar título
            if (!$('#condo360-titulo').val() || !$('#condo360-titulo').val().trim()) {
                this.showFieldError('condo360-titulo', 'El título es obligatorio');
                isValid = false;
            } else {
                this.clearFieldError('condo360-titulo');
            }
            
            // Validar descripción
            if (!$('#condo360-descripcion').val() || !$('#condo360-descripcion').val().trim()) {
                this.showFieldError('condo360-descripcion', 'La descripción es obligatoria');
                isValid = false;
            } else {
                this.clearFieldError('condo360-descripcion');
            }
            
            // Validar fechas
            const fechaInicio = new Date($('#condo360-fecha_notificacion').val());
            const fechaFin = new Date($('#condo360-fecha_fin').val());
            
            if (!fechaInicio || !fechaFin) {
                this.showFieldError('condo360-fecha_notificacion', 'Las fechas son obligatorias');
                this.showFieldError('condo360-fecha_fin', 'Las fechas son obligatorias');
                isValid = false;
            } else if (fechaFin < fechaInicio) {
                this.showFieldError('condo360-fecha_fin', 'La fecha de fin debe ser igual o posterior a la fecha de inicio');
                isValid = false;
            } else {
                this.clearFieldError('condo360-fecha_notificacion');
                this.clearFieldError('condo360-fecha_fin');
            }
            
            return isValid;
        }

        // Validar campo en tiempo real
        validateField() {
            const field = event.target;
            const fieldName = field.id;
            
            if (field.value.trim()) {
                this.clearFieldError(fieldName);
            }
        }

        // Validar fechas
        validateDates() {
            const fechaInicio = new Date($('#condo360-fecha_notificacion').val());
            const fechaFin = new Date($('#condo360-fecha_fin').val());
            
            if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
                this.showFieldError('condo360-fecha_fin', 'La fecha de fin debe ser igual o posterior a la fecha de inicio');
            } else {
                this.clearFieldError('condo360-fecha_fin');
            }
        }

        // Mostrar error de campo
        showFieldError(fieldName, message) {
            $(`#${fieldName}-error`).text(message).addClass('show');
            $(`#${fieldName}`).addClass('error');
        }

        // Limpiar error de campo
        clearFieldError(fieldName) {
            $(`#${fieldName}-error`).removeClass('show');
            $(`#${fieldName}`).removeClass('error');
        }

        // Limpiar todos los errores
        clearErrors() {
            $('.error-message').removeClass('show');
            $('.form-control').removeClass('error');
        }

        // Mostrar detalles de notificación
        showNotificationDetails(notification) {
            const details = `
                <div class="notification-details">
                    <h3>${this.escapeHtml(notification.titulo)}</h3>
                    <p><strong>Descripción:</strong> ${this.escapeHtml(notification.descripcion)}</p>
                    <p><strong>Fecha de inicio:</strong> ${notification.fecha_notificacion_local}</p>
                    <p><strong>Fecha de fin:</strong> ${notification.fecha_fin_local}</p>
                    <p><strong>Estado:</strong> ${this.getStatusText(notification)}</p>
                    <p><strong>Creada:</strong> ${notification.created_at_local}</p>
                </div>
            `;
            
            $('#condo360-details-title').text(notification.titulo);
            $('#condo360-details-content').html(details);
            $('#condo360-details-modal').show();
        }

        // Búsqueda con debounce
        debounceSearch() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterNotifications();
            }, 300);
        }

        // Filtrar notificaciones
        filterNotifications() {
            const searchTerm = $('#search-notifications').val().toLowerCase();
            const statusFilter = $('#status-filter').val();
            
            $('.notification-item').each(function() {
                const $item = $(this);
                const title = $item.find('.notification-item-title').text().toLowerCase();
                const description = $item.find('.notification-item-description').text().toLowerCase();
                const status = $item.find('.notification-status').text().toLowerCase();
                
                const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);
                
                let matchesStatus = true;
                if (statusFilter) {
                    if (statusFilter === 'active') {
                        // Activa incluye: "activa", "programada" (estado=1)
                        matchesStatus = status.includes('activa') || status.includes('programada');
                    } else if (statusFilter === 'inactive') {
                        // Inactiva incluye: "inactiva", "expirada" (estado=0)
                        matchesStatus = status.includes('inactiva') || status.includes('expirada');
                    }
                }
                
                if (matchesSearch && matchesStatus) {
                    $item.show();
                } else {
                    $item.hide();
                }
            });
        }

        // Hacer petición AJAX
        makeRequest(action, data, successCallback, errorCallback) {
            console.log('🔍 Haciendo petición:', action, data);
            console.log('🔍 User ID:', condo360_ajax.user_id);
            console.log('🔍 Nonce:', condo360_ajax.nonce);
            console.log('🔍 AJAX URL:', condo360_ajax.ajax_url);
            
            $.ajax({
                url: condo360_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'condo360_notifications_action',
                    action_type: action,
                    nonce: condo360_ajax.nonce,
                    user_id: condo360_ajax.user_id,
                    ...data
                },
                success: function(response) {
                    console.log('✅ Respuesta recibida:', response);
                    if (response.success) {
                        successCallback(response);
                    } else {
                        console.error('❌ Error en respuesta:', response);
                        
                        // Si es error de nonce, intentar con nonce de respaldo
                        if (response.data && typeof response.data === 'string' && response.data.includes('Nonce inválido')) {
                            console.log('🔄 Intentando con nonce de respaldo...');
                            if (condo360_ajax.nonce_backup) {
                                condo360_ajax.nonce = condo360_ajax.nonce_backup;
                                console.log('🔄 Reintentando petición con nonce de respaldo...');
                                this.makeRequest(action, data, successCallback, errorCallback);
                            } else {
                                console.log('🔄 Regenerando nonce...');
                                this.refreshNonce().then(() => {
                                    console.log('🔄 Reintentando petición...');
                                    this.makeRequest(action, data, successCallback, errorCallback);
                                }).catch(() => {
                                    this.showToast('Error de autenticación. Recarga la página e intenta de nuevo.', 'error');
                                    if (errorCallback) errorCallback(response);
                                });
                            }
                        } else {
                            this.showToast(response.data || 'Error en la operación', 'error');
                            if (errorCallback) errorCallback(response);
                        }
                    }
                }.bind(this),
                error: function(xhr, status, error) {
                    console.error('❌ Error de AJAX:', xhr, status, error);
                    this.showToast('Error de conexión: ' + error, 'error');
                    if (errorCallback) errorCallback(xhr);
                }.bind(this)
            });
        }

        // Regenerar nonce
        refreshNonce() {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: condo360_ajax.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'condo360_get_nonce'
                    },
                    success: function(response) {
                        if (response.success) {
                            condo360_ajax.nonce = response.data.nonce;
                            console.log('✅ Nonce regenerado:', condo360_ajax.nonce);
                            resolve();
                        } else {
                            console.error('❌ Error al regenerar nonce:', response);
                            reject(response);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.error('❌ Error de AJAX al regenerar nonce:', xhr, status, error);
                        reject(xhr);
                    }
                });
            });
        }

        // Mostrar toast
        showToast(message, type = 'info') {
            const toast = $('#condo360-toast');
            toast.removeClass('success error warning info');
            toast.addClass(type).text(message).addClass('show');
            
            setTimeout(() => {
                toast.removeClass('show');
            }, 3000);
        }

        // Formatear fecha para input datetime-local
        formatDateTimeLocal(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        }

        // Escapar HTML
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Formatear fecha para mostrar
        formatDateForDisplay(dateString) {
            if (!dateString) return 'N/A';
            
            try {
                const date = new Date(dateString);
                const now = new Date();
                const diffMs = now - date;
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                
                if (diffDays > 0) {
                    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
                } else if (diffHours > 0) {
                    return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                } else if (diffMinutes > 0) {
                    return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
                } else {
                    return 'Recién creada';
                }
            } catch (error) {
                console.error('Error formateando fecha:', error);
                return 'Fecha inválida';
            }
        }

        // Verificar estado de conexión WhatsApp
        checkWhatsAppStatus() {
            console.log('📱 Verificando estado de WhatsApp...');
            
            // Consultar ambos endpoints en paralelo
            const statusRequest = $.ajax({
                url: 'https://wschat.bonaventurecclub.com/api/status',
                method: 'GET',
                timeout: 10000
            });
            
            const groupRequest = $.ajax({
                url: 'https://wschat.bonaventurecclub.com/api/configured-group',
                method: 'GET',
                timeout: 10000
            });
            
            // Manejar ambas respuestas
            $.when(statusRequest, groupRequest)
                .done((statusResponse, groupResponse) => {
                    console.log('📱 Respuesta del API Status:', statusResponse);
                    console.log('📱 Respuesta del API Grupo:', groupResponse);
                    
                    this.updateWhatsAppStatus(statusResponse, groupResponse);
                })
                .fail((statusXHR, statusTextStatus, statusError, groupXHR, groupTextStatus, groupError) => {
                    console.error('📱 Error al verificar estado de WhatsApp');
                    console.error('📱 Status Error:', statusXHR, statusTextStatus, statusError);
                    console.error('📱 Group Error:', groupXHR, groupTextStatus, groupError);
                    
                    // Si el status falló con error de servidor
                    if (statusXHR && (statusXHR.status === 502 || statusXHR.status === 503 || statusXHR.status === 504)) {
                        this.showWhatsAppError('Conexión con WhatsApp Caída', 'contacte al Administrador del Sistema');
                        return;
                    }
                    
                    // Intentar obtener las respuestas parciales
                    statusRequest
                        .done((statusResponse) => {
                            // Status OK, verificar grupo
                            groupRequest
                                .done((groupResponse) => {
                                    this.updateWhatsAppStatus(statusResponse, groupResponse);
                                })
                                .fail(() => {
                                    // Status OK pero grupo falló o no configurado
                                    console.warn('📱 Grupo no configurado o error al consultar grupo');
                                    this.showWhatsAppDisconnected();
                                });
                        })
                        .fail(() => {
                            // Status falló, verificar grupo
                            groupRequest
                                .done((groupResponse) => {
                                    // Status falló pero grupo OK, mostrar error
                                    this.showWhatsAppError('Error de Conexión', 'No se pudo verificar el estado de WhatsApp');
                                })
                                .fail(() => {
                                    // Ambos fallaron
                                    this.showWhatsAppError('Error de Conexión', 'No se pudo verificar el estado de WhatsApp');
                                });
                        });
                });
        }

        // Validar que el grupo esté configurado correctamente
        isGroupConfigured(groupResponse) {
            if (!groupResponse || !groupResponse.success || !groupResponse.data) {
                console.warn('📱 Respuesta de grupo inválida:', groupResponse);
                return false;
            }
            
            const { groupId, groupName, configuredAt } = groupResponse.data;
            
            // Validar que ninguno sea null o undefined
            if (groupId === null || groupId === undefined || 
                groupName === null || groupName === undefined || 
                configuredAt === null || configuredAt === undefined) {
                console.warn('📱 Grupo no configurado correctamente:', {
                    groupId,
                    groupName,
                    configuredAt
                });
                return false;
            }
            
            // Validar que no sean strings vacíos
            if (groupId === '' || groupName === '') {
                console.warn('📱 Grupo tiene campos vacíos:', {
                    groupId,
                    groupName
                });
                return false;
            }
            
            return true;
        }

        // Actualizar estado de WhatsApp
        updateWhatsAppStatus(statusResponse, groupResponse) {
            const statusContent = $('#whatsapp-status-content');
            
            // Validar respuesta del status
            if (!statusResponse || !statusResponse.success || !statusResponse.data) {
                console.error('📱 Respuesta de status inválida:', statusResponse);
                this.showWhatsAppError('Error de Respuesta', 'El API no devolvió datos válidos');
                return;
            }
            
            // Validar que el grupo esté configurado
            const groupConfigured = this.isGroupConfigured(groupResponse);
            
            if (!groupConfigured) {
                console.warn('📱 Grupo no configurado, mostrando como desconectado');
                this.showWhatsAppDisconnected();
                return;
            }
            
            const { connected, clientInfo } = statusResponse.data;
            
            if (connected && clientInfo) {
                // WhatsApp conectado y grupo configurado
                const phoneNumber = clientInfo.phone || 'N/A';
                const userName = clientInfo.name || 'Usuario';
                const groupName = groupResponse.data.groupName || 'Grupo';
                
                statusContent.html(`
                    <div class="status-connected">
                        WhatsApp Conectado
                    </div>
                    <div class="whatsapp-user-info">
                        Usuario: ${userName} | Teléfono: ${phoneNumber}
                    </div>
                    <div class="whatsapp-user-info" style="margin-top: 6px;">
                        Grupo: ${groupName}
                    </div>
                `);
            } else {
                // WhatsApp desconectado
                this.showWhatsAppDisconnected();
            }
        }

        // Mostrar estado desconectado de WhatsApp
        showWhatsAppDisconnected() {
            const statusContent = $('#whatsapp-status-content');
            statusContent.html(`
                <div class="status-disconnected">
                    WhatsApp Desconectado
                </div>
                <a href="https://bonaventurecclub.com/wscondo360/" 
                   target="_blank" 
                   class="whatsapp-reconnect-btn">
                    Reconectar WhatsApp
                </a>
                <div class="whatsapp-disconnect-notice">
                    <strong>Nota:</strong> Puedes enviar la notificación igualmente, la misma se enviará y llegará al WhatsApp del grupo configurado cuando restablezcas la conexión mediante el uso del código QR.
                </div>
            `);
        }

        // Mostrar error de WhatsApp
        showWhatsAppError(title, message) {
            const statusContent = $('#whatsapp-status-content');
            statusContent.html(`
                <div class="status-error">
                    ${title}
                </div>
                <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                    ${message}
                </div>
            `);
        }

        // Iniciar auto-refresh del estado de WhatsApp
        startWhatsAppStatusRefresh() {
            console.log('📱 Iniciando auto-refresh del estado de WhatsApp cada 10 segundos');
            
            // Limpiar intervalo anterior si existe
            if (this.whatsappStatusInterval) {
                clearInterval(this.whatsappStatusInterval);
            }
            
            // Establecer nuevo intervalo
            this.whatsappStatusInterval = setInterval(() => {
                console.log('📱 Auto-refresh: Verificando estado de WhatsApp...');
                this.checkWhatsAppStatus();
            }, 10000); // 10 segundos
        }

        // Detener auto-refresh del estado de WhatsApp
        stopWhatsAppStatusRefresh() {
            if (this.whatsappStatusInterval) {
                console.log('📱 Deteniendo auto-refresh del estado de WhatsApp');
                clearInterval(this.whatsappStatusInterval);
                this.whatsappStatusInterval = null;
            }
        }
    }

    // Inicializar cuando el documento esté listo
    $(document).ready(function() {
        console.log('🔍 Inicializando Condo360 Notifications...');
        
        console.log('🔍 Variables disponibles:', typeof condo360_ajax !== 'undefined');
        console.log('🔍 Window condo360_ajax:', typeof window.condo360_ajax !== 'undefined');
        console.log('🔍 Window condo360_ajax content:', window.condo360_ajax);
        console.log('🔍 Window condo360_notifications_data:', typeof window.condo360_notifications_data !== 'undefined');
        console.log('🔍 Window condo360_notifications_data content:', window.condo360_notifications_data);
        
        // Usar window.condo360_notifications_data como fuente principal
        var ajaxData = window.condo360_notifications_data || 
                      (typeof condo360_ajax !== 'undefined' ? condo360_ajax : window.condo360_ajax);
        
        if (typeof ajaxData !== 'undefined') {
            console.log('🔍 AJAX URL:', ajaxData.ajax_url);
            console.log('🔍 User ID:', ajaxData.user_id);
            console.log('🔍 Is Admin:', ajaxData.is_admin);
            console.log('🔍 Is Logged In:', ajaxData.is_logged_in);
            console.log('🔍 Nonce:', ajaxData.nonce);
            console.log('🔍 Debug Info:', ajaxData.debug);
            console.log('🔍 User Login:', ajaxData.debug?.user_login);
            console.log('🔍 User Email:', ajaxData.debug?.user_email);
            console.log('🔍 User Roles:', ajaxData.debug?.user_roles);
            
            // Verificar que las variables críticas estén disponibles
            if (!ajaxData.user_id || ajaxData.user_id === 0) {
                console.error('❌ User ID no disponible o es 0:', ajaxData.user_id);
                console.error('❌ Usuario logueado:', ajaxData.is_logged_in);
                $('#condo360-dashboard-notifications').html('<div class="error">Error: Debes estar logueado para usar esta funcionalidad</div>');
                $('#condo360-notifications-list').html('<div class="error">Error: Debes estar logueado para usar esta funcionalidad</div>');
                return;
            }
            
            // Asignar ajaxData a condo360_ajax para compatibilidad
            window.condo360_ajax = ajaxData;
            window.condo360_notifications_data = ajaxData;
            
            new Condo360Notifications();
        } else {
            console.error('❌ Variables de AJAX no están disponibles');
            console.error('❌ condo360_ajax:', typeof condo360_ajax);
            console.error('❌ window.condo360_ajax:', typeof window.condo360_ajax);
            $('#condo360-dashboard-notifications').html('<div class="error">Error: Variables de configuración no disponibles</div>');
            $('#condo360-notifications-list').html('<div class="error">Error: Variables de configuración no disponibles</div>');
        }
    });

})(jQuery);
