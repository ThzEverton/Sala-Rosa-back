import express from "express";
import AgendaController from "../controllers/agendaController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new AgendaController();
let auth = new AuthMiddleware();

// Buscar configuração da agenda
router.get("/config", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Retorna a configuração de horário padrão da agenda'
    ctrl.getConfig(req, res);
});

// Atualizar configuração da agenda
router.put("/config", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Atualiza a configuração de horário padrão da agenda'
    ctrl.putConfig(req, res);
});

// Listar exceções de dias
router.get("/excecoes", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista as exceções de horários por dia'
    ctrl.getExcecoes(req, res);
});

// Salvar exceção de dia
router.post("/excecoes", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Cria ou atualiza uma exceção de horário para um dia específico'
    ctrl.postExcecao(req, res);
});

// Remover exceção por data
router.delete("/excecoes/:data", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Remove uma exceção de horário pela data'
    ctrl.deleteExcecao(req, res);
});

// Listar bloqueios
router.get("/bloqueios", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista os slots bloqueados'
    ctrl.getBloqueios(req, res);
});

    router.get("/slots", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }] */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Lista os slots disponíveis de um dia'

    ctrl.obterSlots(req, res);
});


// Bloquear ou desbloquear slot
router.post("/bloqueios/toggle", auth.validarToken, (req, res) => {
    /* #swagger.security = [{
        "bearerAuth": []
    }]
    */
    // #swagger.tags = ['Agenda']
    // #swagger.summary = 'Bloqueia ou desbloqueia um slot de horário'
    ctrl.postToggleBloqueio(req, res);
});

export default router;