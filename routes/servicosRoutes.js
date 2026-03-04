import express from "express";
import ServicosController from "../controllers/servicosController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new ServicosController();
let auth = new AuthMiddleware();

// GET /servicos
router.get("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Serviços']
  // #swagger.summary = 'Lista todos os serviços'
  /* #swagger.security = [{
        "bearerAuth": []
  }] */
  ctrl.listar(req, res);
});

// GET /servicos/visiveis
router.get("/visiveis", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Serviços']
  // #swagger.summary = 'Lista serviços visíveis (filtro para consultora)'
  /* #swagger.security = [{
        "bearerAuth": []
  }] */
  ctrl.listarVisiveis(req, res);
});

// POST /servicos
router.post("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Serviços']
  // #swagger.summary = 'Cadastra um serviço'
  /* #swagger.security = [{
        "bearerAuth": []
  }] */
  ctrl.cadastrar(req, res);
});

// PUT /servicos/:id
router.put("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Serviços']
  // #swagger.summary = 'Atualiza um serviço'
  /* #swagger.security = [{
        "bearerAuth": []
  }] */
  ctrl.atualizar(req, res);
});

// DELETE /servicos/:id
router.delete("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Serviços']
  // #swagger.summary = 'Remove um serviço'
  /* #swagger.security = [{
        "bearerAuth": []
  }] */
  ctrl.remover(req, res);
});

export default router;