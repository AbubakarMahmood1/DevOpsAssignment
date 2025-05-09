// First load tracing - must be first import
require('./tracing');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const promClient = require('prom-client');

// Initialize Express app
const app = express();
const port = process.env.PORT || 5000;

// Create a Registry to register the metrics
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Register the metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestCounter);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Middleware to track request duration and count
app.use((req, res, next) => {
  const start = Date.now();
  
  // Add a 'end' listener to track the response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip metrics endpoint itself
    if (req.path !== '/metrics') {
      const route = req.route ? req.route.path : req.path;
      
      // Record metrics
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode)
        .observe(duration / 1000); // Convert to seconds
      
      httpRequestCounter
        .labels(req.method, route, res.statusCode)
        .inc();
    }
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MongoDB URI from environment variable
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://f219462:Oxje3dcOEJMizPRz@cluster0.0di5q.mongodb.net/ToDo?retryWrites=true&w=majority&appName=Cluster0';

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Create Todo Schema
const todoSchema = new mongoose.Schema({
  task: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

// Create Todo Model
const Todo = mongoose.model('Todo', todoSchema);

// CRUD Operations

// Get all Todos
app.get('/todos', async (req, res) => {
  try {
    const todos = await Todo.find();
    res.json(todos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a Todo
app.post('/todos', async (req, res) => {
  const todo = new Todo({
    task: req.body.task,
    completed: req.body.completed || false
  });

  try {
    const newTodo = await todo.save();
    res.status(201).json(newTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a Todo
app.put('/todos/:id', async (req, res) => {
  try {
    const updatedTodo = await Todo.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTodo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a Todo
app.delete('/todos/:id', async (req, res) => {
  try {
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Todo deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});