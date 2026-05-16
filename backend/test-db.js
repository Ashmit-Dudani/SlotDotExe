const mongoose = require('mongoose');
require('dotenv').config();
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const bookings = await Booking.find({});
    console.log("Bookings:", bookings);
    process.exit(0);
  });
