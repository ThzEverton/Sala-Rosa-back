import express from "express";
import FinanceiroController from "../controllers/financeiroController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new FinanceiroController();
let auth = new AuthMiddleware();

router.get("/", auth.validarToken, (req, res) => {

    // #swagger.tags = ['Financeiro']
    // #swagger.summary = 'Lista lançamentos financeiros com filtros opcionais (?status=PAGO&inicio=2024-01-01&fim=2024-12-31)'

    ctrl.listar(req, res);
});

router.get("/:id", auth.validarToken,auth.somenteGerente, (req, res) => {

    // #swagger.tags = ['Financeiro']
    // #swagger.summary = 'Obtém um lançamento financeiro'

    ctrl.obterPorId(req, res);
});

router.patch("/:id", auth.validarToken,auth.somenteGerente, (req, res) => {

    // #swagger.tags = ['Financeiro']
    // #swagger.summary = 'Atualiza o status de um lançamento (PAGO, CANCELADO, ESTORNADO)'

    ctrl.atualizarStatus(req, res);
});

export default router;