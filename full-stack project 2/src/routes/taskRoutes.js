const express = require('express');
const controller = require('../controllers/taskController');
const validateTask = require('../middleware/validateTask');
const router = express.Router();

router.param('id', controller.findTask);
router.get('/', controller.listTasks);
router.get('/:id', controller.getTask);
router.post('/', validateTask, controller.createTask);
router.put('/:id', validateTask, controller.updateTask);
router.delete('/:id', controller.deleteTask);

module.exports = router;
