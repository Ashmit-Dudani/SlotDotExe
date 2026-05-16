const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const LibrarySeat = require('../models/LibrarySeat');

// @route   GET /api/librarySeats
// @desc    Get all library seat bookings
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const bookings = await LibrarySeat.find().populate('user', 'name email role');
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/librarySeats
// @desc    Book a library seat
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { seatNumber, date, startTime, endTime } = req.body;

        if (!seatNumber || !date || !startTime || !endTime) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (startTime >= endTime) {
             return res.status(400).json({ message: 'End time must be after start time' });
        }

        // Global check: a user can only have ONE active seat booking in the library across all dates.
        const existingUserBooking = await LibrarySeat.findOne({ user: req.user.id });
        if (existingUserBooking) {
            return res.status(400).json({ message: 'You already have an active seat booking. Please cancel it before booking another.' });
        }

        // Seat check: is this exact seat already booked for an overlapping time on this date?
        const seatBookings = await LibrarySeat.find({ seatNumber, date });
        const hasConflict = seatBookings.some(booking => {
            return (startTime < booking.endTime && endTime > booking.startTime);
        });

        if (hasConflict) {
            return res.status(409).json({ message: 'Time slot conflict detected. Seat is already booked for this time.' });
        }

        const newBooking = new LibrarySeat({
            user: req.user.id,
            seatNumber,
            date,
            startTime,
            endTime
        });

        const booking = await newBooking.save();
        
        const populatedBooking = await LibrarySeat.findById(booking._id).populate('user', 'name role email');
        res.status(201).json(populatedBooking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/librarySeats/:id
// @desc    Cancel a library seat booking
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let booking = await LibrarySeat.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        if (String(booking.user) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only the booking owner can cancel this booking' });
        }

        await LibrarySeat.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
