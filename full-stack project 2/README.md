# Task Management REST API

## About the Project

A small Node.js and Express API demonstrating backend fundamentals: RESTful CRUD routes, validation, centralized error handling, completion filtering, pagination, request logging, and automated API tests. Written in JavaScript with Jest and Supertest; Nodemon is used for development.

Tasks live in a JavaScript array. The collection starts empty, and **all data is lost when the server restarts**. IDs increase during each server run and are not reused after deletion. This project runs as a single process with no database.

## Project Structure

```text
src/
  controllers/taskController.js
  data/tasks.js
  middleware/errorHandler.js
  middleware/requestLogger.js
  middleware/validateTask.js
  routes/taskRoutes.js
  app.js
tests/tasks.test.js
server.js
package.json
package-lock.json
.gitignore
README.md
```

Routes select the controller, middleware validates requests, and controllers read or update the array. `app.js` exports the Express application so tests can exercise it without starting the normal server.

## Installation

Install Node.js 22 or newer with npm. Replace the repository placeholder with your own URL:

```bash
git clone <repository-url> project-2-task-api
cd project-2-task-api
npm install
```

If you already have this folder, open a terminal here and run `npm install`. Use `npm ci` for an installation matching the included lockfile exactly.

## Running the Project

```bash
npm start
```

For automatic restarts while developing:

```bash
npm run dev
```

Base URL: `http://localhost:3000`. Set the `PORT` environment variable to change the port (PowerShell: `$env:PORT=3001`). Stop the server with Ctrl+C.

## Running Tests

```bash
npm test
```

Tests clear the in-memory array before each case and cover CRUD, input errors, immutable fields, filtering, pagination, logging, malformed JSON, and generic server errors.

## API Documentation

Send request bodies with `Content-Type: application/json`. Successful JSON responses use `{ "data": ... }`; errors use `{ "error": "Clear message" }`. DELETE success has no body.

| Method | Path | Purpose | Success | Common errors |
| --- | --- | --- | --- | --- |
| GET | `/tasks` | List tasks | 200 | 400 invalid query |
| GET | `/tasks/:id` | Fetch one task | 200 | 400 invalid ID, 404 missing task |
| POST | `/tasks` | Create a task | 201 | 400 invalid body |
| PUT | `/tasks/:id` | Update supplied task fields | 200 | 400 invalid ID/body, 404 missing task |
| DELETE | `/tasks/:id` | Delete a task | 204, empty body | 400 invalid ID, 404 missing task |

All routes can return a generic 500 for unexpected server errors. Unknown routes return 404 with `{ "error": "Route not found" }`.

### Task fields and validation

| Field | Rules |
| --- | --- |
| `id` | Server-generated positive integer; clients cannot supply it |
| `title` | Required on creation; non-empty string, trimmed |
| `description` | Optional string, defaults to `""` |
| `completed` | Optional boolean, defaults to `false` |
| `createdAt` | Server-generated ISO timestamp; clients cannot supply it |

Unknown fields are rejected. Bodies must be JSON objects. IDs must be positive safe integers written in decimal without leading zeroes. PUT updates only the supplied fields, retains omitted fields, and requires at least one field. The original ID and timestamp never change. A nonexistent task is checked before PUT field validation.

### POST /tasks

Example request:

```json
{
  "title": "Learn Express",
  "description": "Practice REST API development",
  "completed": false
}
```

201 response (ID and timestamp are generated):

```json
{
  "data": {
    "id": 1,
    "title": "Learn Express",
    "description": "Practice REST API development",
    "completed": false,
    "createdAt": "2026-09-21T10:00:00.000Z"
  }
}
```

The `Location` header contains `/tasks/1`. A minimal valid body is `{ "title": "Write tests" }`. Missing title returns 400 with `{ "error": "Title is required" }`.

### GET /tasks

No body required. Returns 200 with `{ "data": [] }` when empty, or an array of task objects in creation order.

Completion filters:

```text
GET /tasks?completed=true
GET /tasks?completed=false
```

Only literal `true` and `false` are accepted. Invalid or repeated values return 400 with `{ "error": "Completed filter must be true or false" }`.

Optional pagination can be combined with filtering:

```text
GET /tasks?completed=false&page=1&limit=5
```

Example 200 response when no tasks match:

```json
{
  "data": [],
  "pagination": { "page": 1, "limit": 5, "total": 0, "totalPages": 0 }
}
```

When either pagination parameter is supplied, omitted `page` defaults to 1 and omitted `limit` to 10. Both must be positive safe integers without leading zeroes. Invalid values return 400 with `{ "error": "Page and limit must be positive safe integers" }`. Totals count tasks after filtering; pages beyond the last page return an empty array. Without pagination parameters, all matching tasks are returned without pagination metadata.

### GET /tasks/:id

`GET /tasks/1` requires no body. Returns 200 with the same single-task response shape shown for POST. Missing tasks return 404 with `{ "error": "Task not found" }`. Invalid IDs return 400 with `{ "error": "Task ID must be a positive safe integer" }`.

### PUT /tasks/:id

Example request to `/tasks/1`:

```json
{ "title": "Finish Express practice", "completed": true }
```

Returns 200 with `{ "data": { ... } }` containing the updated task, unchanged description, original ID, and original timestamp. To mark a task incomplete, send `{ "completed": false }`.

Wrong types return 400, for example `{ "error": "Completed must be a boolean" }`. An empty object returns 400 with `{ "error": "Supply at least one task field to update" }`. Missing tasks return the same 404 as GET.

### DELETE /tasks/:id

`DELETE /tasks/1` requires no body. Returns 204 with no response body. Fetching or deleting that ID again returns 404 with `{ "error": "Task not found" }`.

### Error handling

Malformed JSON returns 400 with `{ "error": "Malformed JSON body" }`. Unexpected errors return 500 with `{ "error": "Internal server error" }`, without stack traces or internal paths. Express's default JSON body size limit applies; oversized bodies return 413 with a JSON error. Each request logs its ISO timestamp, HTTP method, and URL to the terminal.

## Manual API Testing

Use Postman or any API client: select a method, enter the URL, and choose a raw JSON body for POST/PUT. Postman is optional. For example, in PowerShell:

```powershell
$task = Invoke-RestMethod -Method Post -Uri http://localhost:3000/tasks -ContentType 'application/json' -Body '{"title":"Learn Express"}'
Invoke-RestMethod -Uri http://localhost:3000/tasks
Invoke-RestMethod -Uri "http://localhost:3000/tasks/$($task.data.id)"
Invoke-RestMethod -Method Put -Uri "http://localhost:3000/tasks/$($task.data.id)" -ContentType 'application/json' -Body '{"completed":true}'
Invoke-RestMethod -Uri 'http://localhost:3000/tasks?completed=true'
Invoke-RestMethod -Method Delete -Uri "http://localhost:3000/tasks/$($task.data.id)"
```
