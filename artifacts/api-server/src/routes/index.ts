import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";
import onlineRouter from "./online";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(sessionsRouter);
router.use(leaderboardRouter);
router.use(onlineRouter);

export default router;
