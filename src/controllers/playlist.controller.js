import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // create playlist

  if (!name?.trim()) {
    throw new ApiError(400, "Please provide name");
  }

  const existed = await Playlist.find({
    owner: req.user?._id,
    name,
  });

  if (existed.length > 0) {
    throw new ApiError(400, "Playlist name is already existed");
  }

  const playlist = await Playlist.create({
    name,
    description: !description?.trim() ? "" : description,
    owner: req.user?._id,
  });

  if (!playlist) {
    throw new ApiError(400, "Playlist does not create");
  }

  return res.status(200).json(new ApiResponse(200, {}, "Playlist created"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (
    !playlistId?.trim() ||
    !videoId?.trim() ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  ) {
    throw new ApiError(400, "Playlist or video does not exist");
  }

  const existed = await Playlist.find({
    _id: playlistId,
    video: videoId,
  });

  if (existed.length > 0) {
    throw new ApiError(400, "Video Already in playlist");
  }

  const query = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $push: {
        video: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!query) {
    throw new ApiError(400, "Server error");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, query, "Video added successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // remove video from playlist
  const { playlistId, videoId } = req.params;

  if (
    !playlistId?.trim() ||
    !videoId?.trim() ||
    !isValidObjectId(playlistId) ||
    !isValidObjectId(videoId)
  ) {
    throw new ApiError(400, "Playlist or video does not exist");
  }

  const query = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        video: videoId,
      },
    },
    {
      new: true,
    }
  );

  if (!query) {
    throw new ApiError(400, "Video remove successfully");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, query, "Video remove successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //  delete playlist

  if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Playlist not found");
  }

  const response = await Playlist.findByIdAndDelete(playlistId);

  if (!response) {
    throw new ApiError(400, "Playlsit is not existed");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Play lsit remove successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!playlistId?.trim() || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Playlist not found");
  }

  const args = {};

  if (!name?.trim() && description?.trim()) {
    throw new ApiError(400, "please provide name or description");
  }

  const existed = await Playlist.find({
    owner: req.user?._id,
    name,
  });

  if (existed) {
    throw new ApiError(400, "This name is already existed");
  }

  if (name) {
    args.name = name?.trim();
  }

  if (description) {
    args.description = description?.trim();
  }

  const query = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: args,
    },
    {
      new: true,
    }
  );

  if (!query) {
    throw new ApiError(400, "Error in updation of playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, query, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
