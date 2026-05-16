const mongoose = require('mongoose');

const LibrarySeatSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seatNumber: {
        type: Number,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('librarySeat', LibrarySeatSchema);
