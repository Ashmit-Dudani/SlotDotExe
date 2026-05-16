const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');

const hasValidTimeRange = (time, endTime) => {
    if (!time || !endTime || time === 'Not set' || endTime === 'Not set') {
        return true;
    }

    return endTime > time;
};

// @route   GET /api/tasks
// @desc    Get all tasks for logged in user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ user: req.user.id }).sort({ dateKey: 1 });
        res.json(tasks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/tasks
// @desc    Add new task
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { dateKey, text, time, endTime, venue, type } = req.body;

        if (!hasValidTimeRange(time, endTime)) {
            return res.status(400).json({ message: 'End time must be after start time for same-day events' });
        }

        const newTask = new Task({
            user: req.user.id,
            dateKey,
            text,
            time,
            endTime,
            venue,
            type
        });

        const task = await newTask.save();
        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', auth, async (req, res) => {
    try {
        const { text, time, endTime, venue, type } = req.body;

        let task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Make sure user owns the task
        if (task.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const finalTime = time !== undefined ? time : task.time;
        const finalEndTime = endTime !== undefined ? endTime : task.endTime;

        if (!hasValidTimeRange(finalTime, finalEndTime)) {
            return res.status(400).json({ message: 'End time must be after start time for same-day events' });
        }

        // Build task object
        const taskFields = {};
        if (text !== undefined) taskFields.text = text;
        if (time !== undefined) taskFields.time = time;
        if (endTime !== undefined) taskFields.endTime = endTime;
        if (venue !== undefined) taskFields.venue = venue;
        if (type !== undefined) taskFields.type = type;

        task = await Task.findByIdAndUpdate(
            req.params.id,
            { $set: taskFields },
            { new: true }
        );

        res.json(task);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Make sure user owns the task
        if (task.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Task.findByIdAndDelete(req.params.id);

        res.json({ message: 'Task removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
