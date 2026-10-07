function validateTask(req, res, next) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Body must be a JSON object' });
  }

  const allowedFields = ['title', 'description', 'completed'];
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    return res.status(400).json({ error: 'Only title, description and completed may be supplied' });
  }
  if (req.method === 'POST' && body.title === undefined) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return res.status(400).json({ error: 'Title must be a non-empty string' });
  }
  if (body.description !== undefined && typeof body.description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }
  if (body.completed !== undefined && typeof body.completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed must be a boolean' });
  }
  if (req.method === 'PUT' && Object.keys(body).length === 0) {
    return res.status(400).json({ error: 'Supply at least one task field to update' });
  }
  next();
}

module.exports = validateTask;
