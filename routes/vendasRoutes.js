import express from "express";
const router = express.Router();

router.get("/_ping", (req, res) => res.json({ ok: true, route: "vendas" }));

export default router;