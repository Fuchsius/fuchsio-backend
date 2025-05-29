const express = require('express');
const router = express.Router();

// Import route modules
const exampleRoutes = require('./example');

// Use route modules
router.use('/examples', exampleRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Fuchsio Backend API v1',
    endpoints: {
      examples: '/api/v1/examples',
      health: '/health'
    },
    documentation: 'Add your API documentation URL here'
  });
});

module.exports = router;
