const moment = require('moment-timezone');

class TimezoneHelper {
    constructor() {
        this.utcTimezone = 'UTC';
        this.localTimezone = process.env.TIMEZONE_LOCAL || 'America/Caracas';
    }

    // Convertir fecha UTC a zona horaria local
    utcToLocal(utcDate) {
        if (!utcDate) return null;
        return moment.utc(utcDate).tz(this.localTimezone);
    }

    // Convertir fecha local a UTC
    localToUtc(localDate) {
        if (!localDate) return null;
        return moment.tz(localDate, this.localTimezone).utc();
    }

    // Obtener fecha actual en UTC
    getCurrentUtc() {
        return moment.utc();
    }

    // Obtener fecha actual en zona horaria local
    getCurrentLocal() {
        return moment().tz(this.localTimezone);
    }

    // Formatear fecha para mostrar en zona horaria local
    formatForDisplay(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return null;
        return this.utcToLocal(date).format(format);
    }

    // Formatear fecha para almacenar en UTC
    formatForStorage(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return null;
        return this.localToUtc(date).format(format);
    }

    // Calcular tiempo transcurrido desde una fecha
    getTimeElapsed(fromDate) {
        if (!fromDate) return null;
        
        const now = this.getCurrentUtc();
        const from = moment.utc(fromDate);
        const diff = now.diff(from);
        
        const duration = moment.duration(diff);
        
        if (duration.asDays() >= 1) {
            return {
                value: Math.floor(duration.asDays()),
                unit: 'días',
                full: `${Math.floor(duration.asDays())} día${Math.floor(duration.asDays()) !== 1 ? 's' : ''}`
            };
        } else if (duration.asHours() >= 1) {
            return {
                value: Math.floor(duration.asHours()),
                unit: 'horas',
                full: `${Math.floor(duration.asHours())} hora${Math.floor(duration.asHours()) !== 1 ? 's' : ''}`
            };
        } else {
            return {
                value: Math.floor(duration.asMinutes()),
                unit: 'minutos',
                full: `${Math.floor(duration.asMinutes())} minuto${Math.floor(duration.asMinutes()) !== 1 ? 's' : ''}`
            };
        }
    }

    // Validar si una fecha está en el futuro
    isFuture(date) {
        if (!date) return false;
        return moment.utc(date).isAfter(this.getCurrentUtc());
    }

    // Validar si una fecha está en el pasado
    isPast(date) {
        if (!date) return false;
        return moment.utc(date).isBefore(this.getCurrentUtc());
    }

    // Validar rango de fechas
    validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) return false;
        return moment.utc(startDate).isBefore(moment.utc(endDate));
    }
}

module.exports = new TimezoneHelper();
