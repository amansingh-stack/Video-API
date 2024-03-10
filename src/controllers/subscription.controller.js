import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subsciption.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // TODO: toggle subscription
  if (!channelId?.trim() || !isValidObjectId(channelId)) {
    throw new ApiError("video does not exist");
  }

  const existed = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (existed) {
    const unscribe = await Subscription.findByIdAndDelete(existed?._id);

    if (!unscribe) {
      throw new ApiError(400, "Error in unscribe");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel unscribe succesfully"));
  }

  const result = await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (!result) {
    throw new ApiError(400, "Server error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Channel subscribe succesfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId?.trim() || !isValidObjectId(channelId)) {
    throw new ApiError("Channel does not exist");
  }

  const result = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $count: "Followers",
    },
  ]);

  if (!result) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "Channel not subscribe by anyone"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Followers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId?.trim() || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Subscribe does not exist");
  }

  const result = await Subscription.find({
    subscriber: subscriberId,
  }).populate({
    path: "channel",
    select: "fullname avatar",
  });

  if (!result) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User  not subscribe any channel"));
  }
  return res
    .status(200)
    .json(new ApiResponse(200, result, "User  subscribe channels"));
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
