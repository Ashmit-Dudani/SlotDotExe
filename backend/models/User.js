const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['student', 'professor'], 
        required: true 
    },
    // Student specific fields
    branch: {
        type: String,
        enum: ['cse', 'cce', 'ece', 'mech', 'mme', 'dcs', 'dsc', 'dec', 'others'],
        required: function() { return this.role === 'student'; }
    },
    batch: {
        type: String,
        required: function() { return this.role === 'student'; }
    },
    // Professor specific fields
    department: {
        type: String,
        required: function() { return this.role === 'professor'; }
    },
    office: {
        type: String,
        required: function() { return this.role === 'professor'; }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
