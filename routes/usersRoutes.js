import express from "express";
import UsuarioController from "../controllers/usersController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

let ctrl = new UsuarioController();
let auth = new AuthMiddleware();

// POST /users
router.post("/", (req, res) => {
  // #swagger.tags = ['Usuário']
  // #swagger.summary = 'Cadastra um novo usuário'

  /* #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: '#/components/schemas/usuarioCreate' },
          example: {
            id: "u100",
            nome: "Ana Gerente",
            email: "ana@salarosa.com",
            telefone: "11999990001",
            dataNascimento: "2000-01-01",
            perfil: "gerente",
            isConsultora: false,
            ativo: true,
            senha: "123"
          }
        }
      }
  } */

  ctrl.criar(req, res);

});

// GET /users
router.get("/", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Usuário']
  // #swagger.summary = 'Listar todos os usuários'
  /* #swagger.security = [{
      "bearerAuth": []
  }] */

  /* #swagger.responses[404] = {
      description: 'Nenhum usuário encontrado na consulta',
      schema: { $ref: '#/components/schemas/erro' }
  } */

  ctrl.listar(req, res);
});

// GET /users/:id
router.get("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Usuário']
  // #swagger.summary = 'Obtém um usuário pelo id'
  /* #swagger.security = [{
      "bearerAuth": []
  }] */

  /* #swagger.parameters['id'] = {
      in: 'path',
      description: 'Id do usuário',
      required: true,
      type: 'string'
  } */

  ctrl.obter(req, res);
});

// PUT /users/:id
router.put("/:id", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Usuário']
  // #swagger.summary = 'Atualiza um usuário'
  /* #swagger.security = [{
      "bearerAuth": []
  }] */

  /* #swagger.parameters['id'] = {
      in: 'path',
      description: 'Id do usuário',
      required: true,
      type: 'string'
  } */

  /* #swagger.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: '#/components/schemas/usuarioUpdate' }
        }
      }
    }
  */

  ctrl.atualizar(req, res);
});

// PATCH /users/:id/toggle-ativo
router.patch("/:id/toggle-ativo", auth.validarToken, (req, res) => {
  // #swagger.tags = ['Usuário']
  // #swagger.summary = 'Ativa/Inativa usuário'
  /* #swagger.security = [{
      "bearerAuth": []
  }] */

  /* #swagger.parameters['id'] = {
      in: 'path',
      description: 'Id do usuário',
      required: true,
      type: 'string'
  } */

  ctrl.toggleAtivo(req, res);
});

export default router;