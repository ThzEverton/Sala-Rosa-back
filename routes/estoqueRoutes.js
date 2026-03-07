import express from "express";
import EstoqueController from "../controllers/estoqueController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new EstoqueController();
let auth = new AuthMiddleware();

// Listar movimentações de estoque
router.get("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Estoque']
  // #swagger.summary = 'Lista as movimentações de estoque'
  ctrl.listar(req, res);
});

// Criar movimentação de estoque
router.post("/", auth.validarToken, (req, res) => {
  /* #swagger.security = [{
      "bearerAuth": []
  }]
  */
  // #swagger.tags = ['Estoque']
  // #swagger.summary = 'Registra uma movimentação de estoque'
  ctrl.criar(req, res);
});

export default router;