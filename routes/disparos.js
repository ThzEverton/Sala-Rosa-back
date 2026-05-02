import express from 'express'
import AuthMiddleware from '../middlewares/authMiddleware.js'
import { getWhatsAppClient, getStatus } from '../services/whatsappService.js'

const router = express.Router()
const auth = new AuthMiddleware()

function normalizarTelefoneBR(tel) {
  if (!tel) return null
  const digits = String(tel).replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return null
}

function formatarData(dateStr) {
  if (!dateStr) return ''
  const parte = String(dateStr).split('T')[0]
  const [y, m, d] = parte.split('-')
  return `${d}/${m}/${y}`
}

function formatarHora(timeStr) {
  if (!timeStr) return ''
  return String(timeStr).slice(0, 5)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// GET /disparos/preview?data=2026-04-27
router.get('/preview', auth.validarToken, auth.somenteGerente, async (req, res) => {
  const { data } = req.query
  if (!data) return res.status(400).json({ error: 'data é obrigatório' })

  try {
    const response = await fetch(
      `http://localhost:5000/agendamentos?data=${data}`,
      { headers: req.headers }
    )
    const agendamentos = await response.json()

    const lista = (agendamentos?.data || agendamentos || []).map((a) => ({
      agendamento_id: a.id,
      user_id: a.participanteId || a.criadoPorId,
      nome_cliente: a.participante?.nome || a.criadoPor?.nome,
      telefone: a.participante?.telefone || a.criadoPor?.telefone,
      servico: a.servico?.nome,
      data: a.data,
      hora_inicio: a.horaInicio,
      tipo: a.tipo,
      total_participantes: a.totalParticipantes || 1,
    }))

    res.json({ data: lista })
  } catch (err) {
    console.error('Erro em /disparos/preview:', err)
    res.status(500).json({ error: 'Erro ao buscar destinatários' })
  }
})

// GET /disparos/status  ← já existe, já funciona
router.get('/status', auth.validarToken, auth.somenteGerente, (req, res) => {
  res.json(getStatus())
  // retorna: { estado: 'qr_pendente', qr: 'data:image/png;base64,...' }
})

// POST /disparos/executar — dispara todas as mensagens pelo servidor
router.post('/executar', auth.validarToken, auth.somenteGerente, async (req, res) => {
  const { destinatarios } = req.body
  if (!Array.isArray(destinatarios) || !destinatarios.length) {
    return res.status(400).json({ error: 'destinatarios é obrigatório' })
  }

  const status = getStatus()
  if (status.estado !== 'pronto') {
    return res.status(503).json({
      error: 'WhatsApp não conectado. Escaneie o QR Code primeiro.',
      estado: status.estado,
    })
  }

  const client = getWhatsAppClient()
  const erros = []
  let enviados = 0

  for (const d of destinatarios) {
    const tel = normalizarTelefoneBR(d.telefone)

    if (!tel) {
      erros.push({ nome: d.nome_cliente, motivo: 'Telefone inválido' })
      continue
    }

    const mensagem =
      `Olá, ${d.nome_cliente}! Passando para lembrar do seu agendamento ` +
      `de ${d.servico} no dia ${formatarData(d.data)} às ${formatarHora(d.hora_inicio)}.`

    try {
      await client.sendMessage(`${tel}@c.us`, mensagem)
      enviados++

      // registra o envio (sem bloquear se falhar)
      fetch(`http://localhost:5000/disparos/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: req.headers.authorization },
        body: JSON.stringify({
          agendamento_id: d.agendamento_id,
          user_id: d.user_id,
          telefone: tel,
          status: 'enviado',
        }),
      }).catch(() => {})

      await sleep(1500) // evita bloqueio por spam
    } catch (err) {
      erros.push({ nome: d.nome_cliente, motivo: err.message })
    }
  }

  res.json({ enviados, erros })
})

// POST /disparos/registrar (mantido para compatibilidade)
router.post('/registrar', auth.validarToken, auth.somenteGerente, (req, res) => {
  console.log('Disparo registrado:', req.body)
  res.json({ ok: true })
})

export default router