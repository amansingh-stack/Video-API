import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudnary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Subscription } from "../models/subsciption.model.js";
import mongoose from "mongoose";

const generateAccessAndRefreshTooken = async (userId) => {
  try {
    const user = await User.findById({ _id: userId });
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshTooken();

    user.refreshToken = refreshToken;
    await user.save({
      validateBeforeSave: false,
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Something went wrong while generationg token");
  }
};

const registerUser = asyncHandler(async (req, resp) => {
  const { username, email, fullname, password } = req.body; //--> Get data

  if (
    [username, email, fullname, password].some(
      (filed) => filed?.trim() === ""
    ) ||
    [username, email, fullname, password].some((filed) => filed === undefined) //--> Add validation
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }], //--> Check user existed
  });

  console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "User Already existed with this username or email");
  }

  const avatarLoaclPath = req.files?.avatar[0]?.path; // --> Uload files
  // const coverImageLoaclPath = req.files?.coverImage[0]?.path;
  let coverImageLoaclPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLoaclPath = req.files.coverImage[0].path;
  }

  if (!avatarLoaclPath) {
    throw new ApiError(400, "Avatr is required");
  }

  const avatar = await uploadOnCloudnary(avatarLoaclPath);
  const coverImage = await uploadOnCloudnary(coverImageLoaclPath);

  if (!avatar) {
    throw new ApiError(400, "Avatr is required");
  }

  const user = await User.create({
    username: username.toLowerCase(), // --> Create User Obj
    fullname,
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // --> Check user created successfully
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wromg while registering the user");
  }

  return resp
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, resp) => {
  const { email, username, password } = req.body;
  console.log(req.body);

  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(400, "Username or email is incorrect");
  }

  const credentials = await user.isPasswordCorrect(password);
  if (!credentials) {
    throw new ApiError(400, "Invalid User");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTooken(
    user._id
  );

  const updatedUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Cookies Configuration
  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: updatedUser, accessToken, refreshToken },
        "User logged in successfully"
      ) //--> In response we send token also, because cookie is not stored in mobile application
    );
});

const logoutUser = asyncHandler(async (req, resp) => {
  const data = await User.findByIdAndUpdate(
    req.user._id,
    {
      /* $set: {
        refreshToken: undefined,
      },*/
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return resp
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, resp) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;
  if (!token) {
    throw new ApiError(401, "Empty token");
  }

  const decodetoken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  const user = await User.findById(decodetoken?._id);

  if (!user) {
    throw new ApiError(401, "Invalid Refresh Token");
  }

  if (token !== user?.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, refreshToken } = await generateAccessAndRefreshTooken(
    user._id
  );

  return resp
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
        "Access token refreshed successfully"
      )
    );
});

const changeCurrentPassword = asyncHandler(async (req, resp) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findById(req.user?._id);
  const status = await user.isPasswordCorrect(oldPassword);

  if (!status) {
    throw new ApiError(404, "Please enter Correct Password");
  }

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });

  return resp
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Succesfully"));
});

const getCurrentUser = asyncHandler(async (req, resp) => {
  return resp
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccoundDetails = asyncHandler(async (req, resp) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return resp
    .status(200)
    .json(new ApiResponse(200, user, "Details update succesfully"));
});

const updateUserAvatar = asyncHandler(async (req, resp) => {
  const avatarLoaclPath = req.file?.path;

  if (!avatarLoaclPath) {
    throw new ApiError(400, "Avatar file is missimg");
  }

  const avatar = await uploadOnCloudnary(avatarLoaclPath);

  if (!avatar) {
    throw new ApiError(400, "Api error on upload avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return resp
    .status(200)
    .json(new ApiResponse(200, user, "Avatar is Updated Successfully"));
});

const updateCoverImage = asyncHandler(async (req, resp) => {
  const coverLoaclPath = req.file?.path;

  if (!coverLoaclPath) {
    throw new ApiError(400, "cover Image file is missimg");
  }

  const avatar = await uploadOnCloudnary(coverLoaclPath);

  if (!avatar) {
    throw new ApiError(400, "Api error on upload coverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return resp
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image is Updated Successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, resp) => {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: {
                $in: [req.user?._id, "$subscribers.subscriber"],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullname: 1, //--> One means pass this value
          username: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          coverImage: 1,
          email: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new ApiError(400, "channel does not exist");
    }
    console.log(channel);

    return resp
      .status(200)
      .json(
        new ApiResponse(200, channel[0], "User Channel fetched successfully")
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, error);
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    const user = await User.aggregate([
      {
        $match: {
          _id: req.user._id,
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullName: 1,
                      username: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);
    console.log(user[0].watchHistory);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory || "empty",
          "Watch History fetched succesfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Error history");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccoundDetails,
  updateUserAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
