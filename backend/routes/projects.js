const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const StudentIdea = require('../models/StudentIdea')
const ProfessorProject = require('../models/ProfessorProject')

// @route   POST /api/projects/student-ideas
// @desc    Student uploads a project idea
// @access  Private (student only)
router.post('/student-ideas', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can upload project ideas' })
        }

        const { title, description, branch, year } = req.body
        if (!title || !description || !branch || !year) {
            return res.status(400).json({ message: 'Title, description, branch and year are required' })
        }

        const newIdea = new StudentIdea({
            student: req.user.id,
            title,
            description,
            branch,
            year,
        })

        const idea = await newIdea.save()
        const populated = await StudentIdea.findById(idea._id).populate('student', 'name email branch batch')

        res.status(201).json(populated)
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   GET /api/projects/student-ideas
// @desc    Professors get all student ideas, students get only their own ideas
// @access  Private
router.get('/student-ideas', auth, async (req, res) => {
    try {
        const query = req.user.role === 'professor' ? {} : { student: req.user.id }
        const ideas = await StudentIdea.find(query)
            .populate('student', 'name email branch batch')
            .sort({ createdAt: -1 })

        res.json(ideas)
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   DELETE /api/projects/student-ideas/:id
// @desc    Student deletes their own project idea
// @access  Private (student only)
router.delete('/student-ideas/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can delete project ideas' })
        }

        const idea = await StudentIdea.findById(req.params.id)
        if (!idea) {
            return res.status(404).json({ message: 'Idea not found' })
        }

        if (idea.student.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can delete only your own project ideas' })
        }

        await StudentIdea.findByIdAndDelete(req.params.id)

        res.json({ message: 'Idea removed successfully', ideaId: req.params.id })
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   POST /api/projects/professor-projects
// @desc    Professor lists a project for students
// @access  Private (professor only)
router.post('/professor-projects', auth, async (req, res) => {
    try {
        if (req.user.role !== 'professor') {
            return res.status(403).json({ message: 'Only professors can publish projects' })
        }

        const { title, description } = req.body
        if (!title || !description) {
            return res.status(400).json({ message: 'Title and description are required' })
        }

        const newProject = new ProfessorProject({
            professor: req.user.id,
            title,
            description,
            interestedStudents: [],
        })

        const project = await newProject.save()
        const populated = await ProfessorProject.findById(project._id).populate('professor', 'name email department')

        res.status(201).json({
            ...populated.toObject(),
            interestCount: populated.interestedStudents.length,
            votedByMe: false,
            mine: true,
        })
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   GET /api/projects/professor-projects
// @desc    Get all professor projects (visible to all authenticated users)
// @access  Private
router.get('/professor-projects', auth, async (req, res) => {
    try {
        const projects = await ProfessorProject.find()
            .populate('professor', 'name email department')
            .populate('interestedStudents', 'name email')
            .sort({ createdAt: -1 })

        const payload = projects.map((project) => {
            const interestedStudents = project.interestedStudents || []
            const votedByMe = interestedStudents.some((student) => {
                if (!student) return false
                const studentId = student._id ? student._id.toString() : student.toString()
                return studentId === req.user.id
            })
            const mine = project.professor?._id?.toString() === req.user.id
            const projectDoc = project.toObject()

            delete projectDoc.interestedStudents

            return {
                ...projectDoc,
                interestCount: interestedStudents.length,
                votedByMe,
                mine,
                interestedStudents:
                    req.user.role === 'professor' && mine
                        ? interestedStudents.map((student) => ({
                              _id: student._id,
                              name: student.name,
                              email: student.email,
                          }))
                        : [],
            }
        })

        res.json(payload)
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   POST /api/projects/professor-projects/:id/vote
// @desc    Student toggles interest vote for a professor project
// @access  Private (student only)
router.post('/professor-projects/:id/vote', auth, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can vote interest' })
        }

        let project = await ProfessorProject.findById(req.params.id)
        if (!project) {
            return res.status(404).json({ message: 'Project not found' })
        }

        const existingIndex = project.interestedStudents.findIndex(
            (studentId) => studentId.toString() === req.user.id
        )

        let votedByMe = false
        if (existingIndex >= 0) {
            project.interestedStudents.splice(existingIndex, 1)
        } else {
            project.interestedStudents.push(req.user.id)
            votedByMe = true
        }

        await project.save()
        project = await ProfessorProject.findById(req.params.id).populate('professor', 'name email department')

        res.json({
            message: votedByMe ? 'Interest added' : 'Interest removed',
            project: {
                ...project.toObject(),
                interestCount: project.interestedStudents.length,
                votedByMe,
                mine: project.professor?._id?.toString() === req.user.id,
            },
        })
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

// @route   DELETE /api/projects/professor-projects/:id
// @desc    Professor removes their own published project
// @access  Private (professor only)
router.delete('/professor-projects/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'professor') {
            return res.status(403).json({ message: 'Only professors can remove published projects' })
        }

        const project = await ProfessorProject.findById(req.params.id)
        if (!project) {
            return res.status(404).json({ message: 'Project not found' })
        }

        if (project.professor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can remove only your own published projects' })
        }

        await ProfessorProject.findByIdAndDelete(req.params.id)

        res.json({ message: 'Project removed successfully', projectId: req.params.id })
    } catch (err) {
        console.error(err.message)
        res.status(500).json({ message: err.message || 'Server Error' })
    }
})

module.exports = router
