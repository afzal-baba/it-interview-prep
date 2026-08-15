import { Router } from "express";
import { getOnlineCount } from "../race/index";

const router = Router();

router.get("/online", (_req, res) => {
  res.json({ count: getOnlineCount() });
});

export default router;
