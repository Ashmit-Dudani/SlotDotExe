import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import TimeInput from './TimeInput'
import { apiFetch } from '../lib/api'

function Home({ darkMode = false }) {
	console.log('[Home] Rendering, darkMode:', darkMode)
	const [tasksByDate, setTasksByDate] = useState({})
	const [draftByDate, setDraftByDate] = useState({})
	const [activeTimePicker, setActiveTimePicker] = useState(null)
	const [selectedDateKey, setSelectedDateKey] = useState(() => new Date().toISOString().slice(0, 10))
	const emptyDraft = { task: '', time: '', endTime: '', venue: '', type: 'class' }

	// Theme-aware classes
	const bgClass = darkMode ? 'bg-black' : 'bg-zinc-50'
	const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
	const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
	const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const inputClass = darkMode
		? 'bg-black border-zinc-700 text-zinc-100 focus:border-zinc-800'
		: 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-800'

	useEffect(() => {
		if (!activeTimePicker) return
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setActiveTimePicker(null)
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [activeTimePicker])

	const fetchTasks = async () => {
		const token = localStorage.getItem('slotDotExeToken');
		if (!token) return;
		try {
			const res = await apiFetch('/api/tasks', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) {
				const data = await res.json();
				const formattedTasks = {};
				data.forEach(task => {
					if (!formattedTasks[task.dateKey]) {
						formattedTasks[task.dateKey] = [];
					}
					formattedTasks[task.dateKey].push({
						id: task._id,
						text: task.text,
						time: task.time,
						endTime: task.endTime || '',
						venue: task.venue,
						type: task.type
					});
				});
				setTasksByDate(formattedTasks);
			}
		} catch (error) {
			console.error("Failed to fetch tasks", error);
		}
	};

	useEffect(() => {
		fetchTasks();
	}, [])

	const handleDraftChange = (dateKey, field, value) => {
		setDraftByDate((prev) => ({
			...prev,
			[dateKey]: {
				...(prev[dateKey] ?? emptyDraft),
				[field]: value,
			},
		}))
	}

	const openTimePicker = (dateKey, field) => {
		setActiveTimePicker({ dateKey, field })
	}

	const confirmTimePicker = (timeValue) => {
		if (!activeTimePicker) return
		handleDraftChange(activeTimePicker.dateKey, activeTimePicker.field, timeValue)
		setActiveTimePicker(null)
	}

	const selectedDraft = useMemo(() => {
		return draftByDate[selectedDateKey] ?? emptyDraft
	}, [draftByDate, selectedDateKey])

	const addTask = async (dateKey) => {
		const draft = draftByDate[dateKey] ?? emptyDraft
		const taskText = draft.task?.trim()
		if (!taskText) return

		if (draft.time && draft.endTime && draft.endTime <= draft.time) {
			alert('End time must be after start time for same-day events.')
			return
		}

		const isLT = draft.venue?.trim().toUpperCase().startsWith('LT-');
		if (isLT && (!draft.time || !draft.endTime)) {
			alert('Starting and ending time must be provided for LT bookings.')
			return;
		}

		const token = localStorage.getItem('slotDotExeToken');
		if (!token) return;

		const payload = {
			dateKey,
			text: taskText,
			time: draft.time || 'Not set',
			endTime: draft.endTime || '',
			venue: draft.venue?.trim() || 'Not set',
			type: draft.type || 'class',
		};

		try {
			let requestOk = false
			let failureMessage = 'Failed to save task.'

			if (draft.editingId) {
				const res = await apiFetch(`/api/tasks/${draft.editingId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify(payload)
				});
				requestOk = res.ok
				if (!res.ok) {
					const data = await res.json().catch(() => ({}))
					failureMessage = data.message || failureMessage
				}
				if (res.ok) fetchTasks();
			} else {
				const res = await apiFetch('/api/tasks', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					},
					body: JSON.stringify(payload)
				});
				requestOk = res.ok
				if (!res.ok) {
					const data = await res.json().catch(() => ({}))
					failureMessage = data.message || failureMessage
				}
				if (res.ok) fetchTasks();
			}

			if (!requestOk) {
				alert(failureMessage)
				return
			}

			const task = {
				id: draft.editingId || `${dateKey}-${Date.now()}`,
				text: taskText,
				time: draft.time || 'Not set',
				endTime: draft.endTime || '',
				venue: draft.venue?.trim() || 'Not set',
				type: draft.type || 'class',
			}

			setTasksByDate((prev) => {
				const dateTasks = prev[dateKey] ?? []
				if (draft.editingId) {
					return { ...prev, [dateKey]: dateTasks.map((t) => (t.id === draft.editingId ? task : t)) }
				}
				return { ...prev, [dateKey]: [...dateTasks, task] }
			})

			setDraftByDate((prev) => ({ ...prev, [dateKey]: emptyDraft }))
		} catch (error) {
			console.error("Failed to save task", error);
		}
	}

	const deleteTask = async (dateKey, taskId) => {
		const token = localStorage.getItem('slotDotExeToken');
		if (!token) return;

		try {
			const res = await apiFetch(`/api/tasks/${taskId}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			});
			if (res.ok) {
				setTasksByDate((prev) => ({
					...prev,
					[dateKey]: prev[dateKey].filter((t) => t.id !== taskId),
				}))
			}
		} catch (error) {
			console.error("Failed to delete task", error);
		}
	}

	const editTask = (dateKey, task) => {
		setSelectedDateKey(dateKey)
		setDraftByDate((prev) => ({
			...prev,
			[dateKey]: {
				task: task.text,
				time: task.time === 'Not set' ? '' : task.time,
				endTime: task.endTime || '',
				venue: task.venue === 'Not set' ? '' : task.venue,
				type: task.type || 'class',
				editingId: task.id,
			},
		}))
		document.getElementById('home')?.scrollIntoView()
	}

	const hasAnyTask = useMemo(
		() => Object.values(tasksByDate).some((tasks) => tasks.length > 0),
		[tasksByDate],
	)

	const scheduledDays = useMemo(() => {
		const keys = Object.keys(tasksByDate)
			.filter((key) => (tasksByDate[key] ?? []).length > 0)
			.sort((a, b) => a.localeCompare(b))

		return keys.map((key) => {
			const date = new Date(`${key}T00:00:00`)
			return {
				key,
				weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
				fullDate: date.toLocaleDateString(undefined, {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
				}),
			}
		})
	}, [tasksByDate])

	const typeColors = {
		class: darkMode ? 'bg-sky-900/30 text-sky-300 border-sky-700' : 'bg-zinc-100 text-zinc-800 border-zinc-300',
		lab: darkMode ? 'bg-violet-900/30 text-violet-300 border-violet-700' : 'bg-violet-50 text-violet-700 border-violet-200',
		exam: darkMode ? 'bg-rose-900/30 text-rose-300 border-rose-700' : 'bg-rose-50 text-rose-700 border-rose-200',
		assignment: darkMode ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-50 text-amber-700 border-amber-200',
		meet: darkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700' : 'bg-green-100 text-emerald-700 border-emerald-200',
	}

	return (
		<>
			{activeTimePicker ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
					<button
						type="button"
						className="absolute inset-0 cursor-default"
						onClick={() => setActiveTimePicker(null)}
						aria-label="Close time picker"
					/>
					<div
						className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => setActiveTimePicker(null)}
							className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 shadow-lg hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
							aria-label="Close"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						<TimeInput
							value={(draftByDate[activeTimePicker.dateKey] ?? emptyDraft)[activeTimePicker.field]}
							onConfirm={confirmTimePicker}
							format="24h"
						/>
					</div>
				</div>
			) : null}

			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				{/* Bento Grid Layout */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{/* Add Task Card */}
					<div className={`${cardClass} rounded-2xl border p-5 lg:col-span-2`} id="home">
						<h1
							className={`text-xl font-bold tracking-tight ${textClass}`}
							style={{ fontFamily: '"Space Grotesk", sans-serif' }}
						>
							Task Calendar
						</h1>
						<p className={`mt-1 text-sm ${textSecondary}`}>
							Add tasks for any upcoming date.
						</p>

						<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>Date</label>
								<input
									type="date"
									value={selectedDateKey}
									min={new Date().toISOString().slice(0, 10)}
									onChange={(e) => setSelectedDateKey(e.target.value)}
									style={{ colorScheme: darkMode ? 'dark' : 'light' }}
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								/>
							</div>

							<div>
								<label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>Task</label>
								<input
									type="text"
									value={selectedDraft.task}
									onChange={(event) => handleDraftChange(selectedDateKey, 'task', event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault()
											addTask(selectedDateKey)
										}
									}}
									placeholder="Task name"
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								/>
							</div>

							<div>
								<label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>Type</label>
								<select
									value={selectedDraft.type}
									onChange={(event) => handleDraftChange(selectedDateKey, 'type', event.target.value)}
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								>
									<option value="class">Class</option>
									<option value="lab">Lab</option>
									<option value="exam">Exam</option>
									<option value="assignment">Assignment</option>
									<option value="meet">Meet</option>
								</select>
							</div>

							<div>
								<label className={`block text-xs font-semibold ${textSecondary} uppercase tracking-wider mb-1.5`}>Venue</label>
								<input
									type="text"
									list="lt-venues"
									value={selectedDraft.venue}
									onChange={(event) => handleDraftChange(selectedDateKey, 'venue', event.target.value)}
									placeholder="LT-1"
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								/>
								<datalist id="lt-venues">
									{Array.from({ length: 20 }, (_, i) => (
										<option key={i} value={`LT-${i + 1}`} />
									))}
								</datalist>
							</div>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => openTimePicker(selectedDateKey, 'time')}
								className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
									darkMode
										? 'border-zinc-700 text-zinc-300 hover:border-sky-500 hover:text-sky-400'
										: 'border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-800'
								}`}
							>
								{selectedDraft.time ? selectedDraft.time : 'Start Time'}
							</button>

							<button
								type="button"
								onClick={() => openTimePicker(selectedDateKey, 'endTime')}
								className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
									darkMode
										? 'border-zinc-700 text-zinc-300 hover:border-sky-500 hover:text-sky-400'
										: 'border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-800'
								}`}
							>
								{selectedDraft.endTime ? selectedDraft.endTime : 'End Time'}
							</button>

							<button
								type="button"
								onClick={() => addTask(selectedDateKey)}
								className="ml-auto px-6 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-semibold transition-colors cursor-pointer"
							>
								{selectedDraft.editingId ? 'Save Changes' : 'Add Task'}
							</button>
						</div>
					</div>

					{/* Stats Card */}
					<div className={`${cardClass} rounded-2xl border p-5`}>
						<h2 className={`text-base font-semibold ${textClass}`}>Quick Stats</h2>
						<div className="mt-3 space-y-3">
							<div className="flex items-center justify-between">
								<span className={`text-sm ${textSecondary}`}>Total Tasks</span>
								<span className={`text-xl font-bold ${darkMode ? 'text-sky-400' : 'text-zinc-800'}`}>
									{Object.values(tasksByDate).reduce((sum, tasks) => sum + tasks.length, 0)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className={`text-sm ${textSecondary}`}>Days Scheduled</span>
								<span className={`text-xl font-bold ${darkMode ? 'text-sky-400' : 'text-zinc-800'}`}>{scheduledDays.length}</span>
							</div>
							<div className="flex flex-wrap gap-1.5 mt-3">
								{Object.entries(typeColors).map(([type, colors]) => {
									const count = Object.values(tasksByDate).flat().filter(t => t.type === type).length
									return count > 0 ? (
										<span key={type} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
											{type}: {count}
										</span>
									) : null
								})}
							</div>
						</div>
					</div>
				</div>

				{/* Timetable Preview */}
				{hasAnyTask && (
					<div className={`mt-4 ${cardClass} rounded-2xl border p-5`}>
						<h2
							className={`text-lg font-bold tracking-tight ${textClass}`}
							style={{ fontFamily: '"Space Grotesk", sans-serif' }}
						>
							Timetable Preview
						</h2>

						<div className="mt-4 overflow-x-auto">
							<table className="w-full text-left">
								<thead>
									<tr className={`border-b ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Date</th>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Type</th>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Task</th>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Time</th>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Venue</th>
										<th className={`pb-3 text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{scheduledDays.flatMap((day) => {
										const tasks = tasksByDate[day.key] ?? []
										return tasks.map((task, index) => (
											<tr key={task.id} className={`border-b ${darkMode ? 'border-zinc-800 hover:bg-zinc-900' : 'border-zinc-200 hover:bg-zinc-100'} transition-colors`}>
												<td className={`py-3 font-medium ${textClass}`}>
													{index === 0 ? `${day.fullDate} (${day.weekday})` : ''}
												</td>
												<td className="py-3">
													<span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${typeColors[task.type] || typeColors.class}`}>
														{task.type}
													</span>
												</td>
												<td className={`py-3 ${textSecondary}`}>{task.text}</td>
												<td className={`py-3 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{task.time}{task.endTime ? ` - ${task.endTime}` : ''}</td>
												<td className={`py-3 ${textSecondary}`}>{task.venue}</td>
												<td className="py-3">
													<div className="flex gap-2">
														<button
															type="button"
															onClick={() => editTask(day.key, task)}
															className={`text-sm font-medium transition-colors cursor-pointer ${
																darkMode ? 'text-sky-400 hover:text-sky-300' : 'text-zinc-800 hover:text-zinc-700'
															}`}
														>
															Edit
														</button>
														<button
															type="button"
															onClick={() => deleteTask(day.key, task.id)}
															className="text-sm font-medium text-red-700 hover:text-red-400 transition-colors cursor-pointer"
														>
															Delete
														</button>
													</div>
												</td>
											</tr>
										))
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{!hasAnyTask && (
					<div className={`mt-4 ${cardClass} rounded-2xl border p-8 text-center`}>
						<div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-900' : 'bg-zinc-100'}`}>
							<svg className={`w-6 h-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
						</div>
						<h3 className={`text-base font-semibold ${textClass}`}>No tasks yet</h3>
						<p className={`mt-1 text-sm ${textSecondary}`}>Add tasks above to build your timetable.</p>
					</div>
				)}
			</main>
		</>
	)
}

export default Home