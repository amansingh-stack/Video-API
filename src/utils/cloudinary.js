import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME),
  api_key: String(process.env.CLOUDINARY_API_KEY),
  api_secret: String(process.env.CLOUDINARY_API_SECRET),
});

const uploadOnCloudnary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    // console.log("file is uploaded", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // remove temporary file from system
    return null;
  }
};

const deleteOnCloudnary = async (cloudnaryPath) => {
  try {
    if (cloudnaryPath.length == 0) return null;

    const parts = cloudnaryPath.map((value) => {
      let parts = value.split("/");
      let withExtension = parts[parts.length - 1];
      let public_id = withExtension.split(".")[0];
      return public_id;
    });

    const responseVideo = await cloudinary.api.delete_resources(parts, {
      type: "upload",
      resource_type: "video",
    });
    const response = await cloudinary.api.delete_resources(parts, {
      type: "upload",
      resource_type: "image",
    });

    return { responseVideo, response };
  } catch (error) {
    console.log(error);
    return null;
  }
};

export { uploadOnCloudnary, deleteOnCloudnary };
