const express = require('express');
const router = express.Router();
const { uploadfile, uploadImage, deletefile, signGetUrl } = require('../controllers/s3controller');
const { uploadCriteriaImage } = require('../controllers/cloudinaryController');

// POST /api/upload-pdf
router.post('/upload-pdf', uploadfile);
// POST /api/upload-image
router.post('/upload-image', uploadImage);
router.post('/upload-criteria-image', uploadCriteriaImage);
// DELETE /api/delete-file
router.delete('/delete-file', deletefile);
// GET /api/sign-get
router.get('/sign-get', signGetUrl);

module.exports = router;
