import { UploadApiResponse } from 'cloudinary';

import cloudinary from '../lib/cloudinary';

interface IUploadToCloudinary {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
}

const uploadToCloudinary = async ({
  buffer,
  folder,
  publicId,
  resourceType = 'auto',
}: IUploadToCloudinary): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        ...(publicId && {
          public_id: publicId,
        }),
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary upload failed'));
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
};

export const cloudinaryUtils = {
  uploadToCloudinary,
};
