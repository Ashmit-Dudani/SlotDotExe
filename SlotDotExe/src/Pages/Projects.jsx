import { useEffect, useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import { apiFetch } from '../lib/api'

const emptyStudentIdea = {
	title: '',
	description: '',
	branch: '',
	year: '',
}

const emptyProfessorProject = {
	title: '',
	description: '',
}

const readApiResponse = async (res) => {
	const text = await res.text()
	if (!text) return {}

	try {
		return JSON.parse(text)
	} catch {
		return { message: text }
	}
}

function Projects({ darkMode = false }) {
	const [profile, setProfile] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	const [studentIdeaForm, setStudentIdeaForm] = useState(emptyStudentIdea)
	const [profProjectForm, setProfProjectForm] = useState(emptyProfessorProject)

	const [studentIdeas, setStudentIdeas] = useState([])
	const [professorProjects, setProfessorProjects] = useState([])
	const [matchScores, setMatchScores] = useState({}) // Stores projectId -> { matchScore, explanation }
	
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [activeActionId, setActiveActionId] = useState(null)
	const [page, setPage] = useState(1)
	const [hasMoreProjects, setHasMoreProjects] = useState(true)

	const getToken = () => localStorage.getItem('slotDotExeToken')

	const fetchProfile = async () => {
		const token = getToken()
		if (!token) return null

		const res = await apiFetch('/api/auth/profile', {
			headers: { Authorization: `Bearer ${token}` },
		})
		if (!res.ok) return null
		return readApiResponse(res)
	}

	const fetchStudentIdeas = async () => {
		const token = getToken()
		if (!token) return

		const res = await apiFetch('/api/projects/student-ideas', {
			headers: { Authorization: `Bearer ${token}` },
		})
		const data = await readApiResponse(res)

		if (!res.ok) {
			throw new Error(data.message || 'Could not fetch student ideas')
		}

		setStudentIdeas(data)
	}

	const fetchProfessorProjects = async (pageNum = 1) => {
		const token = getToken()
		if (!token) return

		const res = await apiFetch(`/api/projects/professor-projects?page=${pageNum}&limit=10`, {
			headers: { Authorization: `Bearer ${token}` },
		})
		const data = await readApiResponse(res)

		if (!res.ok) {
			throw new Error(data.message || 'Could not fetch professor projects')
		}

		if (data.length < 10) setHasMoreProjects(false);
		
		if (pageNum === 1) {
			setProfessorProjects(data);
		} else {
			setProfessorProjects(prev => [...prev, ...data]);
		}
	}

	const fetchMatchScores = async (userId) => {
		const token = getToken()
		if (!token) return

		try {
			const res = await apiFetch(`/api/matchmaking/student/${userId}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await readApiResponse(res)
			if (res.ok && Array.isArray(data)) {
				const scoresMap = {}
				data.forEach(item => {
					scoresMap[item.project] = { matchScore: item.matchScore, explanation: item.explanation }
				})
				setMatchScores(scoresMap)
			}
		} catch (err) {
			console.error('Failed to fetch match scores:', err)
		}
	}

	useEffect(() => {
		let isMounted = true

		const safeLoadAllData = async () => {
			setLoading(true)
			setError('')
			try {
				const user = await fetchProfile()
				if (!isMounted) return

				if (!user) {
					setError('Unable to load profile. Please log in again.')
					setLoading(false)
					return
				}

				setProfile(user)
				setStudentIdeaForm((prev) => ({
					...prev,
					branch: prev.branch || user.branch || '',
				}))

				if (user.role === 'student') {
					await Promise.all([fetchStudentIdeas(), fetchProfessorProjects(), fetchMatchScores(user._id)])
				} else {
					await Promise.all([fetchStudentIdeas(), fetchProfessorProjects()])
				}
			} catch (err) {
				if (!isMounted) return
				console.error(err)
				setError(err.message || 'Failed to load projects data')
			} finally {
				if (isMounted) setLoading(false)
			}
		}

		safeLoadAllData()

		return () => {
			isMounted = false
		}
	}, [])

	const handleStudentIdeaSubmit = async (e) => {
		e.preventDefault()
		if (isSubmitting) return
		setIsSubmitting(true)
		setError('')
		setMessage('')

		const token = getToken()
		if (!token) {
			setIsSubmitting(false)
			return
		}

		try {
			const res = await apiFetch('/api/projects/student-ideas', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(studentIdeaForm),
			})

			const data = await readApiResponse(res)
			if (!res.ok) {
				setError(data.message || 'Failed to submit idea')
				return
			}

			setStudentIdeas((prev) => [data, ...prev])
			setStudentIdeaForm((prev) => ({ ...emptyStudentIdea, branch: prev.branch }))
			setMessage('Project idea submitted successfully')
		} catch (err) {
			console.error(err)
			setError('Server error while submitting idea')
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleProfessorProjectSubmit = async (e) => {
		e.preventDefault()
		if (isSubmitting) return
		setIsSubmitting(true)
		setError('')
		setMessage('')

		const token = getToken()
		if (!token) {
			setIsSubmitting(false)
			return
		}

		try {
			const res = await apiFetch('/api/projects/professor-projects', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(profProjectForm),
			})

			const data = await readApiResponse(res)
			if (!res.ok) {
				setError(data.message || 'Failed to publish project')
				return
			}

			setProfessorProjects((prev) => [data, ...prev])
			setProfProjectForm(emptyProfessorProject)
			setMessage('Project listed for students successfully')
		} catch (err) {
			console.error(err)
			setError('Server error while publishing project')
		} finally {
			setIsSubmitting(false)
		}
	}

	const toggleInterest = async (projectId) => {
		const token = getToken()
		if (!token) return

		// Optimistic Update
		setProfessorProjects((prev) =>
			prev.map((project) => {
				if (project._id === projectId) {
					const isVoting = !project.votedByMe
					return {
						...project,
						votedByMe: isVoting,
						interestCount: (project.interestCount || 0) + (isVoting ? 1 : -1)
					}
				}
				return project
			})
		)

		try {
			const res = await apiFetch(`/api/projects/professor-projects/${projectId}/vote`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})

			const data = await readApiResponse(res)
			if (!res.ok) {
				throw new Error(data.message || 'Failed to update interest')
			}
		} catch (err) {
			console.error(err)
			setError('Server error while updating vote. Reverting.')
			
			// Rollback on Failure
			setProfessorProjects((prev) =>
				prev.map((project) => {
					if (project._id === projectId) {
						const isVoting = !project.votedByMe
						return {
							...project,
							votedByMe: isVoting,
							interestCount: (project.interestCount || 0) + (isVoting ? 1 : -1)
						}
					}
					return project
				})
			)
		}
	}

	const removePublishedProject = async (projectId) => {
		const token = getToken()
		if (!token) return

		setError('')
		setMessage('')

		if (!window.confirm('Are you sure you want to remove this published project?')) {
			return
		}

		setActiveActionId(projectId)
		
		// Optimistic Update
		const projectToRestore = professorProjects.find(p => p._id === projectId)
		setProfessorProjects((prev) => prev.filter((p) => p._id !== projectId))

		try {
			const res = await apiFetch(`/api/projects/professor-projects/${projectId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})

			const data = await readApiResponse(res)
			if (!res.ok) {
				throw new Error(data.message || 'Failed to remove project')
			}

			setMessage('Published project removed successfully')
		} catch (err) {
			console.error(err)
			setError('Server error while removing project. Reverting.')
			
			// Rollback
			if (projectToRestore) {
				setProfessorProjects(prev => [projectToRestore, ...prev])
			}
		} finally {
			setActiveActionId(null)
		}
	}

	const removeStudentIdea = async (ideaId) => {
		const token = getToken()
		if (!token) return

		setError('')
		setMessage('')

		if (!window.confirm('Are you sure you want to delete this idea?')) {
			return
		}

		setActiveActionId(ideaId)

		// Optimistic Update
		const ideaToRestore = studentIdeas.find(i => i._id === ideaId)
		setStudentIdeas((prev) => prev.filter((i) => i._id !== ideaId))

		try {
			const res = await apiFetch(`/api/projects/student-ideas/${ideaId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})

			const data = await readApiResponse(res)
			if (!res.ok) {
				throw new Error(data.message || 'Failed to delete idea')
			}

			setMessage('Idea deleted successfully')
		} catch (err) {
			console.error(err)
			setError('Server error while deleting idea. Reverting.')
			
			// Rollback
			if (ideaToRestore) {
				setStudentIdeas(prev => [ideaToRestore, ...prev])
			}
		} finally {
			setActiveActionId(null)
		}
	}

	// Theme-aware classes
	const cardClass = darkMode
		? 'bg-zinc-900 border-zinc-800'
		: 'bg-white border-zinc-200'

	const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
	const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
	const textMuted = darkMode ? 'text-zinc-500' : 'text-zinc-500'
	const borderClass = darkMode ? 'border-zinc-800' : 'border-zinc-200'
	const inputClass = darkMode
		? 'bg-black border-zinc-700 text-zinc-100 focus:border-zinc-800'
		: 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-800'
	const primaryButtonClass = darkMode
		? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
		: 'bg-zinc-900 text-white hover:bg-zinc-800'
	const secondaryButtonClass = darkMode
		? 'bg-zinc-800/80 text-zinc-200 border-zinc-700 hover:bg-zinc-600/80'
		: 'bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100'
	const dangerButtonClass = darkMode
		? 'bg-red-900/30 text-red-400 border-red-800 hover:bg-red-900/50'
		: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
	const alertErrorClass = darkMode
		? 'bg-red-900/30 border-red-800 text-red-400'
		: 'bg-red-100 border-red-200 text-red-600'
	const alertSuccessClass = darkMode
		? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
		: 'bg-green-100 border-emerald-200 text-green-800'
	const statCardClass = darkMode
		? 'bg-zinc-900/60'
		: 'bg-zinc-100'
	const statTitleClass = darkMode
		? 'text-sky-400'
		: 'text-zinc-800'
	const statSecondaryClass = darkMode
		? 'text-emerald-400'
		: 'text-green-800'
	const projectCardClass = darkMode ? 'bg-black' : 'bg-zinc-50'
	const interestedCardClass = darkMode ? 'bg-zinc-900' : 'bg-white'
	const matchBadgeClass = darkMode
		? 'bg-orange-900/30 text-orange-400 border-orange-800'
		: 'bg-orange-100 text-orange-600 border-orange-200'
	const countBadgeClass = darkMode
		? 'bg-zinc-800/60 text-zinc-300'
		: 'bg-zinc-200 text-zinc-900'

	return (
		<>
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				{/* Header Card */}
				<div className={`rounded-2xl border ${cardClass} p-6 mb-6`}>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
						<div>
							<h1
								className={`text-2xl font-bold tracking-tight ${textClass}`}
								style={{ fontFamily: '"Space Grotesk", sans-serif' }}
							>
								Projects Hub
							</h1>
							<p className={`mt-1 ${textSecondary}`}>
								{profile?.role === 'professor'
									? 'Review student ideas and publish projects.'
									: 'Submit ideas and vote on professor projects.'}
							</p>
						</div>

							{/* Error/Success Messages */}
							<div className="flex flex-col gap-2">
								{error && (
									<div className={`rounded-xl border px-4 py-2 text-sm ${alertErrorClass}`}>
										{error}
									</div>
								)}
								{message && (
									<div className={`rounded-xl border px-4 py-2 text-sm ${alertSuccessClass}`}>
										{message}
									</div>
								)}
							</div>
						</div>
				</div>

				{loading ? (
					<div className={`rounded-2xl border ${cardClass} p-12 text-center ${textSecondary}`}>
						Loading projects...
					</div>
				) : (
					<>
						{/* Main Content - Dense Bento Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{/* Student Section */}
							{profile?.role === 'student' && (
								<>
									{/* Submit Idea Card */}
									<div className={`rounded-2xl border ${cardClass} p-5`}>
										<h2 className={`text-lg font-semibold ${textClass}`}>Submit Idea</h2>
										<form onSubmit={handleStudentIdeaSubmit} className="mt-4 space-y-3">
											<input
												type="text"
												value={studentIdeaForm.title}
												onChange={(e) => {
													setError('')
													setMessage('')
													setStudentIdeaForm((prev) => ({ ...prev, title: e.target.value }))
												}}
												placeholder="Project title"
												className={`w-full px-4 py-2.5 rounded-xl border ${inputClass} text-sm`}
												required
											/>
											<textarea
												value={studentIdeaForm.description}
												onChange={(e) => {
													setError('')
													setMessage('')
													setStudentIdeaForm((prev) => ({ ...prev, description: e.target.value }))
												}}
												placeholder="Describe your idea..."
												rows={2}
												className={`w-full px-4 py-2.5 rounded-xl border ${inputClass} text-sm resize-none`}
												required
											/>
											<div className="grid grid-cols-2 gap-2">
												<select
													value={studentIdeaForm.branch}
													onChange={(e) => setStudentIdeaForm((prev) => ({ ...prev, branch: e.target.value }))}
													className={`px-3 py-2 rounded-xl border ${inputClass} text-sm`}
													required
												>
													<option value="" disabled>Branch</option>
													<option value="cse">CSE</option>
													<option value="cce">CCE</option>
													<option value="ece">ECE</option>
													<option value="mech">MECH</option>
													<option value="dsc">DCS</option>
													<option value="dec">DEC</option>
													<option value="others">Others</option>
												</select>
												<select
													value={studentIdeaForm.year}
													onChange={(e) => setStudentIdeaForm((prev) => ({ ...prev, year: e.target.value }))}
													className={`px-3 py-2 rounded-xl border ${inputClass} text-sm`}
													required
												>
													<option value="" disabled>Year</option>
													<option value="1">1st Year</option>
													<option value="2">2nd Year</option>
													<option value="3">3rd Year</option>
													<option value="4">4th Year</option>
												</select>
											</div>
											<button type="submit" disabled={isSubmitting} className={`w-full py-2.5 rounded-xl ${primaryButtonClass} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-sm font-semibold transition-colors`}>
												{isSubmitting ? 'Submitting...' : 'Submit Idea'}
											</button>
										</form>
									</div>

									{/* Your Ideas Card */}
									<div className={`rounded-2xl border ${cardClass} p-5`}>
										<h2 className={`text-lg font-semibold ${textClass}`}>Your Ideas</h2>
										<div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
											{studentIdeas.length === 0 ? (
												<p className={`text-sm ${textMuted}`}>No ideas submitted yet.</p>
											) : (
												studentIdeas.map((idea) => (
													<div key={idea._id} className={`p-3 rounded-xl border ${borderClass} ${darkMode ? 'bg-black' : 'bg-zinc-50'}`}>
														<div className="flex items-start justify-between gap-2">
															<p className={`text-sm font-medium ${textClass}`}>{idea.title}</p>
															{idea.student?._id && profile?._id && idea.student._id === profile._id && (
																<button
																	type="button"
																	disabled={activeActionId === idea._id}
																	onClick={() => removeStudentIdea(idea._id)}
																	className={`text-xs font-medium transition-colors shrink-0 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-500'} ${activeActionId === idea._id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
																>
																	{activeActionId === idea._id ? 'Deleting...' : 'Delete'}
																</button>
															)}
														</div>
														<p className={`mt-1 text-xs ${textSecondary}`}>{idea.description}</p>
														<p className={`mt-1 text-xs font-medium text-zinc-700 uppercase`}>{idea.branch} | Year {idea.year}</p>
													</div>
												))
											)}
										</div>
									</div>
								</>
							)}

							{/* Professor Section */}
							{profile?.role === 'professor' && (
								<>
									{/* Publish Project Card */}
									<div className={`rounded-2xl border ${cardClass} p-5`}>
										<h2 className={`text-lg font-semibold ${textClass}`}>Publish Project</h2>
										<form onSubmit={handleProfessorProjectSubmit} className="mt-4 space-y-3">
											<input
												type="text"
												value={profProjectForm.title}
												onChange={(e) => {
													setError('')
													setMessage('')
													setProfProjectForm((prev) => ({ ...prev, title: e.target.value }))
												}}
												placeholder="Project title"
												className={`w-full px-4 py-2.5 rounded-xl border ${inputClass} text-sm`}
												required
											/>
											<textarea
												value={profProjectForm.description}
												onChange={(e) => {
													setError('')
													setMessage('')
													setProfProjectForm((prev) => ({ ...prev, description: e.target.value }))
												}}
												placeholder="Project description..."
												rows={2}
												className={`w-full px-4 py-2.5 rounded-xl border ${inputClass} text-sm resize-none`}
												required
											/>
											<button type="submit" disabled={isSubmitting} className={`w-full py-2.5 rounded-xl ${primaryButtonClass} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-sm font-semibold transition-colors`}>
												{isSubmitting ? 'Publishing...' : 'Publish Project'}
											</button>
										</form>
									</div>

									{/* Student Ideas Card */}
									<div className={`rounded-2xl border ${cardClass} p-5`}>
										<h2 className={`text-lg font-semibold ${textClass}`}>Student Ideas</h2>
										<div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
											{studentIdeas.length === 0 ? (
												<p className={`text-sm ${textMuted}`}>No student ideas yet.</p>
											) : (
												studentIdeas.map((idea) => (
													<div key={idea._id} className={`p-3 rounded-xl border ${borderClass} ${darkMode ? 'bg-black' : 'bg-zinc-50'}`}>
														<p className={`text-sm font-medium ${textClass}`}>{idea.title}</p>
														<p className={`mt-1 text-xs ${textSecondary}`}>{idea.description}</p>
														<p className={`mt-1 text-xs font-medium text-zinc-700 uppercase`}>{idea.branch} | Year {idea.year}</p>
														<p className={`mt-1 text-xs ${textMuted}`}>By {idea.student?.name || 'Student'}</p>
													</div>
												))
											)}
										</div>
									</div>
								</>
							)}

							{/* Stats Card - Available to all */}
							<div className={`rounded-2xl border ${cardClass} p-5`}>
								<h2 className={`text-lg font-semibold ${textClass}`}>Overview</h2>
								<div className="mt-4 grid grid-cols-2 gap-4">
									<div className={`text-center p-3 rounded-xl ${statCardClass}`}>
										<p className={`text-2xl font-bold ${statTitleClass}`}>{studentIdeas.length}</p>
										<p className={`text-xs ${textMuted}`}>Student Ideas</p>
									</div>
									<div className={`text-center p-3 rounded-xl ${darkMode ? 'bg-emerald-900/20' : 'bg-green-100'}`}>
										<p className={`text-2xl font-bold ${statSecondaryClass}`}>{professorProjects.length}</p>
										<p className={`text-xs ${textMuted}`}>Prof Projects</p>
									</div>
								</div>
							</div>
						</div>

						{/* Professor Projects - Full Width */}
						<div className={`rounded-2xl border ${cardClass} p-5 mt-4`}>
							<h2 className={`text-xl font-semibold ${textClass}`}>Professor Projects Open for Interest</h2>
							<div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{professorProjects.length === 0 ? (
									<p className={`text-sm ${textMuted} col-span-full`}>No professor projects listed yet.</p>
								) : (
									professorProjects.map((project) => (
										<div key={project._id} className={`flex h-full flex-col p-4 rounded-xl border ${borderClass} ${projectCardClass}`}>
											<div className="flex items-start justify-between gap-2">
												<p className={`text-sm font-semibold ${textClass}`}>{project.title}</p>
												<div className="flex items-center gap-2 shrink-0">
													{profile?.role === 'student' && matchScores[project._id] && (
														<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${matchBadgeClass}`} title={matchScores[project._id].explanation}>
															🔥 {matchScores[project._id].matchScore}% Match
														</span>
													)}
													<span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${countBadgeClass}`}>
														{project.interestCount || 0}
													</span>
													{profile?.role === 'professor' && project.mine && (
														<button
															type="button"
															disabled={activeActionId === project._id}
															onClick={() => removePublishedProject(project._id)}
															className={`text-xs font-medium transition-colors ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-500'} ${activeActionId === project._id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
														>
															{activeActionId === project._id ? 'Removing...' : 'Remove'}
														</button>
													)}
												</div>
											</div>
											<p className={`mt-2 text-sm ${textSecondary}`}>{project.description}</p>
											<p className={`mt-2 text-xs ${textMuted}`}>By {project.professor?.name || 'Unknown'}</p>

											{profile?.role === 'professor' && project.mine && project.interestedStudents?.length > 0 && (
												<div className={`mt-3 pt-3 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
													<p className={`text-xs font-semibold uppercase ${textMuted} mb-2`}>Interested Students</p>
													<div className="space-y-1">
														{project.interestedStudents.map((student) => (
															<div key={student._id || student.email} className={`p-2 rounded-lg ${interestedCardClass}`}>
																<p className={`text-xs font-semibold ${textClass}`}>{student.name || 'Unknown Student'}</p>
																<p className={`text-xs ${textMuted}`}>{student.email || 'No email'}</p>
															</div>
														))}
													</div>
												</div>
											)}

											{profile?.role === 'student' && (
													<div className="mt-auto pt-4">
														<button
															type="button"
															disabled={activeActionId === project._id}
															onClick={() => {
																setActiveActionId(project._id)
																toggleInterest(project._id).finally(() => setActiveActionId(null))
															}}
															className={`w-full rounded-lg py-2 text-xs font-semibold transition-colors cursor-pointer ${
																project.votedByMe
																	? dangerButtonClass
																	: secondaryButtonClass
																} ${activeActionId === project._id ? 'opacity-50 cursor-not-allowed' : ''}`}
														>
															{activeActionId === project._id ? 'Updating...' : project.votedByMe ? 'Remove Interest' : 'I am Interested'}
														</button>
													</div>
											)}
										</div>
									))
								)}
							</div>
						</div>

						{hasMoreProjects && professorProjects.length > 0 && (
							<div className="mt-6 flex justify-center">
								<button
									onClick={() => {
										const nextPage = page + 1
										setPage(nextPage)
										fetchProfessorProjects(nextPage)
									}}
									className={`px-4 py-2 rounded-xl border ${borderClass} ${textClass} text-sm font-semibold transition-colors cursor-pointer ${darkMode ? 'bg-zinc-900/40 hover:bg-zinc-800/80' : 'bg-white hover:bg-zinc-100'}`}
								>
									Load More
								</button>
							</div>
						)}
					</>
				)}
			</main>
		</>
	)
}

export default Projects