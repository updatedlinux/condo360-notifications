const Joi = require('joi');

// Esquemas de validación para notificaciones
const notificationSchemas = {
    create: Joi.object({
        titulo: Joi.string()
            .min(1)
            .max(255)
            .required()
            .messages({
                'string.empty': 'El título es obligatorio',
                'string.min': 'El título debe tener al menos 1 carácter',
                'string.max': 'El título no puede exceder 255 caracteres',
                'any.required': 'El título es obligatorio'
            }),
        
        descripcion: Joi.string()
            .min(1)
            .max(2000)
            .required()
            .messages({
                'string.empty': 'La descripción es obligatoria',
                'string.min': 'La descripción debe tener al menos 1 carácter',
                'string.max': 'La descripción no puede exceder 2000 caracteres',
                'any.required': 'La descripción es obligatoria'
            }),
        
        fecha_notificacion: Joi.date()
            .iso()
            .required()
            .messages({
                'date.base': 'La fecha de notificación debe ser una fecha válida',
                'date.format': 'La fecha de notificación debe estar en formato ISO',
                'any.required': 'La fecha de notificación es obligatoria'
            }),
        
        fecha_fin: Joi.date()
            .iso()
            .min(Joi.ref('fecha_notificacion'))
            .required()
            .messages({
                'date.base': 'La fecha de fin debe ser una fecha válida',
                'date.format': 'La fecha de fin debe estar en formato ISO',
                'date.min': 'La fecha de fin debe ser igual o posterior a la fecha de notificación',
                'any.required': 'La fecha de fin es obligatoria'
            }),
        
        estado: Joi.boolean()
            .optional()
            .default(true)
            .messages({
                'boolean.base': 'El estado debe ser verdadero o falso'
            })
    }),

    update: Joi.object({
        titulo: Joi.string()
            .min(1)
            .max(255)
            .optional()
            .messages({
                'string.empty': 'El título no puede estar vacío',
                'string.min': 'El título debe tener al menos 1 carácter',
                'string.max': 'El título no puede exceder 255 caracteres'
            }),
        
        descripcion: Joi.string()
            .min(1)
            .max(2000)
            .optional()
            .messages({
                'string.empty': 'La descripción no puede estar vacía',
                'string.min': 'La descripción debe tener al menos 1 carácter',
                'string.max': 'La descripción no puede exceder 2000 caracteres'
            }),
        
        fecha_notificacion: Joi.date()
            .iso()
            .optional()
            .messages({
                'date.base': 'La fecha de notificación debe ser una fecha válida',
                'date.format': 'La fecha de notificación debe estar en formato ISO'
            }),
        
        fecha_fin: Joi.date()
            .iso()
            .optional()
            .messages({
                'date.base': 'La fecha de fin debe ser una fecha válida',
                'date.format': 'La fecha de fin debe estar en formato ISO'
            }),
        
        estado: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'El estado debe ser verdadero o falso'
            })
    }).min(1), // Al menos un campo debe ser proporcionado

    id: Joi.object({
        id: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'El ID debe ser un número',
                'number.integer': 'El ID debe ser un número entero',
                'number.positive': 'El ID debe ser un número positivo',
                'any.required': 'El ID es obligatorio'
            })
    }),

    pagination: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.base': 'La página debe ser un número',
                'number.integer': 'La página debe ser un número entero',
                'number.min': 'La página debe ser al menos 1'
            }),
        
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(10)
            .messages({
                'number.base': 'El límite debe ser un número',
                'number.integer': 'El límite debe ser un número entero',
                'number.min': 'El límite debe ser al menos 1',
                'number.max': 'El límite no puede exceder 100'
            })
    })
};

// Esquemas de validación para autenticación
const authSchemas = {
    adminCheck: Joi.object({
        user_id: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'El ID de usuario debe ser un número',
                'number.integer': 'El ID de usuario debe ser un número entero',
                'number.positive': 'El ID de usuario debe ser un número positivo',
                'any.required': 'El ID de usuario es obligatorio'
            })
    })
};

// Función para validar datos
const validateData = (schema, data) => {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true
    });
    
    if (error) {
        const errorMessages = error.details.map(detail => detail.message);
        return {
            isValid: false,
            errors: errorMessages,
            data: null
        };
    }
    
    return {
        isValid: true,
        errors: null,
        data: value
    };
};

module.exports = {
    notificationSchemas,
    authSchemas,
    validateData
};
