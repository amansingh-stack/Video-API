import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video does not exist");
  }

  const option = {
    page,
    limit,
  };

  try {
    const commentAggregate = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                fullname: 1,
                avatar: 1,
                _id: 0,
              },
            },
          ],
        },
      },
      // {
      //   $addFields: {
      //     user: "$user_data",
      //   },
      // },
    ]);

    // const commentAggregate = await Comment.find({
    //   video: videoId,
    // }).populate({
    //   path: "owner",
    //   select: "avatar fullname",
    // });

    if (commentAggregate) {
      return res
        .status(200)
        .json(
          new ApiResponse(200, commentAggregate, "This vdeo has zero comment")
        );
    }

    const comment = Comment.aggregatePaginate(commentAggregate, option);

    if (!comment) {
      return res
        .status(200)
        .json(new ApiResponse(200, {}, "This vdeo has zero comment"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, comment, "Comments fetched successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(400, error);
  }
});

const addComment = asyncHandler(async (req, res) => {
  // add a comment to a video

  const { videoId } = req.params;
  const { content } = req.body;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video does not exist");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Please add comment");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video does not exist");
  }

  const result = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!result) {
    throw new ApiError("Comment not created due to server error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment Does not exist");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Please add comment");
  }

  const result = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(400, "Comment does not exist");
  }

  res
    .status(200)
    .json(new ApiResponse(200, result, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // delete a comment
  const { commentId } = req.params;

  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Comment Does not exist");
  }

  const result = await Comment.findByIdAndDelete(commentId);

  const commentLike = await Like.deleteMany({
    comment: commentId,
  });

  if (!result) {
    throw new ApiError(400, "Comment does not exist");
  }

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment Deleted succeesfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
