import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/UploadOnCloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};
const registerUser = async (req, res) => {
  const { fullname, email, username, password } = req.body;
  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }
  console.log(req.file);
  const avaterLocalPath = req.file?.path;
  if (!avaterLocalPath) {
    throw new ApiError(400, "Image is required");
  }
  const avatar = await uploadOnCloudinary(avaterLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Image upload failed");
  }
  const user = await User.create({
    fullname,
    email,
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
  });

  const createdUser = await User.findOne(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(400, "User Registration failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User created successfully"));
};

const loginUser = async (req, res) => {
  const { username, email, password } = req.body;
  if (!(username || email)) {
    throw new ApiError(400, "Email or username is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  const user = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });
  if (!user) {
    throw new ApiError(400, "User not found");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Incorrect password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );
  const loggedInUser = await User.findOne(user._id);
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User LoggedIn "
      )
    );
};

const logoutUser = async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
};

const refreshToken = async (req, res) => {
  const incomingToken = req.cookies.refreshToken || req.body.refreshToken;
  console.log(incomingToken, "incomingToken");
  if (!incomingToken) {
    throw new ApiError(400, "Refresh token is required");
  }
  try {
    const decodedToken = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    console.log(decodedToken, "decodedToken");
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(400, "User not found");
    }

    console.log(user, "user");
    if (user.refreshToken !== incomingToken) {
      throw new ApiError(400, "Invalid refresh token");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    console.log(refreshToken);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken,
          },
          "Access Token Refresh"
        )
      );
  } catch (error) {
    throw new ApiError(400, "Invalid refresh token at last");
  }
};

const changeCurrentPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!newPassword || !oldPassword) {
    throw new ApiError(400, "Password is required");
  }
  try {
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(400, "Incorrect password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    console.log(error.message);
    throw new ApiError(400, error.message);
  }
};

const getCurrentUser = async (req, res) => {
  const user = req.user;
  return res.status(200).json(new ApiResponse(200, { user }, "Current User"));
};

const updateUserDetails = async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "Email or fullname is required");
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(400, "User not found");
    }
    user.fullname = fullname;
    user.email = email;
    await user.save();
    res.status(200).json(
      new ApiResponse(
        200,
        {
          fullname: user.fullname,
          email: user.email,
        },
        "User Details Updated"
      )
    );
  } catch (error) {
    console.log(error.message);
    throw new ApiError(400, error.message);
  }
};

const updateAvatar = async (req, res) => {
  const avaterLocalPath = req.file.path;
  if (!avaterLocalPath) {
    throw new ApiError(400, "Image is required");
  }
  const avatar = await uploadOnCloudinary(avaterLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Image upload failed");
  }
  try {
    const user = await User.findById(req.user._id);
    user.avatar = avatar.url;
    await user.save();

    res.status(200).json(new ApiResponse(200, { user }, "Avatar updated"));
  } catch (error) {
    console.log(error.message);
    throw new ApiError(400, error.message);
  }
};

const toggleUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(400, "User not found || Please login first");
    }
    user.isAdmin = !user.isAdmin;
    await user.save();
    res.status(200).json(new ApiResponse(200, user, "Admin"));
  } catch (error) {
    throw new ApiError(400, "Error in setting user as admin");
  }
};

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateAvatar,
  toggleUserAdmin,
};
