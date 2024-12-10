// server.js
const express = require('express');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Load routes
app.use('/', routes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
