import Payment from "../models/payment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Order from "../models/order.model.js";
import mongoose from "mongoose";
import nock from "nock";
import fetch from "node-fetch";

nock("https://api.stripe.com").post("/v1/payment_intents").reply(200, {
  id: "",
  status: "succeeded",
  amount: 2000,
  currency: "IND",
});

const getTheAmount = async (userId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "User ID is not valid");
    }

    const pipeline = [
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          orderIds: { $push: "$_id" },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          orderIds: 1,
        },
      },
    ];

    const result = await Order.aggregate(pipeline);

    if (!result || result.length === 0 || !result[0].totalAmount) {
      throw new ApiError(
        404,
        "No orders found or total amount is zero for the user"
      );
    }

    return {
      totalAmount: result[0].totalAmount,
      orderId: result[0].orderIds[0],
    };
  } catch (error) {
    console.error("Error in getTheAmount:", error);
    throw new ApiError(
      error.status || 500,
      error.message || "Failed to fetch amount"
    );
  }
};

const createPayment = async (req, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const { totalAmount, orderId } = await getTheAmount(req.user?._id);

    if (!totalAmount) {
      throw new ApiError(400, "Amount is required");
    }

    if (!paymentMethod) {
      throw new ApiError(400, "Payment method is required");
    }

    const stripeResponse = await fetch(
      "https://api.stripe.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: totalAmount * 100, // Stripe expects amount in cents
          currency: "inr", // Adjust currency as per your requirement
          payment_method_types: ["card"],
        }),
      }
    );

    if (!stripeResponse.ok) {
      const errorData = await stripeResponse.json();
      throw new ApiError(stripeResponse.status, errorData.error.message);
    }

    const stripeData = await stripeResponse.json();

    const payment = new Payment({
      user: req.user._id,
      order: orderId,
      amount: totalAmount,
      status: "Completed",
      paymentMethod,
    });

    await payment.save();

    res.status(201).json({
      message: "Payment created successfully",
      payment: payment.toObject(),
      stripeData: stripeData,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    next(new ApiError(500, error.message || "Failed to create payment intent"));
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("user")
      .populate("order");

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, payment, "Payment retrieved successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find().populate("user").populate("order");

    return res
      .status(200)
      .json(new ApiResponse(200, payments, "Payments retrieved successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, payment, "Payment status updated successfully")
      );
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Payment deleted successfully"));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

export {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  deletePayment,
};
