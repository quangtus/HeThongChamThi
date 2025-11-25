const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
});

const s3 = new AWS.S3({
    signatureVersion: 'v4',
    s3ForcePathStyle: true,
    endpoint: `https://s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`
});

const createUploader = ({ mimetypes, maxSizeMb = 10 }) => multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: maxSizeMb * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (mimetypes.some(type => file.mimetype === type || file.mimetype.startsWith(type))) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
    }
});

const pdfUploader = createUploader({ mimetypes: ['application/pdf'], maxSizeMb: 15 });
const imageUploader = createUploader({ mimetypes: ['image/'], maxSizeMb: 8 });

// Slugify helper for Vietnamese titles and codes
function slugify(input = '') {
    try {
        return String(input)
            .normalize('NFD')
            .replace(/\p{Diacritic}+/gu, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();
    } catch (e) {
        return String(input).replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    }
}

function buildFileKey(folder, originalName) {
    const safeFolder = (folder || '').replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '-');
    const timestamp = Date.now();
    const segment = safeFolder ? `${safeFolder}/` : '';
    return `${segment}${timestamp}-${base}${ext}`;
}

async function uploadToS3({ buffer, mimetype, key }) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('Missing AWS credentials');
    }
    if (!process.env.AWS_S3_BUCKET) {
        throw new Error('Missing AWS bucket configuration');
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: encodeURI(key),
        Body: buffer,
        ContentType: mimetype,
        ACL: 'public-read',
        Metadata: {
            'upload-date': new Date().toISOString()
        }
    };

    const result = await s3.upload(params).promise();
    return { location: result.Location, key };
}

// Handle PDF upload
async function uploadfile(req, res) {
    pdfUploader.single('file')(req, res, async(err) => {
        try {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            // Allow custom naming: de_thi_<MADETHI>_<TENDETHI>.pdf
            const ext = path.extname(req.file.originalname) || '.pdf';
            const code = req.body?.examCode || req.body?.code || req.body?.id || '';
            const title = req.body?.examTitle || req.body?.title || '';
            const fileKey = (code || title)
                ? `pdf/de_thi_${slugify(code)}_${slugify(title)}${ext}`
                : buildFileKey('pdf', req.file.originalname);
            const result = await uploadToS3({
                buffer: req.file.buffer,
                mimetype: 'application/pdf',
                key: fileKey
            });

            res.json({
                success: true,
                url: result.location,
                key: result.key
            });
        } catch (error) {
            console.error('S3 upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Error uploading file to S3',
                error: error.message
            });
        }
    });
}

async function uploadImage(req, res) {
    imageUploader.single('file')(req, res, async(err) => {
        try {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            const folder = req.body.folder || req.query.folder || 'images';
            const ext = path.extname(req.file.originalname) || '';
            const code = req.body?.examCode || req.query?.examCode || '';
            const title = req.body?.examTitle || req.query?.examTitle || '';
            const questionNo = req.body?.questionNo || req.query?.questionNo;
            const imageNo = req.body?.imageNo || req.query?.imageNo;
            const key = (code && title && questionNo != null && imageNo != null)
                ? `${folder ? folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\\+/g, '/').replace(/^\\|\/$/g, '') + '/' : ''}${slugify(code)}-${slugify(title)}-cau${String(questionNo)}-hinh${String(imageNo)}${ext}`
                : buildFileKey(folder, req.file.originalname);
            const result = await uploadToS3({
                buffer: req.file.buffer,
                mimetype: req.file.mimetype,
                key
            });

            res.json({
                success: true,
                url: result.location,
                key: result.key
            });
        } catch (error) {
            console.error('S3 image upload error:', error);
            res.status(500).json({
                success: false,
                message: 'Error uploading image to S3',
                error: error.message
            });
        }
    });
}

async function deletefile(req, res) {
    try {
        const key = req.body?.key || req.query?.key;
        if (!key) {
            return res.status(400).json({ success: false, message: 'Missing file key' });
        }

        await s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key
        }).promise();

        res.json({ success: true, message: 'File deleted successfully' });
    } catch (error) {
        console.error('S3 delete error:', error);
        res.status(500).json({ success: false, message: 'Error deleting file from S3', error: error.message });
    }
}

// Generate a presigned GET URL for a given key or URL
function extractKeyFromUrl(url) {
    try {
        const u = new URL(url);
        // Patterns:
        // 1) https://bucket.s3.<region>.amazonaws.com/key
        // 2) https://s3.<region>.amazonaws.com/bucket/key
        // 3) http(s)://<custom-domain>/<key>
        const parts = u.pathname.split('/').filter(Boolean);
        if (!parts.length) return null;
        // If first path segment is bucket name (pattern 2)
        const host = u.hostname;
        if (/^s3[.-]/.test(host)) {
            // s3.amazonaws.com/bucket/key...
            return decodeURI(parts.slice(1).join('/'));
        }
        // Otherwise it is likely bucket.s3.amazonaws.com/key or custom domain
        return decodeURI(parts.join('/'));
    } catch (e) {
        return null;
    }
}

async function signGetUrl(req, res) {
    try {
        const rawKey = req.query.key || extractKeyFromUrl(req.query.url || '');
        if (!rawKey) return res.status(400).json({ success: false, message: 'Missing key or url' });
        if (!process.env.AWS_S3_BUCKET) {
            throw new Error('Missing AWS bucket configuration');
        }
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: rawKey,
            Expires: 60 * 60, // 1h
        };
        const url = s3.getSignedUrl('getObject', params);
        return res.json({ success: true, url, key: rawKey });
    } catch (error) {
        console.error('S3 sign error:', error);
        res.status(500).json({ success: false, message: 'Error creating signed URL', error: error.message });
    }
}

module.exports = { uploadfile, uploadImage, deletefile, signGetUrl };
