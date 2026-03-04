import express from "express";
import ProdutosController from "../controllers/produtosController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new ProdutosController();
let auth = new AuthMiddleware();

router.get("/", auth.validarToken, (req,res) => {

    // #swagger.tags = ['Produtos']
    // #swagger.summary = 'Lista todos os produtos'

    ctrl.listar(req,res);
});

router.get("/:id", auth.validarToken, (req,res) => {

    // #swagger.tags = ['Produtos']
    // #swagger.summary = 'Obtém um produto'

    ctrl.obter(req,res);
});

router.post("/", auth.validarToken, (req,res) => {

    // #swagger.tags = ['Produtos']
    // #swagger.summary = 'Cadastra um produto'

    ctrl.cadastrar(req,res);
});

router.put("/:id", auth.validarToken, (req,res) => {

    // #swagger.tags = ['Produtos']
    // #swagger.summary = 'Atualiza um produto'

    ctrl.atualizar(req,res);
});

router.delete("/:id", auth.validarToken, (req,res) => {

    // #swagger.tags = ['Produtos']
    // #swagger.summary = 'Exclui um produto'

    ctrl.excluir(req,res);
});

export default router;