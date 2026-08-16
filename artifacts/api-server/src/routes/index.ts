import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";
import codelabRouter from "./codelab";
import onlineRouter from "./online";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(sessionsRouter);
router.use(leaderboardRouter);
router.use(codelabRouter);
router.use(onlineRouter);
router.use(searchRouter);

export default router;
