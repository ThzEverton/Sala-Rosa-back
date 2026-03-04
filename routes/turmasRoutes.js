import express from "express";
const router = express.Router();

router.get("/_ping", (req, res) => res.json({ ok: true, route: "turmas" }));

export default router;