const getKeywords = (text) => {
    if (!text || typeof text !== 'string') return [];
    // remove punctuation, to lowercase
    const cleanText = text.replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").toLowerCase();
    const words = cleanText.split(" ");
    // ignore small words
    return words.filter(word => word.length >= 4);
};

const calculateMatch = (studentIdeas, project) => {
    // 1. Keyword Match
    const combinedStudentDesc = studentIdeas.map(idea => idea.description).join(" ");
    const studentKeywords = new Set(getKeywords(combinedStudentDesc));
    
    const projectKeywords = getKeywords(project.description);
    const uniqueProjectKeywords = new Set(projectKeywords);
    
    let overlapCount = 0;
    uniqueProjectKeywords.forEach(word => {
        if (studentKeywords.has(word)) {
            overlapCount++;
        }
    });
    
    const keywordScore = uniqueProjectKeywords.size > 0 ? (overlapCount / uniqueProjectKeywords.size) : 0;
    
    // 2. Branch Match
    // Project might not have a branch property by default, but let's assume checking if the keyword contains branch or if model has it
    let branchMatch = 0;
    const studentBranches = new Set(studentIdeas.map(idea => idea.branch?.toLowerCase()).filter(Boolean));
    const projectBranch = project.branch?.toLowerCase(); // If project has branch
    
    // Fallback: Check if student branch acronyms appear in project description
    if (projectBranch && studentBranches.has(projectBranch)) {
        branchMatch = 1;
    } else if (!projectBranch && studentBranches.size > 0) {
        // If project lacks a formal branch, see if branch acronyms appear in project description keywords
        for (let branch of studentBranches) {
            if (uniqueProjectKeywords.has(branch)) {
                branchMatch = 1;
                break;
            }
        }
    }

    // 3. Final Score
    const finalScore = (keywordScore * 0.7) + (branchMatch * 0.3);
    const percentage = Math.round(finalScore * 100);

    // 4. Explanation
    const reasons = [];
    if (branchMatch === 1) {
        reasons.push("You are from the same branch or domain");
    }
    if (overlapCount > 0) {
        // give a sample keyword matched
        const matchedWords = [...uniqueProjectKeywords].filter(w => studentKeywords.has(w));
        reasons.push(`Your ideas mention related topics: ${matchedWords.slice(0, 3).join(', ')}`);
    } else if (percentage === 0) {
        reasons.push("No specific concepts or branches overlap");
    }

    return {
        matchScore: percentage,
        explanation: reasons.length > 0 ? reasons[0] : "This project uses similar technologies" // Fallback
    };
};

module.exports = {
    getKeywords,
    calculateMatch
};