import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import nock from "nock";
import axios from "axios";

nock("https://api.goshippo.com").post("/shipments").reply(200, {
  object: "Shipment",
  status: "SUCCESS",
  carrier: "USPS",
  tracking_number: "123456789",
});

const createOrder = async (req, res, next) => {
  try {
    const { products } = req.body;
    const user = req.user?._id;
    if (
      !user ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      throw new ApiError(400, "User and products are required fields");
    }

    let totalAmount = 0;
    for (const productItem of products) {
      const product = await Product.findById(productItem.product);

      if (!product) {
        throw new ApiError(404, `Product not found: ${productItem.product}`);
      }
      const quantity = parseInt(productItem.quantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        throw new ApiError(
          400,
          `Invalid quantity for product: ${productItem.product}`
        );
      }
      totalAmount += product.price * quantity;
    }
    const order = new Order({
      user,
      products,
      totalAmount,
      status: "Pending",
    });

    try {
      await order.save();
      const response = await axios.post(`https://api.goshippo.com/shipments`, {
        headers: {
          Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      console.log(response.data, "response.data");
      order.status = "Shipped";
      await order.save();
    } catch (error) {
      console.log("Error saving order");
      throw new ApiError(400, error.message);
    }
    return res
      .status(201)
      .json(new ApiResponse(201, order, "Order created successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const orderId = new mongoose.Types.ObjectId(req.params.id);
    if (!orderId) {
      throw new ApiError(400, "Invalid order id");
    }
    const order = await Order.findById(orderId)
      .populate({
        path: "user",
        select: "-password -refreshToken",
      })
      .populate("products.product");

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order retrieved successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const getOrderByUserId = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    if (!userId) {
      throw new ApiError(400, "User is not authenticated");
    }

    const orders = await Order.find({
      user: new mongoose.Types.ObjectId(userId),
    }).populate({
      path: "user",
      select: "-password -refreshToken",
    });
    console.log(orders);

    if (!orders) {
      throw new ApiError(404, "No Orders found with this user");
    }

    res.status(200).json(new ApiResponse(200, orders, "order found"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate("user")
      .populate("products.product");

    return res
      .status(200)
      .json(new ApiResponse(200, orders, "Orders retrieved successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      throw new ApiError(400, "Status is required field");
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order status updated successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndDelete(
      new mongoose.Types.ObjectId(req.params.id)
    );

    if (!order) {
      throw new ApiError(404, "Order not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Order deleted successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

export {
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getOrderByUserId,
};
