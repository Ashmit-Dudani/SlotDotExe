const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const StudentIdea = require('../models/StudentIdea');
const ProfessorProject = require('../models/ProfessorProject');
const { calculateMatch } = require('../utils/matchScore');

// GET /api/matchmaking/student/:studentId
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const studentIdeas = await StudentIdea.find({ student: studentId });
        const allProjects = await ProfessorProject.find();

        const matchResults = allProjects.map(project => {
            const matchData = calculateMatch(studentIdeas, project);
            return {
                project: project._id,
                title: project.title,
                description: project.description,
                matchScore: matchData.matchScore,
                explanation: matchData.explanation
            };
        });

        // Sort descending by match score
        matchResults.sort((a, b) => b.matchScore - a.matchScore);

        res.json(matchResults);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during matchmaking' });
    }
});

// GET /api/matchmaking/project/:projectId
router.get('/project/:projectId', auth, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const project = await ProfessorProject.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Group ideas by student
        const allIdeas = await StudentIdea.find().populate('student', 'name email');
        const ideasByStudent = {};
        allIdeas.forEach(idea => {
            const studentId = idea.student._id.toString();
            if (!ideasByStudent[studentId]) {
                ideasByStudent[studentId] = {
                    student: idea.student,
                    ideas: []
                };
            }
            ideasByStudent[studentId].ideas.push(idea);
        });

        const matchResults = Object.values(ideasByStudent).map(data => {
            const matchData = calculateMatch(data.ideas, project);
            return {
                student: data.student,
                matchScore: matchData.matchScore,
                explanation: matchData.explanation
            };
        });

        // Sort descending by match score
        matchResults.sort((a, b) => b.matchScore - a.matchScore);

        res.json(matchResults);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during matchmaking' });
    }
});

module.exports = router;