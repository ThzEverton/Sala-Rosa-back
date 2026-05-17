import nodemailer from 'nodemailer'

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env

function validarConfigSmtp() {
  const faltando = []

  if (!SMTP_HOST || SMTP_HOST.startsWith('[')) faltando.push('SMTP_HOST')
  if (!SMTP_PORT || SMTP_PORT.startsWith('[')) faltando.push('SMTP_PORT')
  if (!SMTP_USER || SMTP_USER.startsWith('[')) faltando.push('SMTP_USER')
  if (!SMTP_PASS || SMTP_PASS.startsWith('[')) faltando.push('SMTP_PASS')
  if (!SMTP_FROM || SMTP_FROM.startsWith('[')) faltando.push('SMTP_FROM')

  if (faltando.length) {
    throw new Error(`Configuração SMTP incompleta. Variáveis ausentes: ${faltando.join(', ')}`)
  }
}

function criarTransporter() {
  validarConfigSmtp()

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false,
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
  })
}

export async function enviarEmail(destinatario, assunto, html) {
  if (!destinatario) throw new Error('destinatario é obrigatório')
  if (!assunto) throw new Error('assunto é obrigatório')
  if (!html) throw new Error('html é obrigatório')

  const transporter = criarTransporter()

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: destinatario,
    subject: assunto,
    html,
  })

  console.log('E-mail enviado com sucesso:', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  })

  return info
}
