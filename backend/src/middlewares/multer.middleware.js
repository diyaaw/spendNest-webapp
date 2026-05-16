const multer = require('multer');

// memoryStorage: file is kept in memory as a Buffer — never written to disk.
// We pass it straight to the FastAPI ML service.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isAllowed =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.csv') ||
    file.originalname.toLowerCase().endsWith('.pdf');

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv and .pdf files are accepted'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

module.exports = upload;
