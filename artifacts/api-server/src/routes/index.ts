import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sweetestScoopRouter from "./sweetest-scoop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sweetestScoopRouter);

export default router;
