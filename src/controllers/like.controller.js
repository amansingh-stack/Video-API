import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video

  if (
    !videoId?.trim() ||
    !isValidObjectId(videoId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    throw new ApiError(400, "Video does not exist");
  }

  const verifyVideo = await Video.findById(videoId);

  if (!verifyVideo) {
    throw new ApiError(400, "Video id is not exist");
  }

  const existed = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existed) {
    const dislike = await Like.findByIdAndDelete(existed._id);

    if (!dislike) {
      throw new ApiError(400, "Video does not dislike");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Video Dislike succesfully"));
  }

  const videoLike = await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  if (!videoLike) {
    throw new ApiError(400, "Server Error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Liked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (
    !commentId?.trim() ||
    !isValidObjectId(commentId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    throw new ApiError(400, "Video does not exist");
  }

  const verifyComment = await Comment.findById(commentId);

  if (!verifyComment) {
    throw new ApiError(400, "Video id is not exist");
  }

  const existed = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existed) {
    const dislike = await Like.findByIdAndDelete(existed._id);

    if (!dislike) {
      throw new ApiError(400, "Comment does not dislike");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Comment Dislike succesfully"));
  }

  const commentLike = await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (!commentLike) {
    throw new ApiError(400, "Server Error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment Liked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  try {
    const likedvideos = await Like.aggregate([
      {
        $match: {
          likedBy: req.user._id,
          video: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video",
          pipeline: [
            {
              $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "user",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      email: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                owner: {
                  $first: "$user",
                },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          video: {
            $first: "$video",
          },
        },
      },
    ]);

    if (!likedvideos) {
      throw new ApiError(400, "No Liked Videos");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, likedvideos, "Video fetched successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(400, error);
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
