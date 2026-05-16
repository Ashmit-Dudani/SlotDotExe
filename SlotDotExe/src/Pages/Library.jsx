import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '../components/AppNavbar'
import TimeInput from './TimeInput'
import { apiFetch } from '../lib/api'

const CATEGORIES = ['Computer Science', 'Software Engineering', 'Software Architecture', 'Interview Prep', 'Programming Languages', 'Data Science', 'Machine Learning', 'Cybersecurity', 'Web Development'];
const AUTHORS = ['Donald Knuth', 'Robert C. Martin', 'Erich Gamma', 'Thomas H. Cormen', 'Andrew Hunt', 'Steve McConnell', 'Harold Abelson', 'Martin Fowler', 'Eric Freeman', 'Eric Evans', 'Gayle Laakmann McDowell', 'Kyle Simpson', 'Eric Matthes', 'Joshua Bloch', 'Peter Norvig'];
const PREFIXES = ['The Art of', 'Introduction to', 'Mastering', 'Advanced', 'Head First', 'Effective', 'Cracking the', 'Clean', 'Learning', 'Programming'];
const TOPICS = ['Algorithms', 'Design Patterns', 'React', 'Python', 'Java', 'JavaScript', 'C++', 'Data Structures', 'Cloud Native', 'DevOps', 'System Design', 'AI'];
const ISSUED_LEDGER_KEY = 'slotDotExeIssuedBooks_v4';

const formatDateForInput = (date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const addDaysToDateString = (dateString, daysToAdd) => {
	const [year, month, day] = String(dateString).split('-').map(Number);
	if (!year || !month || !day) {
		return formatDateForInput(new Date());
	}

	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + daysToAdd);
	return formatDateForInput(date);
};

const MAX_ISSUE_DAYS = 14;

const DUMMY_BOOKS = Array.from({ length: 500 }, (_, i) => {
	const category = CATEGORIES[i % CATEGORIES.length];
	const author = AUTHORS[(i * 3) % AUTHORS.length];
	const prefix = PREFIXES[(i * 7) % PREFIXES.length];
	const topic = TOPICS[(i * 11) % TOPICS.length];

	const earlyBooks = [
		{ title: 'The Art of Computer Programming', author: 'Donald Knuth', category: 'Computer Science' },
		{ title: 'Clean Code', author: 'Robert C. Martin', category: 'Software Engineering' },
		{ title: 'Design Patterns', author: 'Erich Gamma', category: 'Software Engineering' },
		{ title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science' },
		{ title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Software Engineering' },
		{ title: 'Code Complete', author: 'Steve McConnell', category: 'Software Engineering' },
		{ title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', category: 'Computer Science' },
		{ title: 'Refactoring', author: 'Martin Fowler', category: 'Software Engineering' },
		{ title: 'Head First Design Patterns', author: 'Eric Freeman', category: 'Software Engineering' },
		{ title: 'Domain-Driven Design', author: 'Eric Evans', category: 'Software Architecture' },
		{ title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', category: 'Interview Prep' },
		{ title: 'Eloquent JavaScript', author: 'Kyle Simpson', category: 'Programming Languages' },
		{ title: 'Python Crash Course', author: 'Eric Matthes', category: 'Programming Languages' },
		{ title: 'Effective Java', author: 'Joshua Bloch', category: 'Programming Languages' },
		{ title: 'Artificial Intelligence', author: 'Peter Norvig', category: 'Computer Science' },
	];

	const baseBook = i < 15 ? earlyBooks[i] : {
		title: `${prefix} ${topic} (${i + 1})`,
		author,
		category,
	}

	return { id: i + 1, ...baseBook, totalQuantity: (i % 5) + 1 };
})

function Library({ darkMode = false }) {
	const [userProfile, setUserProfile] = useState(null)
	const [profileLoading, setProfileLoading] = useState(true)
	const [issuedLedger, setIssuedLedger] = useState(() => {
		try {
			const saved = localStorage.getItem(ISSUED_LEDGER_KEY)
			return saved ? JSON.parse(saved) : {}
		} catch {
			return {}
		}
	})

	const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10))
	const [bookingTime, setBookingTime] = useState('09:00')
	const [bookingEndTime, setBookingEndTime] = useState('11:00')
	const [activeTimePicker, setActiveTimePicker] = useState(null)

	const [bookedSeatsMap, setBookedSeatsMap] = useState(() => ({}) )
	const [selectedSeat, setSelectedSeat] = useState(null)

	// Theme-aware classes
	const bgClass = darkMode ? 'bg-black' : 'bg-zinc-50'
	const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
	const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
	const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const inputClass = darkMode
		? 'bg-black border-zinc-700 text-zinc-100 focus:border-zinc-800'
		: 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-800'
	const modalClass = darkMode ? 'bg-zinc-900' : 'bg-white'
	const modalCloseButtonClass = darkMode
		? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-600'
		: 'bg-white border-zinc-200 hover:bg-zinc-100'
	const sectionBorderClass = darkMode ? 'border-zinc-800' : 'border-zinc-200'
	const primaryButtonClass = darkMode
		? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
		: 'bg-zinc-900 text-white hover:bg-zinc-800'
	const cancelButtonClass = darkMode
		? 'text-red-400 hover:text-red-300'
		: 'text-red-600 hover:text-red-700'
	const bookedSeatClass = darkMode
		? 'bg-red-900/50 border border-red-700 text-red-400 cursor-not-allowed'
		: 'bg-red-200 border border-red-300 text-red-700 cursor-not-allowed'
	const selectedSeatClass = 'bg-emerald-300 border-2 border-emerald-500 text-emerald-700'
	const availableSeatClass = darkMode
		? 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200'
		: 'bg-zinc-100 border border-zinc-200 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'

	const getUserStorageKey = (prefix) => {
		const userId = userProfile?._id || userProfile?.id || userProfile?.email || 'guest'
		return `${prefix}:${userId}`
	}

	const currentUserId = userProfile?._id || userProfile?.id || userProfile?.email || null

	useEffect(() => {
		const fetchProfile = async () => {
			const token = localStorage.getItem('slotDotExeToken')
			if (!token) {
				setProfileLoading(false)
				return
			}

			try {
				const res = await apiFetch('/api/auth/profile', {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					const data = await res.json()
					setUserProfile(data)
				}
			} catch (error) {
				console.error('Failed to fetch user profile for library', error)
			} finally {
				setProfileLoading(false)
			}
		}

		fetchProfile()
	}, [])

	const [libraryBookings, setLibraryBookings] = useState([])

	const fetchLibraryBookings = async () => {
		const token = localStorage.getItem('slotDotExeToken')
		if (!token) return

		try {
			const res = await apiFetch('/api/librarySeats', {
				headers: { 'Authorization': `Bearer ${token}` }
			})
			if (res.ok) {
				const data = await res.json()
				setLibraryBookings(data)
			}
		} catch (error) {
			console.error("Failed to fetch library bookings", error)
		}
	}

	useEffect(() => {
		if (profileLoading) return
		fetchLibraryBookings()
	}, [profileLoading])

	useEffect(() => {
		const map = {}
		libraryBookings.forEach(b => {
			if (!map[b.date]) map[b.date] = []
			map[b.date].push({
				id: b._id,
				seatNumber: b.seatNumber,
				startTime: b.startTime,
				endTime: b.endTime,
				userId: b.user?._id || b.user?.id || b.user || 'Guest',
				userName: b.user?.name || 'Guest',
			})
		})
		setBookedSeatsMap(map)
	}, [libraryBookings])

	useEffect(() => {
		setSelectedSeat(null)
	}, [bookingDate, bookingTime, bookingEndTime])

	useEffect(() => {
		if (!activeTimePicker) return
		const onKeyDown = (e) => {
			if (e.key === 'Escape') setActiveTimePicker(null)
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [activeTimePicker])

	const openTimePicker = (field) => {
		setActiveTimePicker({ field })
	}

	const confirmTimePicker = (timeValue) => {
		if (!activeTimePicker) return
		if (activeTimePicker.field === 'bookingTime') setBookingTime(timeValue)
		if (activeTimePicker.field === 'bookingEndTime') setBookingEndTime(timeValue)
		setActiveTimePicker(null)
	}

	const parseTime = (timeStr) => {
		const [h, m] = timeStr.split(':').map(Number)
		return h * 60 + m
	}

	const startMins = parseTime(bookingTime)
	const endMins = parseTime(bookingEndTime)

	const isTimeValid = endMins > startMins && endMins - startMins <= 4 * 60

	const currentBookings = bookedSeatsMap[bookingDate] ?? []

	const bookingUserId = currentUserId || 'guest'
	
	const allUserBookings = Object.entries(bookedSeatsMap).flatMap(([date, bookings]) => 
		bookings.filter(b => b.userId === bookingUserId).map(b => ({ ...b, date }))
	)
	const hasActiveBooking = allUserBookings.length > 0

	const getSeatBookingConflicts = (seatNumber) => {
		return currentBookings.filter(b => {
			if (b.seatNumber !== seatNumber) return false
			const bStart = parseTime(b.startTime)
			const bEnd = parseTime(b.endTime)
			return startMins < bEnd && endMins > bStart
		})
	}

	const isSeatBooked = (seatNumber) => getSeatBookingConflicts(seatNumber).length > 0

	const cancelSeatBooking = async (dateKey, bookingId) => {
		if (!window.confirm("Are you sure you want to cancel this seat booking?")) return
		const token = localStorage.getItem('slotDotExeToken')
		if (!token) return
		try {
			const res = await apiFetch(`/api/librarySeats/${bookingId}`, {
				method: 'DELETE',
				headers: { 'Authorization': `Bearer ${token}` }
			})
			if (res.ok) {
				await fetchLibraryBookings()
			} else {
				const data = await res.json()
				alert(data.message || 'Failed to cancel booking.')
			}
		} catch (err) {
			console.error("Failed to cancel seat booking", err)
		}
	}

	const handleBookSeat = async () => {
		if (!selectedSeat || !bookingDate || !bookingTime || !bookingEndTime) return
		if (!isTimeValid) {
			alert('Booking duration must be between 1 minute and 4 hours.')
			return
		}
		if (isSeatBooked(selectedSeat)) return

		

		const token = localStorage.getItem('slotDotExeToken')
		if (!token) {
			alert('Please log in to book a seat.')
			return
		}

		try {
			const res = await apiFetch('/api/librarySeats', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					seatNumber: selectedSeat,
					date: bookingDate,
					startTime: bookingTime,
					endTime: bookingEndTime
				})
			})

			if (res.ok) {
				await fetchLibraryBookings()
				setSelectedSeat(null)
			} else {
				const data = await res.json()
				alert(data.message || 'Failed to book seat.')
			}
		} catch (err) {
			console.error("Failed to book seat", err)
			alert('Server error while booking seat.')
		}
	}

	const [bookSearch, setBookSearch] = useState('')
	const todayDate = formatDateForInput(new Date())
	const [issueDialog, setIssueDialog] = useState(null)

	useEffect(() => {
		localStorage.setItem(ISSUED_LEDGER_KEY, JSON.stringify(issuedLedger))
	}, [issuedLedger])

	const getBookIssueRecords = (bookId) => {
		const records = issuedLedger[bookId]
		return Array.isArray(records) ? records : []
	}

	const getIssuedByCurrentUser = (bookId) => {
		if (!currentUserId) return 0
		return getBookIssueRecords(bookId).filter((record) => record.issuerId === currentUserId).length
	}

	const getTotalIssuedForBook = (bookId) => {
		return getBookIssueRecords(bookId).length
	}

	const issueBook = (bookId, totalQuantity, startDate, dueDate) => {
		if (!currentUserId || !userProfile?.email) return

		setIssuedLedger((prev) => {
			const issueRecords = Array.isArray(prev[bookId]) ? prev[bookId] : []
			if (issueRecords.length >= totalQuantity) return prev

			return {
				...prev,
				[bookId]: [
					...issueRecords,
					{
						id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
						issuerId: currentUserId,
						issuerEmail: userProfile.email,
						startDate,
						dueDate,
					},
				],
			}
		})
	}

	const returnBook = (bookId) => {
		if (!currentUserId) return

		setIssuedLedger((prev) => {
			const issueRecords = Array.isArray(prev[bookId]) ? prev[bookId] : []

			let indexToRemove = -1
			for (let i = issueRecords.length - 1; i >= 0; i -= 1) {
				if (issueRecords[i].issuerId === currentUserId) {
					indexToRemove = i
					break
				}
			}

			if (indexToRemove < 0) return prev

			const updatedRecords = issueRecords.filter((_, index) => index !== indexToRemove)

			if (updatedRecords.length === 0) {
				const { [bookId]: _removed, ...rest } = prev
				return rest
			}

			return { ...prev, [bookId]: updatedRecords }
		})
	}

	const openIssueDialog = (book) => {
		if (!currentUserId || !userProfile?.email) return

		const totalIssued = getTotalIssuedForBook(book.id)
		if (totalIssued >= book.totalQuantity) return

		setIssueDialog({
			bookId: book.id,
			bookTitle: book.title,
			totalQuantity: book.totalQuantity,
			startDate: todayDate,
			dueDate: addDaysToDateString(todayDate, MAX_ISSUE_DAYS),
			error: '',
		})
	}

	const handleIssueDialogDateChange = (field, value) => {
		setIssueDialog((prev) => {
			if (!prev) return prev

			const updated = {
				...prev,
				[field]: value,
				error: '',
			}

			if (field === 'startDate') {
				const maxDueDate = addDaysToDateString(value, MAX_ISSUE_DAYS)
				if (!updated.dueDate || updated.dueDate < value) {
					updated.dueDate = value
				}
				if (updated.dueDate > maxDueDate) {
					updated.dueDate = maxDueDate
				}
			}

			return updated
		})
	}

	const confirmIssueBook = () => {
		if (!issueDialog) return

		const { startDate, dueDate, bookId, totalQuantity } = issueDialog
		if (!startDate || !dueDate) {
			setIssueDialog((prev) => (prev ? { ...prev, error: 'Please select both start date and due date.' } : prev))
			return
		}

		if (dueDate < startDate) {
			setIssueDialog((prev) => (prev ? { ...prev, error: 'Due date cannot be before start date.' } : prev))
			return
		}

		const maxDueDate = addDaysToDateString(startDate, MAX_ISSUE_DAYS)
		if (dueDate > maxDueDate) {
			setIssueDialog((prev) => (prev ? { ...prev, error: 'Due date cannot be more than 2 weeks after start date.' } : prev))
			return
		}

		issueBook(bookId, totalQuantity, startDate, dueDate)
		setIssueDialog(null)
	}

	const filteredBooks = useMemo(() => {
		return DUMMY_BOOKS.filter(book =>
			book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
			book.author.toLowerCase().includes(bookSearch.toLowerCase()) ||
			book.category.toLowerCase().includes(bookSearch.toLowerCase())
		)
	}, [bookSearch])

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
						className={`relative rounded-3xl shadow-2xl p-6 ${modalClass}`}
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={() => setActiveTimePicker(null)}
							className={`absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border text-zinc-500 shadow-lg transition-colors ${modalCloseButtonClass}`}
							aria-label="Close"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
						<TimeInput
							value={activeTimePicker.field === 'bookingTime' ? bookingTime : bookingEndTime}
							onConfirm={confirmTimePicker}
							format="24h"
						/>
					</div>
				</div>
			) : null}

			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
				{profileLoading ? (
					<div className={`${cardClass} rounded-2xl border p-8 text-center ${textSecondary}`}>Loading your library...</div>
				) : (
					<div className="space-y-4">
						{/* Seat Booking Section */}
						<div className={`${cardClass} rounded-2xl border p-5`}>
							<h1
								className={`text-2xl font-bold tracking-tight ${textClass}`}
								style={{ fontFamily: '"Space Grotesk", sans-serif' }}
							>
								{userProfile ? `${userProfile.name}'s Library` : 'Library Seat Booking'}
							</h1>
							<p className={`mt-1 ${textSecondary}`}>
								Reserve your study spot.
							</p>

							<div className="mt-6 flex flex-col gap-6 lg:flex-row">
								{/* Booking Controls & Preview */}
								<div className="lg:w-1/3 flex flex-col gap-6">
									<div className={`p-4 rounded-xl border ${darkMode ? 'bg-black border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
										<h2 className={`text-base font-semibold ${textClass}`}>Select Date & Time</h2>
										<div className="mt-3 space-y-3">
											<div>
												<label className={`block text-sm font-medium ${textClass} mb-1.5`}>Date (Max 1 day forward)</label>
												<input
													type="date"
													value={bookingDate}
													min={new Date().toISOString().slice(0, 10)}
													max={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
													onChange={(e) => setBookingDate(e.target.value)}
													style={{ colorScheme: darkMode ? 'dark' : 'light' }}
													className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
												/>
											</div>
											<div className="grid grid-cols-2 gap-2">
												<div>
													<label className={`block text-sm font-medium ${textClass} mb-1.5`}>Start Time</label>
													<button
														type="button"
														onClick={() => openTimePicker('bookingTime')}
														className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass} text-left flex items-center justify-between cursor-pointer`}
													>
														{bookingTime || 'Start'}
														<svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
													</button>
												</div>
												<div>
													<label className={`block text-sm font-medium ${textClass} mb-1.5`}>End Time</label>
													<button
														type="button"
														onClick={() => openTimePicker('bookingEndTime')}
														className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass} text-left flex items-center justify-between cursor-pointer`}
													>
														{bookingEndTime || 'End'}
														<svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
														</svg>
													</button>
												</div>
											</div>

											{!isTimeValid && bookingTime && bookingEndTime && (
												<p className="text-xs text-red-700">End time must be after start time and max duration is 4 hours.</p>
											)}
										</div>

										<div className={`mt-4 pt-4 border-t ${sectionBorderClass}`}>
											<p className={`text-sm ${textSecondary}`}>
												Selected Seat: <strong className={darkMode ? 'text-sky-400' : 'text-zinc-800'}>{selectedSeat ? `Seat ${selectedSeat}` : 'None'}</strong>
											</p>
											{/* {hasActiveBooking && (
												// <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
												// 	thank u for booking.
												// </p>
											)} */}
											<button
												type="button"
												disabled={!selectedSeat || !isTimeValid || hasActiveBooking}
												onClick={handleBookSeat}
												className={`w-full py-2 mt-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${primaryButtonClass}`}
											>
												Book Seat
											</button>
										</div>

										<div className="mt-4 flex flex-col gap-1.5 text-sm">
											<div className="flex items-center gap-2">
												<div className={`h-4 w-4 rounded ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-200 border-zinc-300'}`} />
												<span className={textSecondary}>Available</span>
											</div>
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 rounded bg-emerald-300 border border-emerald-400" />
												<span className={textSecondary}>Selected</span>
											</div>
											<div className="flex items-center gap-2">
												<div className="h-4 w-4 rounded bg-red-300 border border-red-400" />
												<span className={textSecondary}>Booked</span>
											</div>
										</div>
									</div>

									{/* Library Seat Bookings Preview */}
									<div className={`p-5 rounded-2xl border ${darkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
										<h2 className={`text-lg font-semibold ${textClass} mb-4`}>
											Seat Bookings Preview
										</h2>

										{Object.keys(bookedSeatsMap).length === 0 ? (
											<div className="flex flex-col items-center justify-center gap-3 text-center py-6">
												<p className={textSecondary}>No active seat bookings across all dates.</p>
											</div>
										) : (
											<div className="space-y-3 max-h-80 overflow-y-auto">
												{Object.entries(bookedSeatsMap).flatMap(([date, dateBookings]) => 
													dateBookings.map(booking => ({ ...booking, date }))
												).sort((a, b) => a.date.localeCompare(b.date)).map((booking) => {
													const isMine = booking.userId === bookingUserId;

													return (
														<div
															key={`${booking.date}-${booking.id}`}
															className={`p-4 rounded-xl border transition-colors ${
																darkMode ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-200 bg-zinc-50'
															}`}
														>
															<div className="flex items-center justify-between gap-3">
																<div className="flex flex-col sm:flex-row sm:items-center gap-3">
																	<span className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-bold ${
																		darkMode ? 'bg-sky-900/50 text-sky-400' : 'bg-zinc-200 text-zinc-800'
																	}`}>
																		Seat {booking.seatNumber}
																	</span>
																	<span className={`text-sm font-medium ${textClass}`}>
																		{booking.date} | {booking.startTime} - {booking.endTime}
																	</span>
																</div>
																{isMine && (
																	<button
																		type="button"
																		onClick={() => cancelSeatBooking(booking.date, booking.id)}
																		className={`text-xs font-medium transition-colors cursor-pointer ${cancelButtonClass}`}
																	>
																		Cancel
																	</button>
																)}
															</div>
															<p className={`mt-2 text-xs ${textSecondary}`}>
																Booked by: {isMine ? 'You' : booking.userName}
															</p>
														</div>
													);
												})}
											</div>
										)}
									</div>
								</div>

								{/* Seat Grid */}
								<div className="lg:w-2/3 flex flex-col gap-6">
									<div className={`grid grid-cols-10 gap-2 p-4 rounded-2xl border ${cardClass}`}>
										{Array.from({ length: 100 }, (_, i) => {
											const seatNumber = i + 1
											const conflicts = getSeatBookingConflicts(seatNumber)
											const isBooked = conflicts.length > 0
											const isSelected = selectedSeat === seatNumber
											const bookingInfo = isBooked ? conflicts.map(c => `${c.startTime} - ${c.endTime}`).join(', ') : ''

											return (
												<button
													key={seatNumber}
													type="button"
													disabled={isBooked}
													onClick={() => setSelectedSeat(seatNumber)}
													className={`
														aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer
														${isBooked
															? bookedSeatClass
															: isSelected
																? selectedSeatClass
																: availableSeatClass
														}
													`}
													title={isBooked ? `Seat ${seatNumber} (Booked: ${bookingInfo})` : `Seat ${seatNumber}`}
												>
													{seatNumber}
												</button>
											)
										})}
									</div>
								</div>
							</div>
						</div>

						{/* Book Issuing Section */}
						<div className={`${cardClass} rounded-2xl border p-5`}>
							<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<h2
										className={`text-xl font-bold tracking-tight ${textClass}`}
										style={{ fontFamily: '"Space Grotesk", sans-serif' }}
									>
										Book Issuing System
									</h2>
									<p className={`mt-1 ${textSecondary}`}>
										Search our collection of 500 books and manage quantities.
									</p>
								</div>
							</div>

							<div className="mt-6">
								<input
									type="text"
									placeholder="Search books by title, author, or category..."
									value={bookSearch}
									onChange={(e) => setBookSearch(e.target.value)}
									className={`w-full px-4 py-3 rounded-xl border text-sm ${inputClass} text-base`}
								/>

								<div className={`mt-4 overflow-x-auto rounded-2xl border max-h-80 ${darkMode ? 'bg-black border-zinc-800' : 'bg-white border-zinc-200'}`}>
									<table className="w-full text-left text-sm">
										<thead className={`sticky top-0 text-xs uppercase font-semibold z-10 border-b ${darkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
											<tr>
												<th className="px-4 py-3">Title</th>
												<th className="px-4 py-3">Author</th>
												<th className="px-4 py-3 text-center">Availability</th>
												<th className="px-4 py-3">Issued To</th>
												<th className="px-4 py-3 text-center">Actions</th>
											</tr>
										</thead>
										<tbody className={textSecondary}>
											{filteredBooks.slice(0, 100).map((book) => {
												const currentlyIssued = getIssuedByCurrentUser(book.id)
												const totalIssued = getTotalIssuedForBook(book.id)
												const issueRecords = getBookIssueRecords(book.id)
												const availableCount = book.totalQuantity - totalIssued
												const isNoneAvailable = availableCount <= 0

												return (
													<tr key={book.id} className={`border-b ${darkMode ? 'border-zinc-800 hover:bg-zinc-900' : 'border-zinc-200 hover:bg-zinc-100'} transition-colors`}>
														<td className="px-4 py-3">
															<span className={`font-medium ${textClass}`}>{book.title}</span>
															<span className={`mt-0.5 block text-xs uppercase ${darkMode ? 'text-sky-400' : 'text-zinc-800'}`}>{book.category}</span>
														</td>
														<td className="px-4 py-3">{book.author}</td>
														<td className="px-4 py-3 text-center">
															<span className={`inline-flex min-w-12 items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
																isNoneAvailable
																	? darkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'
																	: darkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
															}`}>
																{availableCount} / {book.totalQuantity}
															</span>
															{currentlyIssued > 0 && (
																<span className="mt-1 block text-xs">You: {currentlyIssued}</span>
															)}
														</td>
														<td className={`px-4 py-3 text-xs ${textSecondary}`}>
															{issueRecords.length === 0 ? (
																<span>No active issues</span>
															) : (
																<div className="max-h-12 space-y-1 overflow-y-auto">
																	{issueRecords.map((record) => (
																		<p key={record.id} className="break-all">
																			{record.issuerEmail}<br />Due: {record.dueDate}
																		</p>
																	))}
																</div>
															)}
														</td>
														<td className="px-4 py-3 text-center">
															<div className="flex items-center justify-center gap-2">
																<button
																	type="button"
																	onClick={() => openIssueDialog(book)}
																	disabled={isNoneAvailable}
																	className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
																		darkMode
																			? 'bg-sky-900/40 text-sky-400 border border-sky-700 hover:bg-sky-900/60 disabled:opacity-50 disabled:cursor-not-allowed'
																			: 'bg-white text-zinc-800 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed'
																	}`}
																>
																	Issue
																</button>
																<button
																	type="button"
																	onClick={() => returnBook(book.id)}
																	disabled={currentlyIssued <= 0}
																	className={`text-xs font-semibold transition-colors cursor-pointer ${
																		darkMode
																			? 'text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed'
																			: 'text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
																	}`}
																>
																	Return
																</button>
															</div>
														</td>
													</tr>
												)
											})}
											{filteredBooks.length > 100 && (
												<tr>
													<td colSpan="5" className="px-4 py-3 text-center text-xs">
														Showing top 100 results. Use the search to narrow down...
													</td>
												</tr>
											)}
											{filteredBooks.length === 0 && (
												<tr>
													<td colSpan="5" className="px-6 py-8 text-center text-zinc-400">
														No books found matching your search.
													</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</div>
						</div>
					</div>
				)}
			</main>

			{issueDialog && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
					<div className={`w-full max-w-md ${cardClass} rounded-2xl shadow-2xl p-6`}>
						<h3 className={`text-lg font-semibold ${textClass}`}>Issue Book</h3>
						<p className={`mt-1 text-sm ${textSecondary}`}>{issueDialog.bookTitle}</p>

						<div className="mt-5 space-y-4">
							<div>
								<label className={`block text-sm font-medium ${textClass} mb-1.5`}>Start Date</label>
								<input
									type="date"
									value={issueDialog.startDate}
									min={todayDate}
									onChange={(e) => handleIssueDialogDateChange('startDate', e.target.value)}
									style={{ colorScheme: darkMode ? 'dark' : 'light' }}
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								/>
							</div>

							<div>
								<label className={`block text-sm font-medium ${textClass} mb-1.5`}>Due Date (Max 2 Weeks)</label>
								<input
									type="date"
									value={issueDialog.dueDate}
									min={issueDialog.startDate || todayDate}
									max={addDaysToDateString(issueDialog.startDate || todayDate, MAX_ISSUE_DAYS)}
									onChange={(e) => handleIssueDialogDateChange('dueDate', e.target.value)}
									style={{ colorScheme: darkMode ? 'dark' : 'light' }}
									className={`w-full px-3 py-2 rounded-xl border text-sm ${inputClass}`}
								/>
							</div>

							{issueDialog.error && (
								<p className="text-xs text-red-700">{issueDialog.error}</p>
							)}
						</div>

						<div className="mt-6 flex items-center justify-end gap-3">
							<button
								type="button"
								onClick={() => setIssueDialog(null)}
								className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors cursor-pointer ${
									darkMode
										? 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
										: 'border-zinc-200 text-zinc-600 hover:bg-zinc-100'
								}`}
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={confirmIssueBook}
								className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${primaryButtonClass}`}
							>
								Confirm Issue
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

export default Library