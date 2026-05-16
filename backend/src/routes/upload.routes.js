const express = require('express');
const { uploadStatement } = require('../controllers/upload.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/multer.middleware');

const router = express.Router();

// POST /api/upload — requires auth, attaches single statement file (CSV/PDF)
router.post('/', protect, upload.single('file'), uploadStatement);

module.exports = router;
