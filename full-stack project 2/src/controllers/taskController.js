const { tasks, generateId } = require('../data/tasks');

function listTasks(req, res) {
  const { completed, page, limit } = req.query;
  let results = tasks;
  if (completed !== undefined) {
    if (completed !== 'true' && completed !== 'false') {
      return res.status(400).json({ error: 'Completed filter must be true or false' });
    }
    results = results.filter((task) => task.completed === (completed === 'true'));
  }

  if (page !== undefined || limit !== undefined) {
    const pageValue = page === undefined ? '1' : page;
    const limitValue = limit === undefined ? '10' : limit;
    const validNumber = (value) => typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));
    if (!validNumber(pageValue) || !validNumber(limitValue)) {
      return res.status(400).json({ error: 'Page and limit must be positive safe integers' });
    }
    const pageNumber = Number(pageValue);
    const pageSize = Number(limitValue);
    const total = results.length;
    const start = (pageNumber - 1) * pageSize;
    return res.json({
      data: results.slice(start, start + pageSize),
      pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  }
  res.json({ data: results });
}

function findTask(req, res, next, id) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ error: 'Task ID must be a positive safe integer' });
  }
  req.task = tasks.find((task) => task.id === Number(id));
  if (!req.task) return res.status(404).json({ error: 'Task not found' });
  next();
}

function getTask(req, res) {
  res.json({ data: req.task });
}

function createTask(req, res) {
  const task = {
    id: generateId(),
    title: req.body.title.trim(),
    description: req.body.description ?? '',
    completed: req.body.completed ?? false,
    createdAt: new Date().toISOString()
  };
  tasks.push(task);
  res.location(`/tasks/${task.id}`).status(201).json({ data: task });
}

function updateTask(req, res) {
  const { title, description, completed } = req.body;
  if (title !== undefined) req.task.title = title.trim();
  if (description !== undefined) req.task.description = description;
  if (completed !== undefined) req.task.completed = completed;
  res.json({ data: req.task });
}

function deleteTask(req, res) {
  tasks.splice(tasks.indexOf(req.task), 1);
  res.status(204).end();
}

module.exports = { listTasks, findTask, getTask, createTask, updateTask, deleteTask };
