const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Task = require('../models/Task');

const ltVenuePattern = /^LT-(?:[1-9]|1\d|20)$/i;

const normalizeLtVenue = (venue) => {
    const normalized = String(venue || '').trim().toUpperCase();
    return ltVenuePattern.test(normalized) ? normalized : '';
};

const createExactVenueRegex = (venue) => new RegExp(`^${venue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// @route   GET /api/bookings?date=YYYY-MM-DD
// @desc    Get all bookings for a specific date
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { date } = req.query;
        let query = {};
        let taskQuery = {};
        if (date) {
            query.date = date;
            taskQuery.dateKey = date;
        }
        
        // Find explicit bookings
        const bookings = await Booking.find(query).populate('user', 'name email role');
        
        // Also fetch all student tasks/classes scheduled in a specific LT for this date
        taskQuery.venue = { $regex: /^LT-(?:[1-9]|1\d|20)$/i };
        const tasks = await Task.find(taskQuery).populate('user', 'name email role');

        // Transform tasks into booking-like objects for the frontend
        const taskBookingsRaw = tasks
            .map(task => {
                const venue = normalizeLtVenue(task.venue);

                if (!venue) {
                    return null;
                }

                return {
                    _id: task._id,
                    isTask: true, // Identify as a student class rather than formal booking
                    eventName: `[${task.type.toUpperCase()}] ${task.text}`,
                    date: task.dateKey,
                    venue,
                    startTime: task.time,
                    endTime: task.endTime || task.time, // Fallback if no end time
                    user: task.user
                };
            })
            .filter(Boolean);

        // Deduplicate task-based entries to prevent clutter when multiple users add the same class
        const taskBookings = [];
        const seenSlots = new Set();
        for (const tb of taskBookingsRaw) {
            const slotKey = `${tb.venue}-${tb.startTime}-${tb.endTime}`;
            
            // If there's an actual formal booking covering this time, skip adding the task
            const hasFormalOverlapping = bookings.some(b => 
                b.venue === tb.venue &&
                tb.startTime < b.endTime && tb.endTime > b.startTime
            );

            if (!seenSlots.has(slotKey) && !hasFormalOverlapping) {
                seenSlots.add(slotKey);
                taskBookings.push(tb);
            }
        }

        const allDocs = [...bookings.map(b => b.toObject()), ...taskBookings];
        // Sort by start time
        allDocs.sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        res.json(allDocs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/bookings
// @desc    Book a lecture hall
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { eventName, date, venue, startTime, endTime } = req.body;
        const normalizedVenue = normalizeLtVenue(venue);

        // Validation
        if (!eventName || !date || !venue || !startTime || !endTime) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!normalizedVenue) {
            return res.status(400).json({ message: 'Please select a valid LT from LT-1 to LT-20' });
        }
        
        if (startTime >= endTime) {
             return res.status(400).json({ message: 'End time must be after start time' });
        }

        // Conflict Detection on Backend (Against both bookings and student tasks)
        const venueRegex = createExactVenueRegex(normalizedVenue);
        const existingBookings = await Booking.find({ date, venue: venueRegex });
        const existingTasks = await Task.find({ dateKey: date, venue: venueRegex });
        
        const hasConflict = existingBookings.some(booking => {
            return (startTime < booking.endTime && endTime > booking.startTime);
        }) || existingTasks.some(task => {
            const taskStart = task.time;
            const taskEnd = task.endTime || task.time; // If task has no end time, evaluate carefully
            if (!taskStart || taskStart === 'Not set') return false; // ignore invalid times
            return (startTime < taskEnd && endTime > taskStart);
        });

        if (hasConflict) {
            return res.status(409).json({ message: 'Time slot conflict detected. Venue is already booked for this time.' });
        }

        const newBooking = new Booking({
            user: req.user.id,
            eventName,
            date,
            venue: normalizedVenue,
            startTime,
            endTime
        });

        const booking = await newBooking.save();
        
        // Return populated booking
        const populatedBooking = await Booking.findById(booking._id).populate('user', 'name role');
        res.status(201).json(populatedBooking);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/bookings/:id
// @desc    Cancel a booking
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        // Restrict deletion only to the user who created the booking.
        if (!booking.user || String(booking.user) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Only the booking owner can cancel this booking' });
        }

        await Booking.findByIdAndDelete(req.params.id);

        res.json({ message: 'Booking cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
