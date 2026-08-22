import { Router } from "express";
import { login } from "../controllers/auth.controller.js";
import prisma from "../config/prisma.js";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", login);

// Admin-only: return users that can be assigned to work orders
router.get(
  "/users",
  authenticate,
  authorize("ADMIN"),
  async (_req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Get users error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }
);

export default router;
