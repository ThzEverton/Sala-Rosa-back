import express from "express";
import TurmasController from "../controllers/turmasController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

const ctrl = new TurmasController();
const auth = new AuthMiddleware();

// Listagem
router.get("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Lista turmas abertas'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.listarAbertas(req, res);
});

router.get("/admin", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Lista todas as turmas'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.listarTodas(req, res);
});

// Convites
router.get("/convites/:codigo", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Obtém turma pelo código do convite'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.obterPorCodigo(req, res);
});

router.post("/convites/:codigo/aceitar", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Entra em uma turma por código de convite'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.entrarPorCodigo(req, res);
});

// Criar
router.post("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Cria uma nova turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.criar(req, res);
});

// Busca por id
router.get("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Busca uma turma por ID'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.obterPorId(req, res);
});

// Editar
router.put("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Edita os dados da turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.editarDataHora(req, res);
});

// Participantes
router.post("/:id/participantes", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Adiciona o usuário logado como participante da turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.entrar(req, res);
});

router.delete("/:id/participantes/me", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Remove o usuário logado da turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.sair(req, res);
});

router.delete("/:id/participantes/:userId", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Remove um participante da turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.removerParticipante(req, res);
});

// Aprovar / Recusar explícitos
router.patch("/:id/aprovar", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Aprova uma turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.aprovar(req, res);
});

router.patch("/:id/recusar", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Recusa uma turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.recusar(req, res);
});

// Status genérico
router.patch("/:id/status", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Altera o status da turma'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.alterarStatus(req, res);
});

export default router;