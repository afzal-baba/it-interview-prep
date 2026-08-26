import { Router } from "express";
import { getOnlineCount, getOnlinePlayers } from "../race/index";

const router = Router();

router.get("/online", (_req, res) => {
  res.json({ count: getOnlineCount(), players: getOnlinePlayers() });
});

export default router;
