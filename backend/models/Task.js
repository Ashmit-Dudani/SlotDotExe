const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dateKey: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: String,
        default: 'Not set'
    },
    endTime: {
        type: String,
        default: ''
    },
    venue: {
        type: String,
        default: 'Not set'
    },
    type: {
        type: String,
        default: 'class'
    }
}, { timestamps: true });

module.exports = mongoose.model('task', TaskSchema);
