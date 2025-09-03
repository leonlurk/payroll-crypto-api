const axios = require('axios');
const logger = require('../utils/logger');
const emailTemplates = require('./emailTemplates');

class EmailService {
    constructor() {
        this.brevoApiKey = process.env.BREVO_API_KEY;
        this.senderEmail = process.env.SENDER_EMAIL || 'noreply@alphaglobalmarket.io';
        this.senderName = process.env.SENDER_NAME || 'Alpha Global Market';
        this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
    }

    async sendEmail(to, subject, htmlContent) {
        if (!this.brevoApiKey) {
            logger.warn('Brevo API key not configured, skipping email send');
            return { success: false, message: 'Email service not configured' };
        }

        try {
            const emailData = {
                sender: {
                    name: this.senderName,
                    email: this.senderEmail
                },
                to: [
                    {
                        email: to,
                        name: to.split('@')[0]
                    }
                ],
                subject: subject,
                htmlContent: htmlContent
            };

            const response = await axios.post(this.apiUrl, emailData, {
                headers: {
                    'accept': 'application/json',
                    'api-key': this.brevoApiKey,
                    'content-type': 'application/json'
                }
            });

            logger.info(`Email sent successfully to ${to} - Subject: ${subject}`);
            return { success: true, messageId: response.data.messageId };
        } catch (error) {
            logger.error(`Error sending email to ${to}:`, error.response?.data || error.message);
            return { 
                success: false, 
                message: 'Error sending email',
                error: error.response?.data || error.message 
            };
        }
    }

    async sendWelcomeEmail(userEmail, userName) {
        const htmlContent = emailTemplates.getWelcomeEmail(userName, userEmail);
        return await this.sendEmail(
            userEmail,
            'Bienvenido a Alpha Global Market – Tu cuenta ha sido creada correctamente',
            htmlContent
        );
    }

    async sendVerificationEmail(userEmail, userName, verificationUrl, verificationToken) {
        const htmlContent = emailTemplates.getVerificationEmail(
            userName || userEmail.split('@')[0], 
            verificationUrl, 
            verificationToken
        );
        return await this.sendEmail(
            userEmail,
            'Confirma tu dirección de correo electrónico - Alpha Global Market',
            htmlContent
        );
    }

    async sendEmailVerifiedConfirmation(userEmail) {
        const htmlContent = emailTemplates.getEmailVerifiedTemplate(userEmail.split('@')[0]);
        return await this.sendEmail(
            userEmail,
            'Tu correo electrónico ha sido verificado con éxito',
            htmlContent
        );
    }

    async sendPasswordResetEmail(userEmail, resetCode) {
        const htmlContent = emailTemplates.getPasswordResetEmail(userEmail.split('@')[0], resetCode);
        return await this.sendEmail(
            userEmail,
            'Código de Verificación - Restablecimiento de Contraseña',
            htmlContent
        );
    }

    async sendKYCApprovedEmail(userEmail) {
        const htmlContent = emailTemplates.getKYCApprovedEmail(userEmail.split('@')[0]);
        return await this.sendEmail(
            userEmail,
            'Tu cuenta en Alpha Global Market ha sido activada',
            htmlContent
        );
    }

    async sendKYCRejectedEmail(userEmail, reason) {
        const htmlContent = emailTemplates.getKYCRejectedEmail(userEmail.split('@')[0], reason);
        return await this.sendEmail(
            userEmail,
            'Problema con la verificación de tu cuenta en Alpha Global Market',
            htmlContent
        );
    }

    async sendTransactionNotification(userEmail, transactionDetails) {
        const { type, amount, currency, txHash, network } = transactionDetails;
        
        if (type === 'deposit') {
            const htmlContent = emailTemplates.getDepositConfirmationEmail(
                userEmail.split('@')[0],
                amount,
                currency || 'USD',
                network || 'Crypto'
            );
            return await this.sendEmail(
                userEmail,
                'Depósito confirmado en tu cuenta',
                htmlContent
            );
        } else {
            const htmlContent = emailTemplates.getWithdrawalConfirmationEmail(
                userEmail.split('@')[0],
                amount,
                currency || 'USD',
                network || 'Crypto'
            );
            return await this.sendEmail(
                userEmail,
                'Solicitud de retiro recibida',
                htmlContent
            );
        }
    }

    async sendPaymentConfirmation(userEmail, paymentDetails) {
        const { amount, method, status, date } = paymentDetails;
        const htmlContent = emailTemplates.getDepositConfirmationEmail(
            userEmail.split('@')[0],
            amount,
            'USD',
            method || 'Transferencia'
        );
        return await this.sendEmail(
            userEmail,
            'Confirmación de pago - Alpha Global Market',
            htmlContent
        );
    }

    async sendSecurityAlert(userEmail, alertDetails) {
        const { type, ipAddress, location, device, timestamp } = alertDetails;
        const alertType = type === 'Intento de acceso fallido' ? 'failed_login' : 'new_login';
        
        const htmlContent = emailTemplates.getSecurityAlertEmail(
            userEmail.split('@')[0],
            alertType,
            {
                ipAddress,
                location,
                device,
                timestamp: timestamp || new Date().toLocaleString('es-ES')
            }
        );
        
        const subject = alertType === 'failed_login' ? 
            'Aviso de intento fallido de inicio de sesión en tu cuenta' :
            'Nuevo inicio de sesión detectado en tu cuenta';
            
        return await this.sendEmail(userEmail, subject, htmlContent);
    }

    async sendPasswordChangedEmail(userEmail) {
        const content = `
            <h2>Tu contraseña ha sido actualizada correctamente</h2>
            <p class="greeting">Estimado/a ${userEmail.split('@')[0]},</p>
            
            <p>Te confirmamos que el cambio de contraseña de tu cuenta en Alpha Global Market se ha realizado con éxito.</p>
            
            <p>Si no has solicitado este cambio, por favor contacta de inmediato con nuestro equipo de soporte para asegurar la integridad de tu cuenta.</p>
            
            <div class="security-notice">
                <p><strong>Por motivos de seguridad:</strong> Te recordamos no compartir tus credenciales con terceros y cambiar tu contraseña periódicamente.</p>
            </div>
            
            <p>Gracias por tu confianza.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        const htmlContent = emailTemplates.getBaseTemplate(content, 'Contraseña Actualizada');
        return await this.sendEmail(
            userEmail,
            'Tu contraseña ha sido actualizada correctamente',
            htmlContent
        );
    }

    async sendEmailChangedConfirmation(userEmail, newEmail) {
        const content = `
            <h2>Tu dirección de correo electrónico ha sido actualizada correctamente</h2>
            <p class="greeting">Estimado/a ${userEmail.split('@')[0]},</p>
            
            <p>Te confirmamos que la dirección de correo electrónico asociada a tu cuenta en Alpha Global Market ha sido actualizada con éxito.</p>
            
            <p>A partir de ahora, recibirás todas las notificaciones y comunicaciones en tu nuevo correo: <strong>${newEmail}</strong></p>
            
            <p>Si no has solicitado este cambio, te recomendamos ponerte en contacto de inmediato con nuestro equipo de soporte y cambiar tu contraseña por seguridad.</p>
            
            <p>Gracias por tu confianza.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        const htmlContent = emailTemplates.getBaseTemplate(content, 'Email Actualizado');
        return await this.sendEmail(
            userEmail,
            'Tu dirección de correo electrónico ha sido actualizada correctamente',
            htmlContent
        );
    }

    async send2FAStatusChange(userEmail, enabled) {
        const content = `
            <h2>Cambio en la configuración de seguridad de tu cuenta</h2>
            <p class="greeting">Estimado/a ${userEmail.split('@')[0]},</p>
            
            <p>Te informamos que se ha realizado un cambio en la configuración de seguridad de tu cuenta en Alpha Global Market.</p>
            
            <div style="background-color: #1f1f23; border: 2px solid #3b82f6; padding: 20px; margin: 30px 0;">
                <p style="margin: 5px 0;"><strong>Autenticación en dos pasos (2FA):</strong> <span style="color: ${enabled ? '#10b981' : '#dc2626'};">${enabled ? 'Activada' : 'Desactivada'}</span></p>
                <p style="margin: 5px 0;"><strong>Fecha y hora del cambio:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            
            <p>Si has realizado este cambio, no es necesario que tomes ninguna acción adicional.</p>
            
            <p>Si no reconoces esta modificación, te recomendamos que cambies tu contraseña de inmediato y te pongas en contacto con nuestro equipo de soporte para proteger tu cuenta.</p>
            
            <p>La seguridad de tu cuenta es nuestra prioridad.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        const htmlContent = emailTemplates.getBaseTemplate(content, 'Configuración de Seguridad');
        return await this.sendEmail(
            userEmail,
            'Cambio en la configuración de seguridad de tu cuenta',
            htmlContent
        );
    }

    async sendAccountSuspensionNotice(userEmail, reason, type = 'suspended') {
        const content = `
            <h2>Notificación de ${type === 'closed' ? 'cierre' : 'suspensión'} de cuenta</h2>
            <p class="greeting">Estimado/a ${userEmail.split('@')[0]},</p>
            
            <p>Te informamos que tu cuenta en Alpha Global Market ha sido ${type === 'closed' ? 'cerrada' : 'suspendida'} conforme a los términos y condiciones del servicio.</p>
            
            <div style="background-color: #1f1f23; border-left: 3px solid #dc2626; padding: 20px; margin: 30px 0;">
                <p style="margin: 5px 0;"><strong>Motivo:</strong> ${reason || 'Incumplimiento de políticas'}</p>
                <p style="margin: 5px 0;"><strong>Fecha de ejecución:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            
            ${type === 'suspended' ? 
                '<p>En caso de suspensión, podrás contactar con nuestro equipo para revisar la situación y, si corresponde, solicitar la reactivación de tu cuenta.</p>' :
                '<p>Si el cierre ha sido solicitado por ti, te confirmamos que los datos personales serán tratados conforme a nuestra política de privacidad y normativa vigente.</p>'
            }
            
            <p>¿Tienes dudas o necesitas más información? Puedes escribirnos a support@alphaglobalmarket.io.</p>
            
            <p>Lamentamos las molestias que esto pueda ocasionar.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        const htmlContent = emailTemplates.getBaseTemplate(content, 'Notificación de Cuenta');
        return await this.sendEmail(
            userEmail,
            `Notificación de ${type === 'closed' ? 'cierre' : 'suspensión'} de cuenta`,
            htmlContent
        );
    }

    async sendMT5AccountCreatedEmail(to, accountData, credentials) {
        // Obtener el template HTML
        const htmlContent = emailTemplates.getMT5AccountCreatedEmail(to, accountData, credentials);
        
        // Determinar el asunto según el tipo de cuenta
        const subject = accountData.accountType === 'DEMO' 
            ? 'Tu Cuenta Demo MT5 está Lista - Alpha Global Market'
            : 'Tu Cuenta Real MT5 está Lista - Alpha Global Market';
        
        // Enviar el email
        const result = await this.sendEmail(
            to.email,
            subject,
            htmlContent
        );
        
        // Log de auditoría (sin contraseñas en producción)
        if (result.success) {
            const auditLog = process.env.NODE_ENV === 'production'
                ? `Cuenta MT5 ${accountData.accountType} creada y email enviado a: ${to.email}, Cuenta: ${accountData.accountNumber}`
                : `Cuenta MT5 ${accountData.accountType} creada y email enviado a: ${to.email}, Cuenta: ${accountData.accountNumber}, Login: ${credentials.login}`;
            logger.info(auditLog);
        }
        
        return result;
    }
}

module.exports = new EmailService();