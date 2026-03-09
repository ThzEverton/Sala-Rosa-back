import express from "express";
import TurmasController from "../controllers/turmasController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new TurmasController();
let auth = new AuthMiddleware();

// Listar turmas abertas
router.get("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Lista as turmas abertas'
  ctrl.listarAbertas(req, res);
});

// Listar todas as turmas (admin/gerente)
router.get("/admin", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Lista todas as turmas'
  ctrl.listarTodas(req, res);
});

// Buscar turma por id
router.get("/:id", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Busca uma turma por id'
  ctrl.obterPorId(req, res);
});

// Criar turma
router.post("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Cria uma nova turma'
  ctrl.criar(req, res);
});

// Cliente entra na turma
router.post("/:id/entrar", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Entra em uma turma'
  ctrl.entrar(req, res);
});

// Cliente sai da turma
router.delete("/:id/sair", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Sai de uma turma'
  ctrl.sair(req, res);
});

// Gerente remove participante
router.delete("/:id/participantes/:userId", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Turmas']
  // #swagger.summary = 'Remove um participante da turma'
  ctrl.removerParticipante(req, res);
});

export default router;