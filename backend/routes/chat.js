const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');

// Import models
const Booking = require('../models/Booking');
const LibrarySeat = require('../models/LibrarySeat');
const BusBooking = require('../models/BusBooking');
const ProfessorProject = require('../models/ProfessorProject');

// Initialize Gemini
let ai;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

router.post('/', async (req, res) => {
    try {
        if (!ai) {
            return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the backend.' });
        }

        const { message, history } = req.body;

        // Fetch current database state to provide context to the AI
        const [lectureHallBookings, librarySeats, busBookings, professorProjects] = await Promise.all([
            Booking.find({}).lean(),
            LibrarySeat.find({}).lean(),
            BusBooking.find({}).lean(),
            ProfessorProject.find({}).populate('professor', 'name').lean()
        ]);

        const today = new Date().toISOString().split('T')[0];

        const libraryCatalog = [
            { title: "Introduction to Algorithms", author: "Thomas H. Cormen", category: "Computer Science", available: true, shelf: "A1" },
            { title: "Clean Code", author: "Robert C. Martin", category: "Software Engineering", available: true, shelf: "A2" },
            { title: "The Feynman Lectures on Physics", author: "Richard P. Feynman", category: "Physics", available: false, shelf: "B1" },
            { title: "Calculus", author: "James Stewart", category: "Mathematics", available: true, shelf: "B2" },
            { title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell", category: "Artificial Intelligence", available: true, shelf: "A3" },
            { title: "Microelectronic Circuits", author: "Adel S. Sedra", category: "Electronics", available: true, shelf: "C1" },
            { title: "Design of Everyday Things", author: "Don Norman", category: "Design", available: true, shelf: "C2" },
            { title: "Computer Networking", author: "James F. Kurose", category: "Networking", available: true, shelf: "A4" }
        ];

        const systemInstruction = `You are a helpful and intelligent AI assistant for SlotDotExe, a university campus management app.
Your job is to guide users, answer their questions, and help them find available lecture halls, library seats, books, and bus schedules.

Here is the current state of the university's bookings. Use this data to answer user queries accurately.
Current Date: ${today}

--- LECTURE HALL BOOKINGS ---
${JSON.stringify(lectureHallBookings.map(b => ({ event: b.eventName, date: b.date, venue: b.venue, start: b.startTime, end: b.endTime })), null, 2)}
(Note: Lecture Halls are LT-1 through LT-20. Assume any hall not listed for a specific time is available.)

--- LIBRARY SEAT BOOKINGS ---
${JSON.stringify(librarySeats.map(b => ({ seatNumber: b.seatNumber, date: b.date, start: b.startTime, end: b.endTime })), null, 2)}

--- BUS BOOKINGS ---
${JSON.stringify(busBookings.map(b => ({ route: b.route, date: b.date, time: b.time, seatsBooked: b.seatsBooked })), null, 2)}

--- PROFESSOR PROJECTS ---
${JSON.stringify(professorProjects.map(p => ({ title: p.title, description: p.description, professor: p.professor?.name || 'Unknown' })), null, 2)}

--- LIBRARY CATALOG ---
${JSON.stringify(libraryCatalog, null, 2)}

Instructions:
- Be concise and friendly.
- When asked for available lecture halls or slots, check the bookings above. If a hall is not in the list for a requested time, it is available.
- If asked about buses, refer to the bus bookings.
- If the user shares their interests or asks for project suggestions, analyze the PROFESSOR PROJECTS above and suggest the most relevant ones. Briefly explain why it matches their interest.
- If the user wants to study a specific topic or asks for book recommendations, suggest relevant books from the LIBRARY CATALOG above. Mention if they are available and their shelf location.
- If the user asks something outside the scope of campus management or academic projects/books, politely decline and steer them back to SlotDotExe topics.`;

        // Format history for Gemini API
        // @google/genai expects an array of { role: 'user' | 'model', parts: [{ text: '...' }] }
        const formattedHistory = [];
        if (history && Array.isArray(history)) {
            for (const msg of history) {
                formattedHistory.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                });
            }
        }

        const chat = await ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2
            },
            history: formattedHistory
        });

        const response = await chat.sendMessage({ message: message });
        res.json({ text: response.text });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ error: 'Failed to process chat message.' });
    }
});

module.exports = router;
