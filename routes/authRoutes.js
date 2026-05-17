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

// POST /autenticacao/esqueci-senha
router.post("/esqueci-senha", (req, res) => {
    // #swagger.tags = ['Autenticação']
    // #swagger.summary = 'Solicita envio de link para redefinição de senha'
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: { type: "string", example: "usuario@email.com" }
                    }
                }
            }
        }
    } */
    ctrl.esqueciSenha(req, res);
});

// POST /autenticacao/redefinir-senha
router.post("/redefinir-senha", (req, res) => {
    // #swagger.tags = ['Autenticação']
    // #swagger.summary = 'Redefine a senha usando o token enviado por e-mail'
    /* #swagger.requestBody = {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        token: { type: "string", example: "token-recebido-por-email" },
                        senha: { type: "string", example: "novaSenha123" }
                    }
                }
            }
        }
    } */
    ctrl.redefinirSenha(req, res);
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
