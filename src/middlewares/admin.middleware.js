import { ApiError } from "../utils/ApiError.js";
const adminmiddleware = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    console.log("Chandan");
    next();
  } else {
    throw new ApiError(403, "You do not have permission to change in product");
  }
};

export default adminmiddleware;
