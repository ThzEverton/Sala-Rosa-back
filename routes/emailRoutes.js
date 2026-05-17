import express from 'express'
import { enviarEmail } from '../services/emailService.js'

const router = express.Router()

function valorConfigurado(valor) {
  return valor && !String(valor).startsWith('[')
}

router.get('/teste-email', async (req, res) => {
  const destinatario = req.query.destinatario || process.env.EMAIL_TEST_TO || process.env.TEST_EMAIL_TO

  if (!valorConfigurado(destinatario)) {
    return res.status(400).json({
      error: 'Informe o destinatário em EMAIL_TEST_TO no .env ou use ?destinatario=email@exemplo.com',
    })
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #222;">
      <h1>Teste de e-mail OCI</h1>
      <p>Este e-mail foi enviado pelo backend Node.js usando Nodemailer + OCI Email Delivery.</p>
      <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
    </div>
  `

  try {
    const info = await enviarEmail(destinatario, 'Teste OCI Email Delivery', html)

    res.json({
      ok: true,
      message: 'E-mail de teste enviado com sucesso.',
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    })
  } catch (err) {
    console.error('Erro ao enviar e-mail de teste:', err)
    res.status(500).json({
      error: 'Erro ao enviar e-mail de teste.',
      detalhe: err.message,
    })
  }
})

export default router
