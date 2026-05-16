import React, { useState } from 'react'
import { apiFetch } from '../lib/api'

function Login({ onLogin, darkMode = false }) {
	const [isLogin, setIsLogin] = useState(true)
	const [role, setRole] = useState('student')
	const [errorMessage, setErrorMessage] = useState('')
	const [showPassword, setShowPassword] = useState(false)

	const [formData, setFormData] = useState({
		email: '',
		password: '',
		name: '',
		rollNo: '',
		branch: 'cse',
		department: '',
		officeDetail: ''
	})

	const handleChange = (e) => {
		setFormData({ ...formData, [e.target.name]: e.target.value })
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setErrorMessage('')
		const url = isLogin ? '/api/auth/login' : '/api/auth/signup';

		const payload = {
			email: formData.email,
			password: formData.password,
		};

		if (!isLogin) {
			payload.name = formData.name;
			payload.role = role;
			if (role === 'student') {
				payload.branch = formData.branch;
				payload.batch = formData.rollNo;
			} else {
				payload.department = formData.department;
				payload.office = formData.officeDetail;
			}
		}

		try {
			const res = await apiFetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const data = await res.json();

			if (!res.ok) {
				setErrorMessage(data.message || 'Authentication failed')
				return;
			}

			if (isLogin) {
				localStorage.setItem('slotDotExeToken', data.token);
				localStorage.setItem('slotDotExeAuth', 'true');
				onLogin();
			} else {
				setErrorMessage('')
				alert('Sign up successful! Please log in.');
				setIsLogin(true);
			}
		} catch (error) {
			console.error(error);
			setErrorMessage('Something went wrong. Make sure backend is running.')
		}
	}

	// Theme-aware classes
	const pageClass = darkMode ? 'bg-black' : 'bg-zinc-50'
	const cardClass = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
	const textClass = darkMode ? 'text-zinc-100' : 'text-zinc-900'
	const textSecondary = darkMode ? 'text-zinc-400' : 'text-zinc-600'
	const inputClass = darkMode
		? 'bg-black border-zinc-700 text-zinc-100 focus:border-zinc-800'
		: 'bg-white border-zinc-200 text-zinc-900 focus:border-zinc-800'
	const toggleClass = darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-500'
	const toggleActiveClass = darkMode
		? 'bg-zinc-600 text-sky-400 shadow-sm'
		: 'bg-white text-zinc-800 shadow-sm'

	return (
		<div className={`min-h-screen flex items-center justify-center p-4 ${pageClass}`}>
			<div className="w-full max-w-md">
				{/* Logo */}
				<div className="text-center mb-10">
					<h1
						className={`text-4xl font-bold tracking-tight ${darkMode ? 'text-sky-400' : 'text-zinc-800'}`}
						style={{ fontFamily: '"Space Grotesk", sans-serif' }}
					>
						SlotDotExe
					</h1>
					<p className={`mt-2 ${textSecondary}`}>
						{isLogin ? 'Welcome back' : 'Create your account'}
					</p>
				</div>

				{/* Card */}
				<div className={`${cardClass} rounded-3xl shadow-xl border p-8`}>
					{/* Role Toggle */}
					{!isLogin && (
						<div className={`flex ${toggleClass} rounded-xl p-1 mb-8`}>
							<button
								type="button"
								onClick={() => setRole('student')}
								className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${role === 'student' ? toggleActiveClass : ''}`}
							>
								Student
							</button>
							<button
								type="button"
								onClick={() => setRole('professor')}
								className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${role === 'professor' ? toggleActiveClass : ''}`}
							>
								Professor
							</button>
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-5">
						{errorMessage && (
							<div className={`rounded-xl px-4 py-3 text-sm ${darkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-600 border border-red-200'}`}>
								{errorMessage}
							</div>
						)}

						{!isLogin && (
							<div>
								<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Full Name</label>
								<input
									type="text"
									name="name"
									value={formData.name}
									onChange={handleChange}
									className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
									placeholder="John Doe"
									required={!isLogin}
								/>
							</div>
						)}

						<div>
							<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Email Address</label>
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleChange}
								className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
								placeholder="you@example.com"
								required
							/>
						</div>

						{!isLogin && role === 'student' && (
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Roll No.</label>
									<input
										type="text"
										name="rollNo"
										value={formData.rollNo}
										onChange={handleChange}
										className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
										placeholder="e.g. 21BCE123"
										required={!isLogin && role === 'student'}
									/>
								</div>
								<div>
									<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Branch</label>
									<select
										name="branch"
										value={formData.branch}
										onChange={handleChange}
										className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
									>
										<option value="cse">CSE</option>
										<option value="cce">CCE</option>
										<option value="ece">ECE</option>
										<option value="mech">MECH</option>
										<option value="dec">DEC</option>
										<option value="dsc">DCS</option>
										<option value="others">Others</option>
									</select>
								</div>
							</div>
						)}

						{!isLogin && role === 'professor' && (
							<>
								<div>
									<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Department</label>
									<input
										type="text"
										name="department"
										value={formData.department}
										onChange={handleChange}
										className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
										placeholder="e.g. Computer Science"
										required={!isLogin && role === 'professor'}
									/>
								</div>
								<div>
									<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Office Detail</label>
									<input
										type="text"
										name="officeDetail"
										value={formData.officeDetail}
										onChange={handleChange}
										className={`w-full px-4 py-3 rounded-xl border ${inputClass} text-sm`}
										placeholder="Office No, Building No"
										required={!isLogin && role === 'professor'}
									/>
								</div>
							</>
						)}

						<div>
							<label className={`block text-sm font-medium mb-1.5 ${textClass}`}>Password</label>
							<div className="relative">
								<input
									type={showPassword ? 'text' : 'password'}
									name="password"
									value={formData.password}
									onChange={handleChange}
									className={`w-full px-4 py-3 pr-20 rounded-xl border ${inputClass} text-sm`}
									placeholder="••••••••"
									required
									autoComplete={isLogin ? 'current-password' : 'new-password'}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((prev) => !prev)}
									className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors cursor-pointer ${darkMode ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-400 hover:text-zinc-700'}`}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{showPassword ? 'Hide' : 'Show'}
								</button>
							</div>
						</div>

						<button
							type="submit"
							className={`w-full py-3 mt-6 rounded-xl font-semibold transition-colors cursor-pointer ${
								darkMode
									? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'
									: 'bg-zinc-900 hover:bg-zinc-800 text-white'
							}`}
						>
							{isLogin ? 'Sign In' : 'Sign Up'}
						</button>
					</form>

					<p className={`mt-6 text-center text-sm ${textSecondary}`}>
						{isLogin ? "Don't have an account? " : "Already have an account? "}
						<button
							type="button"
							onClick={() => setIsLogin(!isLogin)}
							className={`font-semibold transition-colors cursor-pointer ${darkMode ? 'text-sky-400 hover:text-sky-300' : 'text-zinc-800 hover:text-zinc-700'}`}
						>
							{isLogin ? 'Sign up' : 'Sign in'}
						</button>
					</p>
				</div>
			</div>
		</div>
	)
}

export default Login