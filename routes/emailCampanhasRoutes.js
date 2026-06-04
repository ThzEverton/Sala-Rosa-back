import express from "express";
import EmailCampanhasController from "../controllers/emailCampanhasController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
const ctrl = new EmailCampanhasController();
const auth = new AuthMiddleware();

router.get("/", auth.validarToken, auth.somenteGerente, (req, res) => {
  // #swagger.tags = ['Campanhas de Email']
  // #swagger.summary = 'Lista campanhas de email'
  ctrl.listar(req, res);
});

router.get("/clientes", auth.validarToken, auth.somenteGerente, (req, res) => {
  // #swagger.tags = ['Campanhas de Email']
  // #swagger.summary = 'Lista clientes ativos com email'
  ctrl.listarClientes(req, res);
});

router.post("/", auth.validarToken, auth.somenteGerente, (req, res) => {
  // #swagger.tags = ['Campanhas de Email']
  // #swagger.summary = 'Salva uma campanha de email'
  ctrl.criar(req, res);
});

router.post("/enviar", auth.validarToken, auth.somenteGerente, (req, res) => {
  // #swagger.tags = ['Campanhas de Email']
  // #swagger.summary = 'Cria e envia uma campanha de email'
  ctrl.enviarAvulso(req, res);
});

router.post("/:id/enviar", auth.validarToken, auth.somenteGerente, (req, res) => {
  // #swagger.tags = ['Campanhas de Email']
  // #swagger.summary = 'Envia uma campanha de email salva'
  ctrl.enviar(req, res);
});

export default router;
