import express from "express";
import AgendaController from "../controllers/agendaController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new AgendaController();
let auth = new AuthMiddleware();

// Buscar configuração da agenda
router.get("/config", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Retorna a configuração de horário padrão da agenda'
    ctrl.getConfig(req, res);
});

// Atualizar configuração da agenda
router.put("/config", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Atualiza a configuração de horário padrão da agenda'
    ctrl.putConfig(req, res);
});

// Listar exceções de dias
router.get("/excecoes", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista as exceções de horários por dia'
    ctrl.getExcecoes(req, res);
});

// Salvar exceção de dia
router.post("/excecoes", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Cria uma exceção de horário para um dia específico ou recorrente'
    ctrl.postExcecao(req, res);
});

// FIX: parâmetro era :data, trocado para :id para bater com req.params.id no controller
router.delete("/excecoes/:id", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Remove uma exceção de horário pelo ID'
    ctrl.deleteExcecao(req, res);
});

// Listar bloqueios
router.get("/bloqueios", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista os slots bloqueados'
    ctrl.getBloqueios(req, res);
});

// Listar slots disponíveis de um dia
router.get("/slots", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista os slots disponíveis de um dia'
    ctrl.obterSlots(req, res);
});

// Bloquear ou desbloquear slot
router.post("/bloqueios/toggle", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Bloqueia ou desbloqueia um slot de horário'
    ctrl.postToggleBloqueio(req, res);
});

// Ativar/desativar exceção recorrente
router.patch("/excecoes/:id/toggle", auth.validarToken, (req, res) => {
    /* #swagger.security = [{ "bearerAuth": [] }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Ativa ou desativa uma exceção recorrente'
    ctrl.toggleExcecao(req, res);
});

export default router;