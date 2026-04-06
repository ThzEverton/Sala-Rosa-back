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
    // #swagger.summary = 'Cria um novo agendamento'
    ctrl.criar(req, res);
});

// PUT /agendamentos/:id/cancelar
router.put("/:id/cancelar", auth.validarToken, (req, res) => {
  /* #swagger.security = [{ "bearerAuth": [] }] */
  // #swagger.tags = ['Agendamentos']
  // #swagger.summary = 'Cancela um agendamento'
  ctrl.cancelar(req, res);
});


export default router;