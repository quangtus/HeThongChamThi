const multer = require('multer');

// Use memory storage so we can read the file buffer directly (no disk I/O)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV mime types
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv', // .csv (alternative)
      'text/plain' // .csv (some systems)
    ];
    
    // Also check file extension as fallback
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Định dạng file không hợp lệ. Vui lòng chọn file .xlsx, .xls hoặc .csv'));
    }
    cb(null, true);
  }
});

module.exports = upload;





