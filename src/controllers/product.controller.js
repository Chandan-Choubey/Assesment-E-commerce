import Product from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/UploadOnCloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createProduct = async (req, res) => {
  const { name, description, price, stock, category } = req.body;
  if (!name || !description || !price || !stock || !category) {
    throw new ApiError(400, "All fields are required");
  }

  const imageLocalPath = req.file.path;
  if (!imageLocalPath) {
    throw new ApiError(400, "Image is required");
  }

  const image = await uploadOnCloudinary(imageLocalPath);
  if (!image) {
    throw new ApiError(400, "Image upload failed");
  }

  const product = await Product.create({
    name,
    description,
    price,
    stock,
    category,
    imageUrl: image.url,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
};

const getProducts = async (req, res) => {
  const products = await Product.find();
  return res
    .status(200)
    .json(new ApiResponse(200, products, "Products retrieved successfully"));
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category } = req.body;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  if (req.file) {
    const imageLocalPath = req.file.path;
    const image = await uploadOnCloudinary(imageLocalPath);
    if (!image) {
      throw new ApiError(400, "Image upload failed");
    }
    product.imageUrl = image.url;
  }

  product.name = name || product.name;
  product.description = description || product.description;
  product.price = price || product.price;
  product.stock = stock || product.stock;
  product.category = category || product.category;

  await product.save();
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product deleted successfully"));
};

export {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
