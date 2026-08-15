import { Router, type IRouter } from "express";
import healthRouter from "./health";
import coursesRouter from "./courses";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(coursesRouter);
router.use(sessionsRouter);
router.use(leaderboardRouter);

export default router;
