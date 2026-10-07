const express = require('express');
const taskRoutes = require('./routes/taskRoutes');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(requestLogger);
app.use(express.json());
app.use('/tasks', taskRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
