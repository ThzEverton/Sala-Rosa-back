import express from "express";
import AgendamentosController from "../controllers/agendamentosController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new AgendamentosController();
let auth = new AuthMiddleware();

// GET /agendamentos
router.get("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Lista os agendamentos'
  ctrl.listar(req, res);
});

// GET /agendamentos/:id
router.get("/:id", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Busca um agendamento por id'
  ctrl.obterPorId(req, res);
});

router.post("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cria um agendamento individual'
  ctrl.criar(req, res);
});
// PATCH /agendamentos/:id/cancelar
router.patch("/:id/cancelar", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cancela um agendamento'
  ctrl.cancelar(req, res);
});

export default router;