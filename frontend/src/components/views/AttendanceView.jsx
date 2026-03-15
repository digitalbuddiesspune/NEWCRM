import React, { useEffect, useState, useRef } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const AttendanceView = () => {
  const { user, hasFullAccess } = useAuth()
  const isHR = hasFullAccess()
  const [employees, setEmployees] = useState([])
  const [attendances, setAttendances] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterEmployeeId, setFilterEmployeeId] = useState('')
  const [checkInTime, setCheckInTime] = useState(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const employeeRef = useRef(null)

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees')
      const payload = res.data
      setEmployees(Array.isArray(payload) ? payload : payload?.data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const fetchAttendanceByMonth = async () => {
    try {
      const params = { month: selectedMonth }
      if (!isHR && user?._id) params.employeeId = user._id
      const res = await api.get('/attendance/by-month', { params })
      const payload = res.data
      setAttendances(Array.isArray(payload) ? payload : [])
    } catch (err) {
      console.error('Failed to fetch attendance:', err)
    }
  }

  useEffect(() => {
    if (isHR) fetchEmployees()
  }, [isHR])

  useEffect(() => {
    if (isHR || user?._id) fetchAttendanceByMonth()
  }, [isHR, user?._id, selectedMonth])

  useEffect(() => {
    if (!isHR && user?._id) {
      setSelectedEmployee(user._id)
      setEmployeeSearch(user.name || '')
    }
  }, [isHR, user?._id, user?.name])

  useEffect(() => {
    const stored = localStorage.getItem('attendance_session')
    if (stored) {
      try {
        const { employeeId, checkIn } = JSON.parse(stored)
        const checkInDate = new Date(checkIn)
        if (!isHR && employeeId !== user?._id) {
          localStorage.removeItem('attendance_session')
          return
        }
        const emp = isHR ? employees.find((e) => e._id === employeeId) : { _id: user?._id, name: user?.name }
        if (emp && (emp._id === employeeId)) {
          setSelectedEmployee(employeeId)
          setEmployeeSearch(emp.name || '')
          setCheckInTime(checkInDate)
          setElapsedMs(Date.now() - checkInDate.getTime())
        }
      } catch (e) {
        localStorage.removeItem('attendance_session')
      }
    }
  }, [employees, isHR, user?._id, user?.name])

  useEffect(() => {
    if (checkInTime) {
      timerRef.current = setInterval(() => {
        setElapsedMs((prev) => prev + 1000)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [checkInTime])

  // Auto checkout when the day ends (midnight passed) and user still has an active session
  useEffect(() => {
    if (!checkInTime || !selectedEmployee) return
    const checkDayEnd = () => {
      const now = new Date()
      const checkInDate = new Date(checkInTime)
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const checkInStr = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}-${String(checkInDate.getDate()).padStart(2, '0')}`
      if (todayStr > checkInStr) {
        api.post('/attendance/check-out', { employee: selectedEmployee })
          .then(() => {
            setCheckInTime(null)
            setElapsedMs(0)
            localStorage.removeItem('attendance_session')
            if (timerRef.current) clearInterval(timerRef.current)
            fetchAttendanceByMonth()
          })
          .catch(() => {})
      }
    }
    const dayEndInterval = setInterval(checkDayEnd, 60 * 1000)
    checkDayEnd()
    return () => clearInterval(dayEndInterval)
  }, [checkInTime, selectedEmployee])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (employeeRef.current && !employeeRef.current.contains(e.target)) setEmployeeOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [employeeOpen, setEmployeeOpen] = useState(false)
  const filteredEmployees = employees.filter((e) =>
    (e.name || '').toLowerCase().includes(employeeSearch.toLowerCase())
  )

  const getCheckInLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ failed: true, reason: 'unsupported' })
        return
      }
      const onPosition = async (pos, done) => {
        const lat = Number(pos.coords.latitude)
        const lon = Number(pos.coords.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lon)) {
          done({ failed: true, reason: 'unavailable' })
          return
        }
        let address = ''
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            { headers: { Accept: 'application/json', 'User-Agent': 'CRM-Attendance/1.0' } }
          )
          const data = await res.json()
          const addr = data.address || {}
          address = [
            addr.house_number,
            addr.road,
            addr.neighbourhood || addr.suburb,
            addr.village || addr.city_district,
            addr.city || addr.town,
            addr.state,
          ]
            .filter(Boolean)
            .join(', ') || data.display_name || ''
        } catch {
          // keep address empty; we'll show coords
        }
        done({ latitude: lat, longitude: lon, address })
      }
      const onError = (err, tryFallback) => {
        const reason = err?.code === 1 ? 'permission_denied' : err?.code === 3 ? 'timeout' : 'unavailable'
        if (tryFallback && reason !== 'permission_denied') {
          navigator.geolocation.getCurrentPosition(
            (pos) => onPosition(pos, resolve),
            () => resolve({ failed: true, reason }),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          )
        } else {
          resolve({ failed: true, reason })
        }
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => onPosition(pos, resolve),
        (err) => onError(err, true),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      )
    })
  }

  const handleCheckIn = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee')
      return
    }
    if (!isHR && selectedEmployee !== user?._id) {
      setError('You can only check in for yourself')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const location = await getCheckInLocation()
      const hasValidLocation = !location.failed && location.latitude != null && location.longitude != null &&
        !Number.isNaN(Number(location.latitude)) && !Number.isNaN(Number(location.longitude))
      if (!hasValidLocation) {
        const msg = location.reason === 'permission_denied'
          ? 'Location is required to check in. Allow location for this site (click the lock icon in the address bar → Site settings → Location → Allow), then try again.'
          : location.reason === 'timeout'
          ? 'Location is required to check in. Request timed out—ensure device location is on and try again.'
          : location.reason === 'unsupported'
          ? 'Location is required to check in. Your browser does not support geolocation.'
          : 'Location is required to check in. Enable device location and allow this site to use it, then try again.'
        setError(msg)
        setLoading(false)
        return
      }
      const payload = {
        employee: selectedEmployee,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        ...(location.address && location.address.trim() && { address: String(location.address).trim() }),
      }
      const res = await api.post('/attendance/check-in', payload)
      const checkIn = new Date(res.data.attendance?.checkIn || Date.now())
      setCheckInTime(checkIn)
      setElapsedMs(0)
      localStorage.setItem(
        'attendance_session',
        JSON.stringify({ employeeId: selectedEmployee, checkIn: checkIn.toISOString() })
      )
      fetchAttendanceByMonth()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error checking in')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee')
      return
    }
    if (!isHR && selectedEmployee !== user?._id) {
      setError('You can only check out for yourself')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/attendance/check-out', { employee: selectedEmployee })
      setCheckInTime(null)
      setElapsedMs(0)
      localStorage.removeItem('attendance_session')
      if (timerRef.current) clearInterval(timerRef.current)
      fetchAttendanceByMonth()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error checking out')
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelect = (emp) => {
    setSelectedEmployee(emp._id)
    setEmployeeSearch(emp.name || '')
    setEmployeeOpen(false)
  }

  const monthLabel = selectedMonth
    ? new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : ''

  const filteredAttendances = filterEmployeeId
    ? attendances.filter((a) => (a.employee?._id || a.employee) === filterEmployeeId)
    : attendances

  const getStatusBadge = (status) => {
    const classes = {
      'Full Day': 'bg-green-100 text-green-800',
      'Half Day': 'bg-amber-100 text-amber-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      Absent: 'bg-gray-100 text-gray-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status] || ''}`}>
        {status}
      </span>
    )
  }

  return (
    <div className='p-8'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-900'>Attendance</h1>
        <p className='text-gray-600 mt-1 text-sm'>
          {isHR ? 'View and manage all employees\' attendance.' : 'Check in and check out to track your working hours.'}
        </p>
      </div>

      <div className='bg-white rounded-xl shadow-lg border border-gray-100 p-6 max-w-2xl mb-8'>
        <div className='mb-4 relative' ref={employeeRef}>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Employee</label>
          {isHR ? (
            <>
              <input
                type='text'
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value)
                  setEmployeeOpen(true)
                  if (!e.target.value) setSelectedEmployee('')
                }}
                onFocus={() => setEmployeeOpen(true)}
                placeholder='Search employee...'
                className='w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              {employeeOpen && (
                <ul className='absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xl shadow-lg py-1 max-h-48 overflow-auto'>
                  {filteredEmployees.map((emp) => (
                    <li
                      key={emp._id}
                      onClick={() => handleEmployeeSelect(emp)}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${selectedEmployee === emp._id ? 'bg-blue-100' : ''}`}
                    >
                      {emp.name}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-700'>
              {user?.name || '—'}
            </div>
          )}
        </div>

        <p className='text-xs text-gray-500 mb-2'>
          Location is required to check in. When you click Check In, allow location access when your browser asks.
        </p>
        <div className='flex items-center gap-4 mb-4'>
          <button
            onClick={handleCheckIn}
            disabled={loading || checkInTime}
            className='px-6 py-3 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            Check In
          </button>
          <button
            onClick={handleCheckOut}
            disabled={loading || !checkInTime}
            className='px-6 py-3 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            Check Out
          </button>
        </div>

        {checkInTime && (
          <div className='mt-4 p-4 bg-blue-50 rounded-xl'>
            <p className='text-sm text-gray-600'>Time elapsed</p>
            <p className='text-2xl font-bold text-blue-700 font-mono'>{formatTime(elapsedMs)}</p>
          </div>
        )}

        {error && <p className='text-red-600 text-sm mt-4'>{error}</p>}
      </div>

      <div className='bg-white rounded-lg shadow overflow-x-auto'>
        <div className='px-4 py-3 border-b flex flex-wrap items-center justify-between gap-4'>
          <h2 className='text-lg font-bold text-gray-900'>
            {isHR ? "Attendance" : "Your Attendance"}
          </h2>
          <div className='flex flex-wrap items-center gap-4'>
            {isHR && (
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium text-gray-700'>Employee</label>
                <select
                  value={filterEmployeeId}
                  onChange={(e) => setFilterEmployeeId(e.target.value)}
                  className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]'
                >
                  <option value=''>All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className='flex items-center gap-2'>
              <label className='text-sm font-medium text-gray-700'>Month</label>
              <input
                type='month'
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
        </div>
        <table className='w-full table-auto text-sm'>
          <thead>
            <tr className='text-left border-b'>
              <th className='px-4 py-3'>Date</th>
              <th className='px-4 py-3'>Employee</th>
              <th className='px-4 py-3'>Check In</th>
              <th className='px-4 py-3'>Check Out</th>
              <th className='px-4 py-3'>Check-in location</th>
              <th className='px-4 py-3'>Duration</th>
              <th className='px-4 py-3'>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendances.length === 0 ? (
              <tr>
                <td colSpan={7} className='px-4 py-12 text-center text-gray-500'>
                  {attendances.length === 0
                    ? `No attendance records for ${monthLabel}`
                    : `No attendance records for selected employee in ${monthLabel}`}
                </td>
              </tr>
            ) : (
              filteredAttendances.map((a) => (
                <tr key={a._id} className='border-b hover:bg-gray-50'>
                  <td className='px-4 py-3'>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                  <td className='px-4 py-3 font-medium'>{a.employee?.name || '—'}</td>
                  <td className='px-4 py-3'>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                  <td className='px-4 py-3'>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                  <td className='px-4 py-3 text-gray-600 max-w-[280px] align-top' title={a.checkInLatitude != null && a.checkInLongitude != null ? `${Number(a.checkInLatitude).toFixed(6)}, ${Number(a.checkInLongitude).toFixed(6)}` : null}>
                    {a.checkInAddress || a.checkInLatitude != null && a.checkInLongitude != null ? (
                      <span className='block'>
                        {a.checkInAddress && <span className='block'>{a.checkInAddress}</span>}
                        {(a.checkInLatitude != null && a.checkInLongitude != null) && (
                          <span className='text-xs text-gray-500 mt-0.5 block font-mono'>
                            {Number(a.checkInLatitude).toFixed(6)}, {Number(a.checkInLongitude).toFixed(6)}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className='text-gray-400 italic'>Location unavailable</span>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    {a.durationHours != null
                      ? `${a.durationHours.toFixed(2)} hrs`
                      : a.checkIn
                      ? 'In progress'
                      : '—'}
                  </td>
                  <td className='px-4 py-3'>{getStatusBadge(a.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AttendanceView
