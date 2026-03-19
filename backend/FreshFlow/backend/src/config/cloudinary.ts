import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (
  file: Express.Multer.File,
  folder: string = 'freshflow'
): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' },
        { format: 'webp' }
      ]
    });
    
    logger.info(`Image uploaded successfully: ${result.public_id}`);
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Image upload failed');
  }
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted successfully: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Image deletion failed');
  }
};

export default cloudinary;