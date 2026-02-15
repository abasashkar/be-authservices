// src/app.js
require('./config/env'); // Load .env variables

const express = require('express');
const errorHandler = require('./middleware/error.middleware');

const app = express();
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth.routes'));

// Error handler (must be last)
app.use(errorHandler);

module.exports = app; // <-- important! export the Express app
