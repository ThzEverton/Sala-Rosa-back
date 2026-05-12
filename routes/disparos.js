import express from 'express'
import AuthMiddleware from '../middlewares/authMiddleware.js'
import Database from '../db/database.js'
import { getWhatsAppClient, getStatus, iniciarWhatsApp, pararWhatsApp } from '../services/whatsappService.js'

const router = express.Router()
const auth = new AuthMiddleware()
const banco = new Database()
const jobsDisparo = new Map()
const TEMPO_RETENCAO_JOB_MS = 60 * 60 * 1000

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

function criarJob(destinatarios, authorization) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const job = {
    id,
    status: 'pendente',
    total: destinatarios.length,
    enviados: 0,
    erros: [],
    atualNome: null,
    criadoEm: new Date().toISOString(),
    finalizadoEm: null,
  }

  jobsDisparo.set(id, job)
  executarJobDisparo(job, destinatarios, authorization)
  setTimeout(() => jobsDisparo.delete(id), TEMPO_RETENCAO_JOB_MS).unref?.()

  return job
}

async function executarJobDisparo(job, destinatarios, authorization) {
  job.status = 'enviando'

  try {
    const client = getWhatsAppClient()

    for (const d of destinatarios) {
      job.atualNome = d.nome_cliente || null
      const tel = normalizarTelefoneBR(d.telefone)

      if (!tel) {
        job.erros.push({ nome: d.nome_cliente, motivo: 'Telefone inválido' })
        continue
      }

      const mensagem =
        `Olá, ${d.nome_cliente}! Passando para lembrar do seu agendamento ` +
        `de ${d.servico} no dia ${formatarData(d.data)} às ${formatarHora(d.hora_inicio)}.`

      try {
        await client.sendMessage(`${tel}@c.us`, mensagem)
        job.enviados++

        fetch(`http://localhost:5000/disparos/registrar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', authorization },
          body: JSON.stringify({
            agendamento_id: d.agendamento_id,
            user_id: d.user_id,
            telefone: tel,
            status: 'enviado',
          }),
        }).catch(() => {})

        await sleep(500)
      } catch (err) {
        job.erros.push({ nome: d.nome_cliente, motivo: err.message })
      }
    }

    job.status = 'concluido'
  } catch (err) {
    job.status = 'erro'
    job.erros.push({ nome: 'Disparo', motivo: err.message })
  } finally {
    job.atualNome = null
    job.finalizadoEm = new Date().toISOString()
  }
}

function serializarJob(job) {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    enviados: job.enviados,
    erros: job.erros,
    atual: job.enviados + job.erros.length,
    atualNome: job.atualNome,
    concluido: ['concluido', 'erro'].includes(job.status),
  }
}

// GET /disparos/preview?data=2026-04-27
router.get('/preview', auth.validarToken, auth.somenteGerente, async (req, res) => {
  const { data } = req.query
  if (!data) return res.status(400).json({ error: 'data é obrigatório' })

  try {
    const rows = await banco.ExecutaComando(
      `
      SELECT
        a.id AS agendamento_id,
        ap.user_id,
        COALESCE(ap.nome_no_momento, u.nome) AS nome_cliente,
        u.telefone,
        s.nome AS servico,
        a.data,
        a.hora_inicio,
        a.tipo,
        (
          SELECT COUNT(*)
          FROM agendamento_participantes ap_count
          WHERE ap_count.agendamento_id = a.id
        ) AS total_participantes
      FROM agendamentos a
      INNER JOIN servicos s ON s.id = a.servico_id
      LEFT JOIN agendamento_participantes ap ON ap.agendamento_id = a.id
      LEFT JOIN users u ON u.id = ap.user_id
      WHERE a.data = ?
        AND a.status IN ('confirmado', 'aprovado', 'pendente')
        AND (
          a.tipo = 'individual'
          OR (
            a.tipo = 'turma'
            AND (
              SELECT COUNT(*)
              FROM agendamento_participantes ap_count
              WHERE ap_count.agendamento_id = a.id
            ) >= 5
          )
        )
      ORDER BY a.hora_inicio ASC, a.id ASC, nome_cliente ASC
      `,
      [data]
    )

    const lista = rows
      .filter((r) => r.user_id && r.nome_cliente)
      .map((r) => ({
        agendamento_id: r.agendamento_id,
        user_id: r.user_id,
        nome_cliente: r.nome_cliente,
        telefone: r.telefone,
        servico: r.servico,
        data: r.data,
        hora_inicio: r.hora_inicio,
        tipo: r.tipo,
        total_participantes: Number(r.total_participantes || 1),
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
router.post('/conectar', auth.validarToken, auth.somenteGerente, async (req, res) => {
  try {
    await iniciarWhatsApp()
    res.json(getStatus())
  } catch (err) {
    console.error('Erro ao conectar WhatsApp:', err)
    res.status(500).json({ error: 'Erro ao iniciar WhatsApp', detalhe: err.message })
  }
})

router.post('/desconectar', auth.validarToken, auth.somenteGerente, async (req, res) => {
  try {
    await pararWhatsApp()
    res.json(getStatus())
  } catch (err) {
    console.error('Erro ao desconectar WhatsApp:', err)
    res.status(500).json({ error: 'Erro ao desconectar WhatsApp', detalhe: err.message })
  }
})

router.get('/jobs/:id', auth.validarToken, auth.somenteGerente, (req, res) => {
  const job = jobsDisparo.get(req.params.id)
  if (!job) return res.status(404).json({ error: 'Disparo não encontrado ou expirado.' })
  res.json(serializarJob(job))
})

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

  const job = criarJob(destinatarios, req.headers.authorization)
  res.status(202).json(serializarJob(job))
})

// POST /disparos/registrar (mantido para compatibilidade)
router.post('/registrar', auth.validarToken, auth.somenteGerente, (req, res) => {
  console.log('Disparo registrado:', req.body)
  res.json({ ok: true })
})

export default router
