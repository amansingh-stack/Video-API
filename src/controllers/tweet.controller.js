import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content?.trim()) throw new ApiError(400, "Plz provide content");

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(400, "Server error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const { userId } = req.params;

  if (!userId?.trim() || !isValidObjectId(userId)) {
    throw new ApiError(400, "User does not exist");
  }

  const userTweet = await Tweet.find({
    owner: userId,
  });

  if (!userTweet) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User don't have tweet"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userTweet, "User fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!tweetId?.trim || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet ID not exist");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Plz provide data");
  }

  const updateQuery = await Tweet.findByIdAndUpdate(tweetId, {
    $set: {
      content,
    },
  });

  if (!updateQuery) {
    throw new ApiError(400, "Tweet not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet updated succesfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!tweetId?.trim || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet ID not exist");
  }

  const delteQuery = await Tweet.findByIdAndDelete(tweetId);

  if (!delteQuery) {
    throw new ApiError(400, "Tweet not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted succesfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
