import express from 'express'
import AuthMiddleware from '../middlewares/authMiddleware.js'

const router = express.Router()
const auth = new AuthMiddleware()

// GET /disparos/preview?data=2026-04-27
router.get('/preview', auth.validarToken, auth.somenteGerente, async (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Disparos']
  // #swagger.summary = 'Lista destinatários para disparo de lembretes WhatsApp'
  // #swagger.parameters['data'] = { in: 'query', description: 'Data no formato YYYY-MM-DD', required: true, type: 'string' }

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

// POST /disparos/registrar
router.post('/registrar', auth.validarToken, auth.somenteGerente, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Disparos']
  // #swagger.summary = 'Registra o envio de um lembrete WhatsApp'
  /* #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            agendamento_id: { type: "integer" },
            user_id: { type: "integer" },
            telefone: { type: "string" },
            status: { type: "string", example: "enviado" }
          }
        }
      }
    }
  } */

  console.log('Disparo registrado:', req.body)
  res.json({ ok: true })
})

export default router