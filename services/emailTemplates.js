/**
 * Email Templates for Alpha Global Market
 * Professional templates following brand guidelines
 */

class EmailTemplates {
    constructor() {
        this.bannerUrl = 'https://ukngiipxprielwdfuvln.supabase.co/storage/v1/object/public/emails/Banner%20Mail%20-%20AGMB.png';
        this.companyName = 'ALPHA GLOBAL MARKET LTD.';
        this.companyRegistration = 'No. 2025-00193';
        this.companyAddress = 'Ground Floor, The Sotheby building, Rodney Village, Rodney Bay, Gros-islet, Saint Lucia';
        this.supportEmail = 'support@alphaglobalmarket.io';
        this.telegramSupport = 'https://t.me/agm_soporte';
    }

    getBaseTemplate(content, title = '') {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Alpha Global Market</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e4e4e7; background-color: #0a0a0a; }
        .email-wrapper { width: 100%; background-color: #0a0a0a; padding: 40px 20px; }
        .email-container { max-width: 600px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; overflow: hidden; }
        .banner-section { width: 100%; display: block; background-color: #000000; }
        .banner-image { width: 100%; height: auto; display: block; }
        .content-section { padding: 50px 40px; background-color: #18181b; border-top: 3px solid #3b82f6; }
        .logo-text { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #71717a; margin-bottom: 30px; text-align: center; }
        h2 { color: #fafafa; font-size: 24px; font-weight: 300; margin-bottom: 25px; letter-spacing: -0.5px; text-align: center; }
        .greeting { color: #a1a1aa; font-size: 15px; margin-bottom: 20px; }
        p { color: #d4d4d8; font-size: 15px; line-height: 1.7; margin-bottom: 20px; }
        .highlight { color: #fafafa; font-weight: 500; }
        .button-wrapper { margin: 40px 0; text-align: center; }
        .cta-button { display: inline-block; padding: 14px 40px; background-color: #3b82f6; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid #3b82f6; }
        .cta-button:hover { background-color: #2563eb; border-color: #2563eb; }
        .divider { width: 100%; height: 1px; background-color: #27272a; margin: 35px 0; }
        .security-notice { background-color: #1f1f23; border-left: 3px solid #3b82f6; padding: 20px; margin: 30px 0; }
        .security-notice p { color: #a1a1aa; font-size: 13px; margin-bottom: 0; }
        ul { list-style: none; padding-left: 0; margin-bottom: 20px; }
        ul li { color: #d4d4d8; padding: 8px 0; border-bottom: 1px solid #27272a; position: relative; padding-left: 25px; }
        ul li:before { content: "•"; color: #3b82f6; font-weight: bold; position: absolute; left: 0; }
        .footer-section { background-color: #0f0f11; padding: 35px 40px; border-top: 1px solid #27272a; }
        .footer-text { color: #71717a; font-size: 12px; margin-bottom: 15px; line-height: 1.6; }
        .footer-link { color: #3b82f6; text-decoration: none; font-size: 12px; }
        .footer-link:hover { text-decoration: underline; }
        .company-info { margin-top: 30px; padding-top: 20px; border-top: 1px solid #27272a; }
        .company-name { color: #fafafa; font-size: 14px; font-weight: 500; margin-bottom: 5px; }
        .company-details { color: #52525b; font-size: 11px; line-height: 1.5; }
        .legal-text { color: #52525b; font-size: 10px; margin-top: 20px; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <div class="banner-section">
                <img src="${this.bannerUrl}" alt="Alpha Global Markets" class="banner-image">
            </div>
            <div class="content-section">
                <div class="logo-text">ALPHA GLOBAL MARKET</div>
                ${content}
            </div>
            ${this.getFooter()}
        </div>
    </div>
</body>
</html>`;
    }

    getFooter() {
        return `
            <div class="footer-section">
                <p class="footer-text">¿Necesitas ayuda? Puedes escribirnos a ${this.supportEmail} o acceder a nuestro chat en vivo desde la web.</p>
                
                <div class="company-info">
                    <p class="company-name">${this.companyName}</p>
                    <p class="company-details">
                        ${this.companyRegistration}<br>
                        ${this.companyAddress}<br><br>
                        Email: <a href="mailto:${this.supportEmail}" class="footer-link">${this.supportEmail}</a><br>
                        Telegram: <a href="${this.telegramSupport}" class="footer-link">${this.telegramSupport}</a>
                    </p>
                </div>
                
                <p class="legal-text">
                    © 2025 Alpha Global Market Ltd. Todos los derechos reservados.<br><br>
                    <strong>Advertencia de Riesgo:</strong> Operar en los mercados financieros implica un alto nivel de riesgo y puede no ser adecuado para todos los participantes.
                </p>
            </div>`;
    }

    // Welcome Email Template
    getWelcomeEmail(userName, email) {
        const content = `
            <h2>Bienvenido a Alpha Global Market – Tu cuenta ha sido creada correctamente</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Gracias por registrarte en Alpha Global Market. Nos complace darte la bienvenida a nuestra comunidad de traders.</p>
            
            <p>Tu cuenta ha sido creada con éxito y ya puedes acceder al Área de Cliente para gestionar tus datos, verificar tu identidad y comenzar a operar en los mercados financieros con condiciones competitivas y tecnología de vanguardia.</p>
            
            <p><strong>¿Qué puedes hacer a continuación?</strong></p>
            <ul>
                <li>Acceder a tu Área de Cliente</li>
                <li>Completar el proceso de verificación (KYC) si aún no lo has hecho</li>
                <li>Depositar fondos mediante nuestras pasarelas seguras</li>
                <li>Descargar MetaTrader 5 y comenzar a operar</li>
            </ul>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Acceder al Área de Cliente</a>
            </div>
            
            <p>Nuestro objetivo es ofrecerte un entorno transparente, seguro y profesional para tu operativa diaria. Si tienes cualquier duda, puedes ponerte en contacto con nuestro equipo de soporte en cualquier momento.</p>
            
            <p>Gracias por confiar en Alpha Global Market.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Bienvenido');
    }

    // Email Verification Template with Link
    getVerificationEmail(userName, verificationUrl, verificationToken) {
        const content = `
            <h2>Confirma tu dirección de correo electrónico</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Gracias por registrarte en Alpha Global Market. Para completar tu registro y garantizar la seguridad de tu cuenta, necesitamos verificar tu dirección de correo electrónico.</p>
            
            <p>Por favor, haz clic en el siguiente botón para confirmar tu email:</p>
            
            <div class="button-wrapper">
                <a href="${verificationUrl}" class="cta-button">Verificar mi Email</a>
            </div>
            
            <p style="color: #71717a; font-size: 13px; text-align: center;">O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #1f1f23; padding: 15px; border: 1px solid #27272a; font-size: 12px; color: #a1a1aa;">
                ${verificationUrl}
            </p>
            
            <div class="divider"></div>
            
            <p><strong>¿Por qué necesito verificar mi email?</strong></p>
            <ul>
                <li>Proteger tu cuenta contra accesos no autorizados</li>
                <li>Asegurar que recibirás información importante sobre tu cuenta</li>
                <li>Cumplir con los estándares de seguridad de la industria financiera</li>
                <li>Habilitar funciones de recuperación de cuenta</li>
            </ul>
            
            <div class="security-notice">
                <p><strong>Nota de Seguridad:</strong> Este código es único y personal. No lo compartas con nadie. El código expirará en 24 horas.</p>
            </div>
            
            <p>Si no has solicitado este código, puedes ignorar este mensaje de manera segura.</p>
            
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Verificación de Email');
    }

    // Email Verified Confirmation
    getEmailVerifiedTemplate(userName) {
        const content = `
            <h2>Tu correo electrónico ha sido verificado con éxito</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Tu dirección de correo electrónico ha sido verificada correctamente. Ya puedes continuar con el proceso de activación de tu cuenta en Alpha Global Market.</p>
            
            <p><strong>¿Qué puedes hacer a continuación?</strong></p>
            <ul>
                <li>Acceder a tu Área de Cliente</li>
                <li>Completar el proceso de verificación de identidad (KYC), si aún no lo has hecho</li>
                <li>Depositar fondos mediante nuestras pasarelas seguras</li>
                <li>Descargar MetaTrader 5 y comenzar a operar</li>
            </ul>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Acceder al Área de Cliente</a>
            </div>
            
            <p>Si tienes alguna consulta o necesitas asistencia, nuestro equipo de soporte estará encantado de ayudarte.</p>
            
            <p>Gracias por formar parte de Alpha Global Market.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Email Verificado');
    }

    // KYC Approved Template
    getKYCApprovedEmail(userName) {
        const content = `
            <h2>Tu cuenta en Alpha Global Market ha sido activada</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Te informamos que tu cuenta ha sido activada correctamente tras completar el proceso de KYC. Ya puedes acceder a todas las funcionalidades de Alpha Global Market y comenzar a operar en los mercados con total seguridad.</p>
            
            <p><strong>¿Qué puedes hacer a continuación?</strong></p>
            <ul>
                <li>Acceder a tu Área de Cliente</li>
                <li>Descargar MetaTrader 5 desde nuestra web</li>
                <li>Realizar tu primer depósito mediante nuestras pasarelas seguras</li>
                <li>Empezar a operar en los mercados globales</li>
            </ul>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Acceder al Área de Cliente</a>
            </div>
            
            <p>Recuerda que estamos aquí para ayudarte en todo momento. Si tienes cualquier consulta sobre la plataforma, los métodos de pago o las condiciones de trading, no dudes en contactarnos.</p>
            
            <p>Gracias por confiar en Alpha Global Market.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Cuenta Activada');
    }

    // KYC Rejected Template
    getKYCRejectedEmail(userName, reason) {
        const content = `
            <h2>Problema con la verificación de tu cuenta en Alpha Global Market</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Lamentamos informarte que no hemos podido aprobar tu proceso de verificación (KYC) con la documentación proporcionada.</p>
            
            ${reason ? `
            <div style="background-color: #1f1f23; border-left: 3px solid #f59e0b; padding: 20px; margin: 20px 0;">
                <p style="color: #f59e0b; margin: 0;"><strong>Motivo:</strong> ${reason}</p>
            </div>` : ''}
            
            <p>Para poder activar tu cuenta y operar con nosotros, necesitamos que revises los siguientes aspectos:</p>
            <ul>
                <li>Asegúrate de que los documentos sean legibles y estén en vigor</li>
                <li>El documento de identidad debe mostrar claramente tu nombre completo, fecha de nacimiento y fotografía</li>
                <li>Si estás enviando un comprobante de domicilio, debe tener una antigüedad inferior a 3 meses y mostrar tu nombre y dirección completa</li>
            </ul>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Volver a subir documentación</a>
            </div>
            
            <p>Nuestro equipo de soporte está a tu disposición para ayudarte en el proceso y resolver cualquier duda que puedas tener.</p>
            
            <p>Gracias por tu comprensión.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Verificación Pendiente');
    }

    // Password Reset Template
    getPasswordResetEmail(userName, resetCode) {
        const content = `
            <h2>Restablecimiento de Contraseña</h2>
            <p class="greeting">Hola,</p>
            
            <p>Has solicitado restablecer tu contraseña. Usa el siguiente código de verificación:</p>
            
            <div style="background-color: #1a1a1a; border: 2px solid #0891b2; padding: 20px; margin: 30px 0; text-align: center; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; color: #0891b2; letter-spacing: 5px;">${resetCode}</span>
            </div>
            
            <p>Este código es válido por 1 hora. Si no solicitaste este cambio, ignora este email.</p>
            
            <div class="button-wrapper">
                <a href="https://alphaglobalmarket.io/reset-password?code=${resetCode}" class="cta-button" style="background: linear-gradient(to right, #0891b2, #0c4a6e); border: none; border-radius: 6px;">
                    Restablecer Contraseña
                </a>
            </div>
            
            <div class="security-notice">
                <p>Si necesitas ayuda, contacta a <a href="mailto:support@alphaglobalmarket.io" style="color: #0891b2; text-decoration: none;">support@alphaglobalmarket.io</a></p>
            </div>`;
        
        return this.getBaseTemplate(content, 'Código de Verificación - Restablecimiento de Contraseña');
    }

    // Deposit Confirmation Template
    getDepositConfirmationEmail(userName, amount, currency, method) {
        const content = `
            <h2>Depósito confirmado en tu cuenta</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Te confirmamos que hemos recibido exitosamente tu depósito en Alpha Global Market.</p>
            
            <div style="background-color: #1f1f23; border: 2px solid #10b981; padding: 20px; margin: 30px 0;">
                <p style="margin: 5px 0;"><strong>Monto:</strong> ${amount} ${currency}</p>
                <p style="margin: 5px 0;"><strong>Método:</strong> ${method}</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #10b981;">Confirmado</span></p>
                <p style="margin: 5px 0;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            
            <p>Los fondos ya están disponibles en tu cuenta y puedes comenzar a operar inmediatamente.</p>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Ver en el Dashboard</a>
            </div>
            
            <p>Gracias por confiar en Alpha Global Market.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Depósito Confirmado');
    }

    // Withdrawal Confirmation Template
    getWithdrawalConfirmationEmail(userName, amount, currency, method) {
        const content = `
            <h2>Solicitud de retiro recibida</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>Hemos recibido tu solicitud de retiro y está siendo procesada por nuestro equipo.</p>
            
            <div style="background-color: #1f1f23; border: 2px solid #3b82f6; padding: 20px; margin: 30px 0;">
                <p style="margin: 5px 0;"><strong>Monto solicitado:</strong> ${amount} ${currency}</p>
                <p style="margin: 5px 0;"><strong>Método:</strong> ${method}</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> <span style="color: #f59e0b;">En proceso</span></p>
                <p style="margin: 5px 0;"><strong>Tiempo estimado:</strong> 1-3 días hábiles</p>
            </div>
            
            <p>Te notificaremos cuando el retiro haya sido completado. Los fondos serán enviados al método de pago registrado en tu cuenta.</p>
            
            <div class="security-notice">
                <p><strong>Nota:</strong> Por razones de seguridad, los retiros solo pueden procesarse al mismo método utilizado para el depósito.</p>
            </div>
            
            <p>Gracias por tu paciencia.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Retiro en Proceso');
    }

    // MT5 Account Created Template
    getMT5AccountCreatedEmail(to, accountData, credentials) {
        // Función helper para sanitizar HTML
        const escapeHtml = (str) => {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

        // Sanitizar todos los valores
        const name = escapeHtml(to.name || to.email?.split('@')[0] || 'Usuario');
        const accountType = escapeHtml(accountData.accountType);
        const accountName = escapeHtml(accountData.accountName);
        const accountNumber = escapeHtml(accountData.accountNumber);
        const leverage = escapeHtml(accountData.leverage);
        const balance = escapeHtml(accountData.balance);
        const currency = escapeHtml(accountData.currency);
        const server = escapeHtml(accountData.server);
        const groupType = escapeHtml(accountData.groupType || ''); // Institucional o Market Direct
        const login = escapeHtml(credentials.login);
        const password = escapeHtml(credentials.password);
        const investorPassword = escapeHtml(credentials.investorPassword);

        const content = `
            <h2>Tu Cuenta MT5 ha sido Creada Exitosamente</h2>
            <p class="greeting">Estimado/a ${name},</p>
            
            <p>¡Felicidades! Tu cuenta ${accountType === 'DEMO' ? 'Demo' : 'Real'} de MT5 ha sido creada exitosamente y ya está lista para que comiences a operar en los mercados financieros.</p>
            
            <div class="divider"></div>
            
            <h3 style="color: #fafafa; font-size: 18px; margin-bottom: 20px;">Detalles de tu Cuenta</h3>
            
            <div style="background-color: #1f1f23; border: 1px solid #27272a; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Nombre de la Cuenta:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right;"><strong>${accountName}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Tipo de Cuenta:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;">
                            <span style="background: ${accountType === 'DEMO' ? '#f59e0b' : '#10b981'}; color: white; padding: 2px 8px; font-size: 12px;">
                                ${accountType}
                            </span>
                        </td>
                    </tr>${groupType ? `
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Grupo:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;"><strong>${groupType}</strong></td>
                    </tr>` : ''}
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Número de Cuenta:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;"><strong>${accountNumber}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Apalancamiento:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;"><strong>${leverage}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Balance Inicial:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;"><strong>${balance} ${currency}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px; border-top: 1px solid #27272a;">Servidor:</td>
                        <td style="padding: 8px 0; color: #fafafa; font-size: 14px; text-align: right; border-top: 1px solid #27272a;"><strong>${server}</strong></td>
                    </tr>
                </table>
            </div>
            
            <div class="divider"></div>
            
            <h3 style="color: #fafafa; font-size: 18px; margin-bottom: 20px;">Credenciales de Acceso</h3>
            
            <div style="background-color: #1f1f23; border-left: 3px solid #3b82f6; padding: 20px; margin: 20px 0;">
                <p style="color: #71717a; font-size: 12px; margin: 0 0 5px 0;">Login MT5:</p>
                <p style="color: #fafafa; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; font-family: monospace;">${login}</p>
                
                <p style="color: #71717a; font-size: 12px; margin: 0 0 5px 0;">Contraseña Master:</p>
                <p style="color: #fafafa; font-size: 18px; font-weight: bold; margin: 0 0 15px 0; font-family: monospace;">${password}</p>
                
                <p style="color: #71717a; font-size: 12px; margin: 0 0 5px 0;">Contraseña Investor (Solo lectura):</p>
                <p style="color: #fafafa; font-size: 18px; font-weight: bold; margin: 0; font-family: monospace;">${investorPassword}</p>
            </div>
            
            <div class="security-notice">
                <p><strong>Importante - Seguridad:</strong></p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                    <li>Guarda estas credenciales en un lugar seguro</li>
                    <li>No compartas tus contraseñas con nadie</li>
                    <li>Alpha Global Market nunca te pedirá tus contraseñas por email o teléfono</li>
                    <li>Cambia tu contraseña regularmente para mayor seguridad</li>
                </ul>
            </div>
            
            <p><strong>Próximos Pasos:</strong></p>
            <ul>
                <li>Descarga MetaTrader 5 desde tu tienda de aplicaciones</li>
                <li>Busca el servidor: <strong>${server}</strong></li>
                <li>Ingresa con tu Login y Contraseña Master</li>
                <li>${accountType === 'DEMO' ? 'Practica tus estrategias sin riesgo' : 'Realiza tu primer depósito para comenzar a operar'}</li>
            </ul>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Acceder al Dashboard</a>
            </div>
            
            <p>Si tienes alguna pregunta o necesitas asistencia, nuestro equipo de soporte está disponible para ayudarte.</p>
            
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Cuenta MT5 Creada');
    }

    // Security Alert Template
    getSecurityAlertEmail(userName, alertType, details) {
        const content = `
            <h2>${alertType === 'failed_login' ? 'Aviso de intento fallido de inicio de sesión' : 'Nuevo inicio de sesión detectado en tu cuenta'}</h2>
            <p class="greeting">Estimado/a ${userName || 'Usuario'},</p>
            
            <p>${alertType === 'failed_login' ? 
                'Hemos detectado un intento fallido de inicio de sesión en tu cuenta de Alpha Global Market.' :
                'Hemos detectado un inicio de sesión exitoso en tu cuenta de Alpha Global Market desde un dispositivo o dirección IP no reconocidos.'
            }</p>
            
            <div style="background-color: #1f1f23; border-left: 3px solid ${alertType === 'failed_login' ? '#dc2626' : '#f59e0b'}; padding: 20px; margin: 30px 0;">
                <p style="margin: 5px 0;"><strong>Detalles del ${alertType === 'failed_login' ? 'intento' : 'acceso'}:</strong></p>
                <p style="margin: 5px 0;">• Fecha y hora: ${details.timestamp || new Date().toLocaleString('es-ES')}</p>
                ${details.ipAddress ? `<p style="margin: 5px 0;">• Dirección IP: ${details.ipAddress}</p>` : ''}
                ${details.location ? `<p style="margin: 5px 0;">• Ubicación aproximada: ${details.location}</p>` : ''}
                ${details.device ? `<p style="margin: 5px 0;">• Dispositivo: ${details.device}</p>` : ''}
            </div>
            
            <p>${alertType === 'failed_login' ? 
                'Si has sido tú y simplemente has introducido una contraseña incorrecta, puedes ignorar este mensaje.' :
                'Si has sido tú, no necesitas realizar ninguna acción.'
            }</p>
            
            <p>Si no reconoces este ${alertType === 'failed_login' ? 'intento' : 'inicio de sesión'}, te recomendamos cambiar tu contraseña de inmediato y contactar con nuestro equipo de soporte.</p>
            
            <div class="button-wrapper">
                <a href="https://broker-agm.netlify.app" class="cta-button">Revisar Seguridad</a>
            </div>
            
            <p>La seguridad de tu cuenta es nuestra prioridad.</p>
            <p style="margin-top: 30px;">Atentamente,<br>El equipo de Alpha Global Market</p>`;
        
        return this.getBaseTemplate(content, 'Alerta de Seguridad');
    }
}

module.exports = new EmailTemplates();