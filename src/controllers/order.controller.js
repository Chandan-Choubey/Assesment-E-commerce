import mongoose from "mongoose";
import Order from "../models/order.model.js";
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
    const { user, products, totalAmount } = req.body;
    if (!user || !products || !totalAmount) {
      throw new ApiError(
        400,
        "User, products and totalAmount are required fields"
      );
    }
    const order = new Order({
      user,
      products,
      totalAmount,
      status: "Shipped",
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
      .populate("user")
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

export { createOrder, getOrderById, getOrders, updateOrderStatus, deleteOrder };
