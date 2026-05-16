const mongoose = require('mongoose');

const busBookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: String,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    route: {
        type: String,
        required: true,
        enum: ['Campus to City', 'City to Campus']
    },
    bookedAt: {
        type: Date,
        default: Date.now
    }
});

// A user can only book one seat per bus per route per day
busBookingSchema.index({ user: 1, date: 1, timeSlot: 1, route: 1 }, { unique: true });

module.exports = mongoose.model('BusBooking', busBookingSchema);