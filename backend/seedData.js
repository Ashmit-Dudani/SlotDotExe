require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const StudentIdea = require('./models/StudentIdea');
const ProfessorProject = require('./models/ProfessorProject');
const Booking = require('./models/Booking');
const LibrarySeat = require('./models/LibrarySeat');
const BusBooking = require('./models/BusBooking');
const Task = require('./models/Task');

async function seedData() {
    try {
        if (!process.env.MONGO_URI) {
            console.error("MONGO_URI missing from .env");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB.");

        console.log("Clearing existing dummy data...");
        // ONLY clear out specific dummy data so we don't delete real users/projects
        await User.deleteMany({ email: { $regex: 'dummy' } });
        await StudentIdea.deleteMany({ title: { $regex: 'Idea' } });
        await ProfessorProject.deleteMany({ title: { $regex: 'Project' } });
        // Clear the newly generated bookings so we can refresh them
        await Booking.deleteMany({ eventName: { $regex: 'Class:|Club Meeting:' } });
        await LibrarySeat.deleteMany({});
        await BusBooking.deleteMany({});
        await Task.deleteMany({});

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("password123", salt);

        console.log("Creating students...");
        const studentsData = [
            { name: "Alice AI", email: "alice.dummy@example.com", role: "student", branch: "cse", batch: "2025" },
            { name: "Bob Bot", email: "bob.dummy@example.com", role: "student", branch: "ece", batch: "2024" },
            { name: "Charlie Cloud", email: "charlie.dummy@example.com", role: "student", branch: "cce", batch: "2026" },
            { name: "Diana Data", email: "diana.dummy@example.com", role: "student", branch: "mech", batch: "2025" },
            { name: "Eve Engine", email: "eve.dummy@example.com", role: "student", branch: "dsc", batch: "2024" },
            { name: "Frank Frame", email: "frank.dummy@example.com", role: "student", branch: "dec", batch: "2025" },
            { name: "Grace Gear", email: "grace.dummy@example.com", role: "student", branch: "mech", batch: "2026" },
            { name: "Henry Hub", email: "henry.dummy@example.com", role: "student", branch: "cse", batch: "2024" },
            { name: "Ivy Io", email: "ivy.dummy@example.com", role: "student", branch: "ece", batch: "2025" },
            { name: "Jack Json", email: "jack.dummy@example.com", role: "student", branch: "cce", batch: "2026" }
        ].map(s => ({ ...s, password: hashedPassword }));

        const createdStudents = await User.insertMany(studentsData);

        console.log("Creating professors...");
        const professorsData = [
            { name: "Prof. Alan Turing", email: "alan.dummy@example.com", role: "professor", department: "Computer Science", office: "Room 101" },
            { name: "Prof. Ada Lovelace", email: "ada.dummy@example.com", role: "professor", department: "Electronics", office: "Room 202" },
            { name: "Prof. Nikola Tesla", email: "nikola.dummy@example.com", role: "professor", department: "Mechanical", office: "Room 303" },
            { name: "Prof. Grace Hopper", email: "hopper.dummy@example.com", role: "professor", department: "Data Science", office: "Room 404" },
            { name: "Prof. Claude Shannon", email: "claude.dummy@example.com", role: "professor", department: "Communication", office: "Room 505" }
        ].map(p => ({ ...p, password: hashedPassword }));

        const createdProfessors = await User.insertMany(professorsData);

        console.log("Creating student ideas...");
        const studentIdeasData = [
            { student: createdStudents[0]._id, title: "AI Code Reviewer Idea", description: "Using machine learning and natural language processing to analyze python and javascript files for optimization.", branch: "cse", year: "3" },
            { student: createdStudents[1]._id, title: "Smart IoT Traffic Tracker Idea", description: "Building an embedded system using IoT sensors and microcontroller to track bus traffic safely.", branch: "ece", year: "4" },
            { student: createdStudents[2]._id, title: "Cloud Optimization Framework Idea", description: "Developing a cloud based platform to optimize deployment costs using kubernetes and docker.", branch: "cce", year: "2" },
            { student: createdStudents[3]._id, title: "Autonomous Drone Pathfinding Idea", description: "Mechanical engineering drone structure with pathfinding algorithms for autonomous flight.", branch: "mech", year: "3" },
            { student: createdStudents[4]._id, title: "Predictive Analytics Algorithm Idea", description: "Predictive analytics algorithms on large datasets to forecast stock market trends using data science.", branch: "dsc", year: "4" },
            { student: createdStudents[5]._id, title: "Wireless Signal Enhancer Idea", description: "Improving wireless communication signals using novel antenna designs and digital electronics.", branch: "dec", year: "3" },
            { student: createdStudents[6]._id, title: "Robotic Arm Assembly Idea", description: "A robotic arm for mechanical assembly lines using stepper motors and inverse kinematics.", branch: "mech", year: "2" },
            { student: createdStudents[7]._id, title: "Blockchain Voting System Idea", description: "Secure and decentralized voting system using Ethereum smart contracts and web3 technologies.", branch: "cse", year: "4" },
            { student: createdStudents[8]._id, title: "Smart Home Energy Monitor Idea", description: "Monitoring home power usage using IoT and microcontrollers to save electricity.", branch: "ece", year: "3" },
            { student: createdStudents[9]._id, title: "Edge Computing Edge Node Idea", description: "Setting up an edge computing node for low latency data processing in remote areas.", branch: "cce", year: "2" },
            { student: createdStudents[0]._id, title: "Neural Network Optimizer Idea", description: "Optimizing neural networks using pruning and quantizations for mobile deployment.", branch: "cse", year: "3" },
            { student: createdStudents[1]._id, title: "Low Power LoraWan Node Idea", description: "Developing a low power LoraWan node for remote agricultural monitoring.", branch: "ece", year: "4" }
        ];

        await StudentIdea.insertMany(studentIdeasData);

        console.log("Creating professor projects...");
        const professorProjectsData = [
            { professor: createdProfessors[0]._id, title: "Deep Learning Code Analyzer Project", description: "Seeking students to research machine learning models for processing natural language to optimize web code and javascript." },
            { professor: createdProfessors[0]._id, title: "Web3 Security Audit Tool Project", description: "Project focusing on auditing blockchain smart contracts on Ethereum using automated security tools." },
            { professor: createdProfessors[1]._id, title: "IoT Campus Sensors Project", description: "Need students to build embedded hardware sensors using raspberry pi to identify traffic loads and improve college safety." },
            { professor: createdProfessors[1]._id, title: "5G Antenna Design Project", description: "Researching novel antenna arrays for sub-6GHz 5G networks in urban environments." },
            { professor: createdProfessors[2]._id, title: "Autonomous Delivery Drone Project", description: "Mechanical design and simulation for a scalable delivery drone using flight controllers." },
            { professor: createdProfessors[2]._id, title: "Industrial Robotics Integration Project", description: "Integrating robotic arms with legacy manufacturing equipment using inverse kinematics." },
            { professor: createdProfessors[3]._id, title: "Big Data Stock Predictor Project", description: "Analyzing financial market data using predictive analytics algorithms to model future trends." },
            { professor: createdProfessors[3]._id, title: "Medical Image Classification Project", description: "Using convolutional neural networks to classify MRI scans for early disease detection." },
            { professor: createdProfessors[4]._id, title: "Edge Cloud Orchestration Project", description: "Developing an orchestration layer for managing docker containers on edge computing nodes." },
            { professor: createdProfessors[4]._id, title: "Quantum Encrypted Comms Project", description: "Simulating quantum key distribution protocols for ultra secure wireless communication." }
        ];

        await ProfessorProject.insertMany(professorProjectsData);

        // Generate Dates for Bookings (Today and next 3 days)
        const dates = [];
        for (let i = 0; i < 4; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }

        console.log("Creating lecture hall bookings...");
        const bookingData = [];
        const venues = ["LT-1", "LT-2", "LT-5", "LT-11", "LT-14", "LT-17", "LT-19", "LT-20"];
        for (const date of dates) {
            venues.forEach((venue, i) => {
                const randomProf = createdProfessors[Math.floor(Math.random() * createdProfessors.length)];
                bookingData.push({
                    user: randomProf._id,
                    eventName: `Class: ${randomProf.department} 10${i}`,
                    date: date,
                    venue: venue,
                    startTime: "10:00",
                    endTime: "12:00"
                });
                
                // Add an afternoon booking randomly
                if (Math.random() > 0.5) {
                    const randomStudent = createdStudents[Math.floor(Math.random() * createdStudents.length)];
                    bookingData.push({
                        user: randomStudent._id,
                        eventName: `Club Meeting: ${randomStudent.branch} Society`,
                        date: date,
                        venue: venue,
                        startTime: "14:00",
                        endTime: "16:00"
                    });
                }
            });
        }
        await Booking.insertMany(bookingData);

        console.log("Creating library seats & book issuing tasks...");
        const librarySeatData = [];
        const taskData = [];
        const bookTitles = ["Introduction to Algorithms", "Clean Code", "Design of Everyday Things", "Microelectronic Circuits", "Calculus"];
        
        for (const date of dates) {
            createdStudents.forEach((student, index) => {
                if (Math.random() > 0.4) {
                    const startH = 8 + Math.floor(Math.random() * 8);
                    librarySeatData.push({
                        user: student._id,
                        seatNumber: 1 + Math.floor(Math.random() * 100),
                        date: date,
                        startTime: `${startH < 10 ? '0'+startH : startH}:00`,
                        endTime: `${startH+2 < 10 ? '0'+(startH+2) : startH+2}:00`
                    });

                    const book = bookTitles[Math.floor(Math.random() * bookTitles.length)];
                    taskData.push({
                        user: student._id,
                        dateKey: date,
                        text: `Return / Issue Library Book: ${book}`,
                        time: "09:00",
                        endTime: "09:30",
                        venue: "Main Library Desk",
                        type: "personal"
                    });
                }

                if (Math.random() > 0.3) {
                    taskData.push({
                        user: student._id,
                        dateKey: date,
                        text: `Work on ${student.branch.toUpperCase()} Assignment`,
                        time: "18:00",
                        endTime: "20:00",
                        venue: "Hostel Room",
                        type: "assignment"
                    });
                }
            });

            createdProfessors.forEach(prof => {
                taskData.push({
                    user: prof._id,
                    dateKey: date,
                    text: `Grade mid-term papers for ${prof.department}`,
                    time: "15:00",
                    endTime: "17:00",
                    venue: prof.office,
                    type: "work"
                });
            });
        }
        await LibrarySeat.insertMany(librarySeatData);
        await Task.insertMany(taskData);

        console.log("Creating bus bookings...");
        const busBookingData = [];
        const routes = ['Campus to City', 'City to Campus'];
        const slots = ['08:00', '10:00', '14:00', '18:00'];
        
        for (const date of dates) {
            slots.forEach(slot => {
                routes.forEach(route => {
                    const shuffledStudents = [...createdStudents].sort(() => 0.5 - Math.random());
                    const selectedStudents = shuffledStudents.slice(0, 5);
                    selectedStudents.forEach(student => {
                        busBookingData.push({
                            user: student._id,
                            date: date,
                            timeSlot: slot,
                            route: route
                        });
                    });
                });
            });
        }
        await BusBooking.insertMany(busBookingData);

        console.log(`Successfully seeded!`);
        console.log(`- ${createdStudents.length} students & ${createdProfessors.length} professors`);
        console.log(`- ${studentIdeasData.length} ideas & ${professorProjectsData.length} projects`);
        console.log(`- ${bookingData.length} lecture hall bookings`);
        console.log(`- ${librarySeatData.length} library seat bookings`);
        console.log(`- ${busBookingData.length} bus bookings`);
        console.log(`- ${taskData.length} personal tasks`);
        
        process.exit(0);

    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
}

seedData();