const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const BusBooking = require('../models/BusBooking');

// Pre-defined bus schedule and capacity
const BUS_CAPACITY = 40;
const BUS_ROUTES = ['Campus to City', 'City to Campus'];
const BUS_SLOTS = {
    'Campus to City': ['07:30 AM', '09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:30 PM', '07:00 PM', '09:00 PM'],
    'City to Campus': ['08:30 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:30 PM', '08:00 PM', '10:00 PM']
};

const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseTimeSlotToMinutes = (timeSlot) => {
    const match = String(timeSlot || '').trim().match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null;
    }

    if (period === 'AM') {
        hours = hours === 12 ? 0 : hours;
    } else {
        hours = hours === 12 ? 12 : hours + 12;
    }

    return hours * 60 + minutes;
};

const isPastBusBooking = (date, timeSlot) => {
    const today = getLocalDateString();
    if (date < today) return true;
    if (date > today) return false;

    const slotMinutes = parseTimeSlotToMinutes(timeSlot);
    if (slotMinutes === null) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= currentMinutes;
};

const getDummyOccupancy = (date, route, timeSlot) => {
    // Generate a deterministic random seed out of the date, route, and time
    const seedString = `${date}-${route}-${timeSlot}`;
    let seed = 0;
    for (let i = 0; i < seedString.length; i++) {
        seed += seedString.charCodeAt(i);
    }
    // Return a dummy occupancy between 5 and 38 for realism
    return (seed % 34) + 5;
};

// @route   GET /api/buses?date=YYYY-MM-DD
// @desc    Get all bus bookings and availability for a specific date
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ message: 'Date is required' });

        const bookings = await BusBooking.find({ date }).populate('user', 'name');
        
        const availability = [];
        
        BUS_ROUTES.forEach(route => {
            BUS_SLOTS[route].forEach(timeSlot => {
                // Find all bookings for this route and slot
                const slotBookings = bookings.filter(b => b.route === route && b.timeSlot === timeSlot);
                const actualBookedCount = slotBookings.length;
                
                // Add dummy occupancy for a realistic "live" feel
                const dummyBookedCount = getDummyOccupancy(date, route, timeSlot);
                let totalBookings = dummyBookedCount + actualBookedCount;
                if (totalBookings > BUS_CAPACITY) totalBookings = BUS_CAPACITY;

                const isBookedByUser = slotBookings.some(b => String(b.user._id) === req.user.id);
                const userBooking = isBookedByUser ? slotBookings.find(b => String(b.user._id) === req.user.id) : null;
                
                availability.push({
                    route,
                    timeSlot,
                    totalSeats: BUS_CAPACITY,
                    bookedSeats: totalBookings,
                    availableSeats: BUS_CAPACITY - totalBookings,
                    isBookedByUser,
                    userBookingId: userBooking ? userBooking._id : null
                });
            });
        });

        res.json(availability);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/buses
// @desc    Book a seat on a bus
// @access  Private
router.post('/', auth, async (req, res) => {
    try {
        const { date, timeSlot, route } = req.body;

        if (!date || !timeSlot || !route) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!BUS_ROUTES.includes(route) || !BUS_SLOTS[route]?.includes(timeSlot)) {
            return res.status(400).json({ message: 'Invalid bus route or time slot' });
        }

        if (isPastBusBooking(date, timeSlot)) {
            return res.status(400).json({ message: 'You cannot book a bus in the past' });
        }

        // Validate capacity
        const currentBookings = await BusBooking.countDocuments({ date, timeSlot, route });
        const dummyOccupancy = getDummyOccupancy(date, route, timeSlot);
        if (currentBookings + dummyOccupancy >= BUS_CAPACITY) {
            return res.status(400).json({ message: 'This bus is already fully booked' });
        }

        // Check if user already booked
        const existingBooking = await BusBooking.findOne({ user: req.user.id, date, timeSlot, route });
        if (existingBooking) {
            return res.status(400).json({ message: 'You have already booked a seat on this bus' });
        }

        const newBooking = new BusBooking({
            user: req.user.id,
            date,
            timeSlot,
            route
        });

        const savedBooking = await newBooking.save();
        res.status(201).json(savedBooking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/buses/:id
// @desc    Cancel a bus booking
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const booking = await BusBooking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (String(booking.user) !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to cancel this booking' });
        }

        await BusBooking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking cancelled' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;