import express from "express";
import AgendaController from "../controllers/agendamentosController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new AgendaController();
let auth = new AuthMiddleware();

router.get("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Lista os agendamentos'
  ctrl.listar(req, res);
});

router.post("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cria um novo agendamento para o próprio usuário logado'
  ctrl.criar(req, res);
});

router.post("/gerente", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cria um novo agendamento como gerente, para si ou para um cliente'
  ctrl.criarComoGerente(req, res);
});

router.patch("/:id", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Remarca um agendamento'
  ctrl.remarcar(req, res);
});

router.put("/:id/cancelar", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cancela um agendamento'
  ctrl.cancelar(req, res);
});

export default router;