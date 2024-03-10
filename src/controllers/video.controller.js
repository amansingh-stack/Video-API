import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudnary, deleteOnCloudnary } from "../utils/cloudinary.js";
import fs from "fs";

const getAllVideos = asyncHandler(async (req, res) => {
  // get all videos based on query, sort, pagination
  // pending
  try {
    const {
      page = 1,
      limit = 10,
      query,
      sortBy = -1,
      sortType = "createdAt",
      userId,
    } = req.query;

    const option = {
      page,
      limit,
    };

    let pipelineArray = [];

    if (userId) {
      if (isValidObjectId(userId)) {
        pipelineArray.push({
          $match: {
            owner: new mongoose.Types.ObjectId(userId),
          },
        });
      } else {
        throw new ApiError(200, "User Does not exist");
      }
    }

    pipelineArray.push({
      $match: {
        isPublished: true,
      },
    });

    pipelineArray.push({
      $sort: {
        [sortType]: Number(sortBy),
      },
    });

    const videosAggregate = Video.aggregate(pipelineArray);

    const videos = await Video.aggregatePaginate(videosAggregate, option);
    if (!videos) {
      throw new ApiError(400, "Server Error");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, videos, "Video get successfully"));
  } catch (error) {
    console.log(error);
  }
});

const publishAVideo = asyncHandler(async (req, res) => {
  //  get video, upload to cloudinary, create video

  const { title, description } = req.body;
  if (
    !title?.trim() ||
    !description?.trim() ||
    Object.keys(req.files).length <= 1
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const videoLocalPath = req.files?.videoFile[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  const video = await uploadOnCloudnary(videoLocalPath);
  const thumbnail = await uploadOnCloudnary(thumbnailLocalPath);

  if (!video || !thumbnail) {
    throw new ApiError(400, "Error in uploading video or thumbnail");
  }

  const response = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnail.url,
    owner: req.user._id,
    title,
    description,
    duration: video.duration,
  });

  res
    .status(200)
    .json(new ApiResponse(200, response, "Video Published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  // get video by id
  const { videoId } = req.params;

  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not exist");
  }

  // const video = await Video.aggregate([
  //   {
  //     $match: {
  //       _id: new mongoose.Types.ObjectId(videoId),
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "users",
  //       localField: "owner",
  //       foreignField: "_id",
  //       as: "owner",
  //       pipeline: [
  //         {
  //           $project: {
  //             username: 1,
  //             fullname: 1,
  //             avatar: 1,
  //             _id: 0,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $addFields: {
  //       owner: "$owner",
  //     },
  //   },
  // ]);

  // Another way

  const video = await Video.findById({ _id: videoId }).populate({
    path: "owner",
    select: "username fullName email avatar",
  });

  if (video.length == 0) {
    throw new ApiError(400, "Video Does not exist");
  }

  video.views += 1;
  await video.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, video, "Video Requested"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // update video details like title, description, thumbnail
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not exist");
  }

  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "All fields are required");
  }

  let thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }
  const existed = await Video.findById(videoId);

  if (!existed) {
    fs.unlinkSync(thumbnailLocalPath);
    throw new ApiError(400, "Video is not existed");
  }
  const thumbnail = await uploadOnCloudnary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "Error in uploading image");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url,
      },
    },
    { new: true }
  );

  if (!video) {
    throw new ApiError(400, "Server Error");
  }

  const oldvideo = await deleteOnCloudnary([existed.thumbnail]);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Detail updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  // delete video

  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not exist");
  }

  const result = await Video.findByIdAndDelete(videoId);

  if (!result) {
    throw new ApiError(400, "Error in Deleting Video");
  }

  await deleteOnCloudnary([result.thumbnail, result.videoFile]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video delete successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Video Id is not exist");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video does not exist");
  }

  let status = video.isPublished; // or --> video.isPublished = !video.isPublished

  video.isPublished = status ? false : true;

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Vdeo status changed"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
