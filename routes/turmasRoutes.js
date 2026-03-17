import express from "express";
import TurmasController from "../controllers/turmasController.js";
import AuthMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

const ctrl = new TurmasController();
const auth = new AuthMiddleware();

/// Listagem
router.get("/",       auth.validarToken, (req, res) => ctrl.listarAbertas(req, res));
router.get("/admin",  auth.validarToken, (req, res) => ctrl.listarTodas(req, res));

// ⚠️ Rotas de convite ANTES de /:id
router.get("/convite/:codigo",         auth.validarToken, (req, res) => ctrl.obterPorCodigo(req, res));
router.post("/convite/:codigo/entrar", auth.validarToken, (req, res) => ctrl.entrarPorCodigo(req, res));

// Busca por ID (depois das rotas fixas)
router.get("/:id", auth.validarToken, (req, res) => ctrl.obterPorId(req, res));

// Criar
router.post("/", auth.validarToken, (req, res) => ctrl.criar(req, res));

// Aprovação
router.patch("/:id/aprovar", auth.validarToken, (req, res) => ctrl.aprovar(req, res));
router.patch("/:id/recusar", auth.validarToken, (req, res) => ctrl.recusar(req, res));
router.patch("/:id/editar",  auth.validarToken, (req, res) => ctrl.editarDataHora(req, res));

// Participantes
router.post("/:id/entrar",                  auth.validarToken, (req, res) => ctrl.entrar(req, res));
router.delete("/:id/sair",                  auth.validarToken, (req, res) => ctrl.sair(req, res));
router.delete("/:id/participantes/:userId", auth.validarToken, (req, res) => ctrl.removerParticipante(req, res));



export default router;