import express from "express";
import VendaController from "../controllers/vendasController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

const ctrl = new VendaController();
const auth = new AuthMiddleware();



// GET /vendas — lista todas as vendas
router.get("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Vendas']
  // #swagger.summary = 'Lista todas as vendas'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.listar(req, res);
});

// GET /vendas/:id — detalhe com itens
router.get("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Vendas']
  // #swagger.summary = 'Obtém uma venda por ID com seus itens'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.obterPorId(req, res);
});

// POST /vendas — registrar nova venda
router.post("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Vendas']
  // #swagger.summary = 'Registra uma nova venda'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.criar(req, res);
});

// PATCH /vendas/:id/pagamento — atualiza forma e status de pagamento
router.patch("/:id/pagamento", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Vendas']
  // #swagger.summary = 'Atualiza forma e status de pagamento de uma venda'
  // #swagger.security = [{ "bearerAuth": [] }]
  ctrl.atualizarPagamento(req, res);
});

export default router;