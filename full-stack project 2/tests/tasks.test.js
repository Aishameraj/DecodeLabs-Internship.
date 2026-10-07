const request = require('supertest');
const app = require('../src/app');
const { tasks } = require('../src/data/tasks');

beforeEach(() => {
  tasks.length = 0;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

async function createTask(body = { title: 'Learn Express' }) {
  const response = await request(app).post('/tasks').send(body).expect(201);
  return response.body.data;
}

test('lists an empty collection', async () => {
  const response = await request(app).get('/tasks').expect(200);
  expect(response.body).toEqual({ data: [] });
});

test('creates a trimmed title, defaults, timestamp and location', async () => {
  const response = await request(app).post('/tasks').send({ title: ' Learn Express ' }).expect(201);
  const task = response.body.data;
  expect(task).toEqual({ id: expect.any(Number), title: 'Learn Express', description: '', completed: false, createdAt: expect.any(String) });
  expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  expect(response.headers.location).toBe(`/tasks/${task.id}`);
});

test('fetches an existing task', async () => {
  const task = await createTask();
  const response = await request(app).get(`/tasks/${task.id}`).expect(200);
  expect(response.body).toEqual({ data: task });
});

test.each(['get', 'put', 'delete'])('%s missing task returns 404', async (method) => {
  const response = await request(app)[method]('/tasks/999999').send({ title: 'Missing' }).expect(404);
  expect(response.body).toEqual({ error: 'Task not found' });
});

test.each([{}, { title: '' }, { title: '  ' }, { title: 5 }, { title: null }, { title: 'Task', completed: 'false' }, { title: 'Task', description: 5 }, { title: 'Task', id: 10 }, { title: 'Task', createdAt: 'yesterday' }, { title: 'Task', extra: true }, []])('rejects invalid creation body %j', async (body) => {
  const response = await request(app).post('/tasks').send(body).expect(400);
  expect(response.body).toEqual({ error: expect.any(String) });
  expect(tasks).toHaveLength(0);
});

test('updates supplied fields and preserves server fields', async () => {
  const task = await createTask();
  const response = await request(app).put(`/tasks/${task.id}`).send({ title: ' Updated ', description: 'Practice', completed: true }).expect(200);
  expect(response.body.data).toEqual({ ...task, title: 'Updated', description: 'Practice', completed: true });
  const partial = await request(app).put(`/tasks/${task.id}`).send({ completed: false }).expect(200);
  expect(partial.body.data).toEqual({ ...response.body.data, completed: false });
});

test.each([{}, { title: ' ' }, { description: null }, { completed: 1 }, { id: 7 }, { createdAt: 'changed' }])('rejects invalid update %j without changing task', async (body) => {
  const task = await createTask();
  await request(app).put(`/tasks/${task.id}`).send(body).expect(400);
  const response = await request(app).get(`/tasks/${task.id}`).expect(200);
  expect(response.body.data).toEqual(task);
});

test('deletes with no body and does not reuse IDs', async () => {
  const task = await createTask();
  const response = await request(app).delete(`/tasks/${task.id}`).expect(204);
  expect(response.text).toBe('');
  await request(app).get(`/tasks/${task.id}`).expect(404);
  const next = await createTask();
  expect(next.id).toBeGreaterThan(task.id);
});

test.each(['true', 'false'])('filters completed=%s', async (completed) => {
  const done = await createTask({ title: 'Done', completed: true });
  const pending = await createTask();
  const response = await request(app).get(`/tasks?completed=${completed}`).expect(200);
  expect(response.body.data).toEqual([completed === 'true' ? done : pending]);
});

test.each(['completed=hello', 'completed=', 'completed=true&completed=false', 'page=0', 'page=1.5', 'limit=-1', 'limit=abc', 'page=1&page=2', 'page=9007199254740992'])('rejects invalid query %s', async (query) => {
  await request(app).get(`/tasks?${query}`).expect(400);
});

test('paginates after filtering and reports totals', async () => {
  await createTask({ title: 'Done', completed: true });
  await createTask();
  const last = await createTask({ title: 'Also done', completed: true });
  const response = await request(app).get('/tasks?completed=true&page=2&limit=1').expect(200);
  expect(response.body).toEqual({ data: [last], pagination: { page: 2, limit: 1, total: 2, totalPages: 2 } });
  const beyond = await request(app).get('/tasks?page=99&limit=1').expect(200);
  expect(beyond.body.data).toEqual([]);
});

test.each(['abc', '0', '-1', '1.5', '1abc', '9007199254740992'])('rejects invalid task ID %s', async (id) => {
  await request(app).get(`/tasks/${id}`).expect(400);
});

test('handles malformed JSON and remains usable', async () => {
  const response = await request(app).post('/tasks').set('Content-Type', 'application/json').send('{"title":').expect(400);
  expect(response.body).toEqual({ error: 'Malformed JSON body' });
  await request(app).get('/tasks').expect(200);
});

test('rejects missing body', async () => {
  await request(app).post('/tasks').expect(400);
});

test('returns JSON for unknown routes', async () => {
  const response = await request(app).get('/unknown').expect(404);
  expect(response.body).toEqual({ error: 'Route not found' });
});

test('logs timestamp, method and URL', async () => {
  await request(app).get('/tasks?completed=false').expect(200);
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/^\[\d{4}-.*Z\] GET \/tasks\?completed=false$/));
});

test('unexpected controller failure returns generic 500 without internal details', async () => {
  jest.spyOn(tasks, 'find').mockImplementationOnce(() => { throw new Error('private internal details'); });
  const response = await request(app).get('/tasks/1').expect(500);
  expect(response.body).toEqual({ error: 'Internal server error' });
});
