const express = require('express');
const { detectSubscriptions, getSubscriptions, getUpcoming, deleteSubscription } = require('../controllers/subscription.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/',           getSubscriptions);
router.post('/detect',    detectSubscriptions);
router.get('/upcoming',   getUpcoming);
router.delete('/:id',     deleteSubscription);

module.exports = router;
