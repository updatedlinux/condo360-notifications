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
            this.init();
        }

        init() {
            this.bindEvents();
            this.loadDashboardNotifications();
            this.loadNotifications();
        }

        bindEvents() {
            // Botones principales
            $(document).on('click', '[data-action="create"]', () => this.showCreateModal());
            $(document).on('click', '[data-action="refresh"]', () => this.refreshAll());
            
            // Modal
            $(document).on('click', '.close', () => this.hideModal());
            $(document).on('click', '[data-action="cancel"]', () => this.hideModal());
            $(document).on('click', '.modal', (e) => {
                if (e.target === e.currentTarget) this.hideModal();
            });

            // Formulario
            $(document).on('submit', '#condo360-notification-form', (e) => this.handleFormSubmit(e));
            
            // Filtros
            $(document).on('input', '#search-notifications', () => this.debounceSearch());
            $(document).on('change', '#status-filter', () => this.filterNotifications());
            
            // Acciones de notificaciones
            $(document).on('click', '[data-action="edit"]', (e) => this.editNotification(e));
            $(document).on('click', '[data-action="delete"]', (e) => this.deleteNotification(e));
            $(document).on('click', '[data-action="view"]', (e) => this.viewNotification(e));
            
            // Confirmación
            $(document).on('click', '#confirm-action', () => this.confirmAction());
            
            // Validación en tiempo real
            $(document).on('input', '#titulo, #descripcion', () => this.validateField());
            $(document).on('change', '#fecha_notificacion, #fecha_fin', () => this.validateDates());
        }

        // Cargar notificaciones del dashboard
        loadDashboardNotifications() {
            this.makeRequest('get_dashboard', {}, (response) => {
                this.renderDashboardNotifications(response.data);
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
                this.renderNotificationsList(response.data.notifications);
                this.renderPagination(response.data.pagination);
            });
        }

        // Renderizar notificaciones del dashboard
        renderDashboardNotifications(notifications) {
            const container = $('#condo360-dashboard-notifications');
            
            if (notifications.length === 0) {
                container.html('<div class="no-notifications">No hay notificaciones activas</div>');
                return;
            }

            const html = notifications.map(notification => `
                <div class="notification-card ${notification.estado_actual ? 'active' : 'inactive'}">
                    <div class="notification-title">${this.escapeHtml(notification.titulo)}</div>
                    <div class="notification-description">${this.escapeHtml(notification.descripcion)}</div>
                    <div class="notification-meta">
                        <div class="notification-time">
                            <i class="icon-time"></i>
                            ${notification.tiempo_transcurrido.texto_completo}
                        </div>
                        <div class="notification-status ${notification.estado_actual ? 'active' : 'inactive'}">
                            ${notification.estado_actual ? 'Activa' : 'Inactiva'}
                        </div>
                    </div>
                </div>
            `).join('');

            container.html(html);
        }

        // Renderizar lista de notificaciones
        renderNotificationsList(notifications) {
            const container = $('#condo360-notifications-list');
            
            if (notifications.length === 0) {
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
                            <div>${notification.fecha_notificacion_local}</div>
                        </div>
                        <div class="date-group">
                            <div class="date-label">Fecha de fin:</div>
                            <div>${notification.fecha_fin_local}</div>
                        </div>
                        <div class="date-group">
                            <div class="date-label">Estado:</div>
                            <div class="notification-status ${notification.estado_actual ? 'active' : 'inactive'}">
                                ${notification.estado_actual ? 'Activa' : 'Inactiva'}
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
            $('#modal-title').text('Nueva Notificación');
            $('#condo360-notification-modal').show();
        }

        // Editar notificación
        editNotification(e) {
            const id = $(e.currentTarget).data('id');
            this.currentNotification = id;
            
            // Cargar datos de la notificación
            this.makeRequest('get_notification_status', { id: id }, (response) => {
                const notification = response.data;
                this.populateForm(notification);
                $('#modal-title').text('Editar Notificación');
                $('#condo360-notification-modal').show();
            });
        }

        // Ver notificación
        viewNotification(e) {
            const id = $(e.currentTarget).data('id');
            this.makeRequest('get_notification_status', { id: id }, (response) => {
                const notification = response.data;
                this.showNotificationDetails(notification);
            });
        }

        // Eliminar notificación
        deleteNotification(e) {
            const id = $(e.currentTarget).data('id');
            this.currentNotification = id;
            
            $('#confirm-message').text('¿Estás seguro de que deseas eliminar esta notificación? Esta acción no se puede deshacer.');
            $('#condo360-confirm-modal').show();
        }

        // Manejar envío del formulario
        handleFormSubmit(e) {
            e.preventDefault();
            
            if (!this.validateForm()) {
                return;
            }

            const formData = this.getFormData();
            const action = this.currentNotification ? 'update_notification' : 'create_notification';
            
            if (this.currentNotification) {
                formData.id = this.currentNotification;
            }

            this.submitForm(action, formData);
        }

        // Enviar formulario
        submitForm(action, data) {
            const submitBtn = $('#condo360-notification-form button[type="submit"]');
            const btnText = submitBtn.find('.btn-text');
            const btnLoading = submitBtn.find('.btn-loading');
            
            btnText.hide();
            btnLoading.show();
            submitBtn.prop('disabled', true);

            this.makeRequest(action, data, (response) => {
                this.showToast('Notificación guardada exitosamente', 'success');
                this.hideModal();
                this.refreshAll();
            }, () => {
                btnText.show();
                btnLoading.hide();
                submitBtn.prop('disabled', false);
            });
        }

        // Confirmar acción
        confirmAction() {
            if (this.currentNotification) {
                this.makeRequest('delete_notification', { id: this.currentNotification }, (response) => {
                    this.showToast('Notificación eliminada exitosamente', 'success');
                    this.hideModal();
                    this.refreshAll();
                });
            }
        }

        // Refrescar todo
        refreshAll() {
            this.loadDashboardNotifications();
            this.loadNotifications(this.currentPage);
        }

        // Ocultar modal
        hideModal() {
            $('.modal').hide();
            this.currentNotification = null;
        }

        // Resetear formulario
        resetForm() {
            $('#condo360-notification-form')[0].reset();
            $('#notification-id').val('');
            this.clearErrors();
            
            // Establecer fechas por defecto
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            $('#fecha_notificacion').val(this.formatDateTimeLocal(tomorrow));
            $('#fecha_fin').val(this.formatDateTimeLocal(nextWeek));
        }

        // Poblar formulario
        populateForm(notification) {
            $('#notification-id').val(notification.id);
            $('#titulo').val(notification.titulo);
            $('#descripcion').val(notification.descripcion);
            $('#fecha_notificacion').val(this.formatDateTimeLocal(new Date(notification.fecha_notificacion)));
            $('#fecha_fin').val(this.formatDateTimeLocal(new Date(notification.fecha_fin)));
            $('#estado').prop('checked', notification.estado);
        }

        // Obtener datos del formulario
        getFormData() {
            return {
                titulo: $('#titulo').val(),
                descripcion: $('#descripcion').val(),
                fecha_notificacion: $('#fecha_notificacion').val(),
                fecha_fin: $('#fecha_fin').val(),
                estado: $('#estado').is(':checked')
            };
        }

        // Validar formulario
        validateForm() {
            let isValid = true;
            
            // Validar título
            if (!$('#titulo').val().trim()) {
                this.showFieldError('titulo', 'El título es obligatorio');
                isValid = false;
            } else {
                this.clearFieldError('titulo');
            }
            
            // Validar descripción
            if (!$('#descripcion').val().trim()) {
                this.showFieldError('descripcion', 'La descripción es obligatoria');
                isValid = false;
            } else {
                this.clearFieldError('descripcion');
            }
            
            // Validar fechas
            const fechaInicio = new Date($('#fecha_notificacion').val());
            const fechaFin = new Date($('#fecha_fin').val());
            
            if (!fechaInicio || !fechaFin) {
                this.showFieldError('fecha_notificacion', 'Las fechas son obligatorias');
                this.showFieldError('fecha_fin', 'Las fechas son obligatorias');
                isValid = false;
            } else if (fechaFin <= fechaInicio) {
                this.showFieldError('fecha_fin', 'La fecha de fin debe ser posterior a la fecha de inicio');
                isValid = false;
            } else {
                this.clearFieldError('fecha_notificacion');
                this.clearFieldError('fecha_fin');
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
            const fechaInicio = new Date($('#fecha_notificacion').val());
            const fechaFin = new Date($('#fecha_fin').val());
            
            if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
                this.showFieldError('fecha_fin', 'La fecha de fin debe ser posterior a la fecha de inicio');
            } else {
                this.clearFieldError('fecha_fin');
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
                    <p><strong>Estado:</strong> ${notification.estado_actual ? 'Activa' : 'Inactiva'}</p>
                    <p><strong>Creada:</strong> ${notification.created_at_local}</p>
                </div>
            `;
            
            $('#confirm-message').html(details);
            $('#condo360-confirm-modal').show();
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
                const matchesStatus = !statusFilter || 
                    (statusFilter === 'active' && status.includes('activa')) ||
                    (statusFilter === 'inactive' && status.includes('inactiva'));
                
                if (matchesSearch && matchesStatus) {
                    $item.show();
                } else {
                    $item.hide();
                }
            });
        }

        // Hacer petición AJAX
        makeRequest(action, data, successCallback, errorCallback) {
            $.ajax({
                url: condo360_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'condo360_notifications_action',
                    action_type: action,
                    nonce: condo360_ajax.nonce,
                    ...data
                },
                success: function(response) {
                    if (response.success) {
                        successCallback(response);
                    } else {
                        this.showToast(response.data?.error || 'Error en la operación', 'error');
                        if (errorCallback) errorCallback(response);
                    }
                }.bind(this),
                error: function(xhr, status, error) {
                    this.showToast('Error de conexión', 'error');
                    if (errorCallback) errorCallback(xhr);
                }.bind(this)
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
    }

    // Inicializar cuando el documento esté listo
    $(document).ready(function() {
        if (typeof condo360_ajax !== 'undefined') {
            new Condo360Notifications();
        }
    });

})(jQuery);
