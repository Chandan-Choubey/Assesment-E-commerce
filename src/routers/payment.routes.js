import { Router } from "express";
import {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  deletePayment,
} from "../controllers/payment.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create-payments", verifyjwt, createPayment);
router.get("/get-payments", verifyjwt, getPayments);
router.get("/get-payments/:id", verifyjwt, getPaymentById);
router.patch("/update-payments/:id/status", verifyjwt, updatePaymentStatus);
router.delete("/delete-payments/:id", verifyjwt, deletePayment);

export default router;
