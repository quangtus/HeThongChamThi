const AWS = require('aws-sdk');

const region = process.env.AWS_REGION || 'us-east-1';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region
});

const s3 = new AWS.S3({
  signatureVersion: 'v4',
  s3ForcePathStyle: true,
  endpoint: `https://s3.${region}.amazonaws.com`
});

function extractS3Key(value) {
  if (!value) return null;
  const decoded = decodeURI(value);
  if (!/^https?:\/\//i.test(decoded)) {
    return decoded.replace(/^\/+/, '');
  }
  try {
    const url = new URL(decoded);
    return url.pathname.replace(/^\/+/, '');
  } catch (err) {
    return decoded;
  }
}

async function deleteS3Objects(keys = []) {
  if (!Array.isArray(keys) || !keys.length) return;
  const bucket = process.env.AWS_S3_BUCKET;


  const CHUNK_SIZE = 1000;
  const chunks = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    chunks.push(keys.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const params = {
        Bucket: bucket,
        Delete: { Objects: chunk.map((k) => ({ Key: k })) }
      };
      try {
        await s3.deleteObjects(params).promise();
        console.log(`Deleted ${chunk.length} objects from S3`);
      } catch (error) {
        // If batch delete fails, fall back to deleting items individually and log errors
        console.warn('Batch S3 delete failed, falling back to per-object delete:', error.message);
      }
    })
  );
}

module.exports = {
  s3,
  extractS3Key,
  deleteS3Objects
};
