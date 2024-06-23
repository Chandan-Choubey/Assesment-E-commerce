import { Router } from "express";
import {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderByUserId,
} from "../controllers/order.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create-orders", verifyjwt, createOrder);
router.get("/get-orders", verifyjwt, getOrders);
router.get("/get-orders/:id", verifyjwt, getOrderById);
router.get("/get-orders-by-user/:id", verifyjwt, getOrderByUserId);
router.patch("/update-orders/:id/status", verifyjwt, updateOrderStatus);
router.delete("/delete-orders/:id", verifyjwt, deleteOrder);

export default router;
