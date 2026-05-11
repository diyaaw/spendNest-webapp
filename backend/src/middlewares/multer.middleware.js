const multer = require('multer');

// memoryStorage: file is kept in memory as a Buffer — never written to disk.
// We pass it straight to the FastAPI ML service.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.originalname.toLowerCase().endsWith('.csv');

  if (isCsv) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are accepted'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

module.exports = upload;
