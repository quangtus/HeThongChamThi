const multer = require('multer');

// Use memory storage so we can read the file buffer directly (no disk I/O)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // accept excel mime types
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Định dạng file không hợp lệ. Vui lòng chọn file .xlsx'));
    }
    cb(null, true);
  }
});

module.exports = upload;





