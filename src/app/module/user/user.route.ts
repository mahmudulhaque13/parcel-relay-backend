import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { userController } from "./user.controller";

const router = Router();

router.get("/", auth(UserRole.ADMIN), userController.getAllUsers);

export const userRoutes = router;
