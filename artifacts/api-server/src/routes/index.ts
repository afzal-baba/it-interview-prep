import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coursesRouter from "./courses";
import sessionsRouter from "./sessions";
import leaderboardRouter from "./leaderboard";
import codelabRouter from "./codelab";
import onlineRouter from "./online";
import searchRouter from "./search";
import adminRouter from "./admin";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(coursesRouter);
router.use(sessionsRouter);
router.use(leaderboardRouter);
router.use(codelabRouter);
router.use(onlineRouter);
router.use(searchRouter);
router.use(adminRouter);
router.use(feedbackRouter);

export default router;
