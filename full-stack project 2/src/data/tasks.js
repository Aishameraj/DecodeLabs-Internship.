const tasks = [];
let nextId = 1;

function generateId() {
  return nextId++;
}

module.exports = { tasks, generateId };
