import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/create-products",
  verifyjwt,
  upload.single("product"),
  createProduct
);
router.get("/get-products", getProducts);
router.get("/get-products/:id", getProductById);
router.patch(
  "/update-products/:id",
  verifyjwt,
  upload.single("image"),
  updateProduct
);
router.delete("/delete-products/:id", verifyjwt, deleteProduct);

export default router;
