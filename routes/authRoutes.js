import express from "express";
import AuthController from "../controllers/authController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new AuthController();
let auth = new AuthMiddleware();

// POST /autenticacao/token
router.post("/token", (req, res) => {
    // #swagger.tags = ['Autenticação']
    // #swagger.summary = 'Gera um token de acesso através das credenciais do usuário'
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: { type: "string", example: "usuario@email.com" },
                        senha: { type: "string", example: "123456" }
                    }
                }
            }
        }
    } */
    ctrl.token(req, res);
});


// GET /autenticacao/usuario
router.get("/usuario",
    auth.validarToken,
    (req, res) => {
        // #swagger.tags = ['Autenticação']
        // #swagger.summary = 'Retorna os dados do usuário autenticado'
        /* #swagger.security = [{
            "bearerAuth": []
        }] */
        ctrl.usuario(req, res);
    }
);

export default router;