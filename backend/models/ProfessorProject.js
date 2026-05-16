const mongoose = require('mongoose')

const ProfessorProjectSchema = new mongoose.Schema(
    {
        professor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        interestedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
)

module.exports = mongoose.model('professorproject', ProfessorProjectSchema)
