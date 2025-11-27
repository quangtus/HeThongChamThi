const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

const hasCloudinaryConfig = () =>
    Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

if (hasCloudinaryConfig()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

const criteriaUploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ hỗ trợ định dạng ảnh (PNG, JPG, JPEG, SVG, WEBP)'), false);
        }
    }
});

function uploadCriteriaImage(req, res) {
    if (!hasCloudinaryConfig()) {
        return res.status(500).json({
            success: false,
            message: 'Cloudinary chưa được cấu hình. Vui lòng kiểm tra biến môi trường.'
        });
    }

    criteriaUploader.single('file')(req, res, async(err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'Upload ảnh thất bại'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy file tải lên'
            });
        }

        try {
            const folder = req.body?.folder || process.env.CLOUDINARY_UPLOAD_FOLDER || 'grading/criteria';
            const questionNo = req.body?.questionNo || 'general';
            const criterionNo = req.body?.criterionNo || Date.now();
            const publicIdBase = `criterion_q${questionNo}_${criterionNo}`;

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder,
                        public_id: publicIdBase,
                        overwrite: false,
                        resource_type: 'image',
                        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );
                uploadStream.end(req.file.buffer);
            });

            return res.json({
                success: true,
                url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
                width: uploadResult.width,
                height: uploadResult.height,
                bytes: uploadResult.bytes,
                format: uploadResult.format
            });
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
                success: false,
                message: 'Không thể tải ảnh lên Cloudinary',
                error: error.message
            });
        }
    });
}

module.exports = {
    uploadCriteriaImage
};

