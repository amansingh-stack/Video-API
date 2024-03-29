import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subsciption.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const userId = req.user?._id;
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const userId = req.user._id;

  const result = await Video.find({ owner: userId });

  res.status(200).json(new ApiResponse(200, result, "All videos"));
});

export { getChannelStats, getChannelVideos };
