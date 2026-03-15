import React, { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const PLATFORMS = ['All', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'Other']

const SocialCalendarView = () => {
  const { canManageSocialCalendar } = useAuth()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAddPost, setShowAddPost] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [postForm, setPostForm] = useState({
    title: '',
    description: '',
    platform: 'Instagram',
    scheduledTime: '',
    status: 'Scheduled',
    referenceLink: '',
    assignedTo: [],
  })
  const [employees, setEmployees] = useState([])
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [assigneeOpen, setAssigneeOpen] = useState(false)
  const now = new Date()
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth())
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const clientRef = useRef(null)
  const assigneeRef = useRef(null)

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients')
      setClients(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const fetchCalendar = async () => {
    if (!selectedClient) return
    try {
      setLoading(true)
      setError(null)
      const res = await api.get(`/social-calendars/client/${selectedClient._id}`)
      setCalendar(res.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error loading calendar')
      setCalendar(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees')
      setEmployees(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedClient) fetchCalendar()
    else setCalendar(null)
  }, [selectedClient])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false)
      if (assigneeRef.current && !assigneeRef.current.contains(e.target)) setAssigneeOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getAssignedNames = (assignedTo) => {
    if (!assignedTo) return ''
    const arr = Array.isArray(assignedTo) ? assignedTo : [assignedTo]
    return arr.map((a) => (typeof a === 'object' ? a?.name : '')).filter(Boolean).join(', ')
  }

  const toggleAssignedEmployee = (empId) => {
    setPostForm((f) => ({
      ...f,
      assignedTo: f.assignedTo.includes(empId)
        ? f.assignedTo.filter((id) => id !== empId)
        : [...f.assignedTo, empId],
    }))
  }

  const filteredClients = clients.filter((c) =>
    (c.clientName || '').toLowerCase().includes(clientSearch.toLowerCase())
  )

  const filteredEmployees = employees.filter((emp) =>
    (emp.name || '').toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  const handleClientSelect = (client) => {
    setSelectedClient(client)
    setClientSearch(client.clientName || '')
    setClientOpen(false)
  }

  const handleAddPost = async (e) => {
    e.preventDefault()
    if (!selectedClient || !postForm.title.trim()) return
    try {
      const res = await api.post(`/social-calendars/client/${selectedClient._id}/posts`, {
        ...postForm,
        scheduledTime: postForm.scheduledTime || undefined,
        assignedTo: Array.isArray(postForm.assignedTo) ? postForm.assignedTo : [],
      })
      setCalendar(res.data?.calendar ?? res.data)
      setAssigneeSearch('')
      setAssigneeOpen(false)
      setPostForm({ title: '', description: '', platform: 'Instagram', scheduledTime: '', status: 'Scheduled', referenceLink: '', assignedTo: [] })
      setShowAddPost(false)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error adding post')
    }
  }

  const handleEditPost = (post) => {
    setEditingPost(post)
    const scheduledTime = post.scheduledTime
      ? new Date(post.scheduledTime).toISOString().slice(0, 16)
      : ''
    setPostForm({
      title: post.title || '',
      description: post.description || '',
      platform: post.platform || 'Instagram',
      scheduledTime,
      status: post.status || 'Scheduled',
      referenceLink: post.referenceLink || '',
      assignedTo: Array.isArray(post.assignedTo)
        ? post.assignedTo.map((a) => (typeof a === 'object' ? a._id : a)).filter(Boolean)
        : post.assignedTo ? [post.assignedTo._id || post.assignedTo] : [],
    })
  }

  const handleUpdatePost = async (e) => {
    e.preventDefault()
    if (!selectedClient || !editingPost || !postForm.title.trim()) return
    try {
      const res = await api.put(
        `/social-calendars/client/${selectedClient._id}/posts/${editingPost._id}`,
        {
          ...postForm,
          scheduledTime: postForm.scheduledTime || undefined,
          assignedTo: Array.isArray(postForm.assignedTo) ? postForm.assignedTo : [],
        }
      )
      setCalendar(res.data?.calendar ?? res.data)
      setEditingPost(null)
      setAssigneeSearch('')
      setAssigneeOpen(false)
      setPostForm({ title: '', description: '', platform: 'Instagram', scheduledTime: '', status: 'Scheduled', referenceLink: '', assignedTo: [] })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error updating post')
    }
  }

  const closePostModal = () => {
    setShowAddPost(false)
    setEditingPost(null)
    setAssigneeSearch('')
    setAssigneeOpen(false)
    setPostForm({ title: '', description: '', platform: 'Instagram', scheduledTime: '', status: 'Scheduled', referenceLink: '', assignedTo: [] })
  }

  const handleDownloadXLS = () => {
    if (!selectedClient || !calendar?.posts?.length) return
    const dataRows = calendar.posts.map((p) => [
      p.title || '',
      p.description || '',
      p.platform || '',
      p.scheduledTime ? new Date(p.scheduledTime).toLocaleString() : '',
      p.status || '',
      getAssignedNames(p.assignedTo),
    ])
    const rows = [
      ['Client', selectedClient.clientName],
      ['Exported', new Date().toLocaleString()],
      [],
      ['Title', 'Description', 'Platform', 'Scheduled Date', 'Status', 'Assigned To'],
      ...dataRows,
    ]
    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Set column widths so content is fully visible (wch = width in characters)
    const headerLengths = [5, 11, 8, 14, 6, 11]
    const colWidths = [0, 1, 2, 3, 4, 5].map((colIdx) => {
      const maxContent = Math.max(
        headerLengths[colIdx],
        ...dataRows.map((r) => String(r[colIdx] || '').length)
      )
      return Math.max(maxContent + 2, headerLengths[colIdx] + 2)
    })
    ws['!cols'] = colWidths.map((wch) => ({ wch }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Social Media Calendar')
    const fileName = `social-calendar-${selectedClient.clientName?.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xls`
    XLSX.writeFile(wb, fileName, { bookType: 'xls' })
  }

  const posts = calendar?.posts || []
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay()

  const goPrevMonth = () => {
    setCalendarMonth((m) => {
      if (m === 0) {
        setCalendarYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }
  const goNextMonth = () => {
    setCalendarMonth((m) => {
      if (m === 11) {
        setCalendarYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  const getPostsForDay = (day) => {
    return posts.filter((p) => {
      if (!p.scheduledTime) return false
      const d = new Date(p.scheduledTime)
      return d.getDate() === day && d.getMonth() === calendarMonth && d.getFullYear() === calendarYear
    })
  }

  const openNewPostForDate = (day) => {
    if (!canManageSocialCalendar() || !selectedClient) return
    const date = new Date(calendarYear, calendarMonth, day, 9, 0)
    const scheduledTime = date.toISOString().slice(0, 16)
    setPostForm((f) => ({
      ...f,
      title: '',
      description: '',
      platform: 'Instagram',
      scheduledTime,
      status: 'Scheduled',
      referenceLink: '',
      assignedTo: [],
    }))
    setEditingPost(null)
    setShowAddPost(true)
  }

  const handleDayClick = (day) => {
    const dayPosts = getPostsForDay(day)
    if (dayPosts.length === 0 && canManageSocialCalendar()) {
      openNewPostForDate(day)
    }
  }

  return (
    <div className='p-8'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Social Media Calendar</h1>
        <p className='text-gray-600 mt-1 text-sm'>Plan and schedule social media posts for your clients.</p>
      </div>

      {/* Client Selector */}
      <div className='bg-white rounded-lg shadow p-4 mb-6'>
        <label className='block text-sm font-semibold text-gray-700 mb-2'>Select Client</label>
        <div className='relative max-w-md' ref={clientRef}>
          <input
            type='text'
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value)
              setClientOpen(true)
              if (!e.target.value) setSelectedClient(null)
            }}
            onFocus={() => setClientOpen(true)}
            placeholder='Search and select a client...'
            className='w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent'
            autoComplete='off'
          />
          {clientOpen && (
            <ul className='absolute z-10 top-full left-0 right-0 mt-1 max-h-56 overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg py-1'>
              {filteredClients.length === 0 ? (
                <li className='px-4 py-3 text-sm text-gray-500'>No clients found</li>
              ) : (
                filteredClients.map((c) => (
                  <li
                    key={c._id}
                    onClick={() => handleClientSelect(c)}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-cyan-50 ${selectedClient?._id === c._id ? 'bg-cyan-100 font-medium' : ''}`}
                  >
                    {c.clientName}
                    {c.businessType && <span className='text-gray-500 ml-2'>({c.businessType})</span>}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </div>

      {!selectedClient ? (
        <div className='bg-white rounded-lg shadow p-12 text-center'>
          <p className='text-gray-500'>Select a client above to view or create their social media calendar.</p>
        </div>
      ) : loading ? (
        <p className='text-sm'>Loading calendar...</p>
      ) : error ? (
        <p className='text-red-600 text-sm'>{error}</p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Calendar Grid */}
          <div className='lg:col-span-2 bg-white rounded-lg shadow p-6'>
            <div className='flex flex-wrap justify-between items-center gap-4 mb-6'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>{selectedClient.clientName}</h2>
                <div className='flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden'>
                  <button
                    type='button'
                    onClick={goPrevMonth}
                    className='p-2 hover:bg-gray-100 text-gray-700'
                    title='Previous month'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                  </button>
                  <div className='flex items-center gap-2 px-3 py-1.5 min-w-[180px] justify-center'>
                    <select
                      value={calendarMonth}
                      onChange={(e) => setCalendarMonth(Number(e.target.value))}
                      className='border-0 bg-transparent text-sm font-semibold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer'
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                      ))}
                    </select>
                    <select
                      value={calendarYear}
                      onChange={(e) => setCalendarYear(Number(e.target.value))}
                      className='border-0 bg-transparent text-sm font-semibold text-gray-900 focus:ring-0 focus:outline-none cursor-pointer'
                    >
                      {[...Array(11)].map((_, i) => {
                        const y = calendarYear - 5 + i
                        return <option key={y} value={y}>{y}</option>
                      })}
                    </select>
                  </div>
                  <button
                    type='button'
                    onClick={goNextMonth}
                    className='p-2 hover:bg-gray-100 text-gray-700'
                    title='Next month'
                  >
                    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' /></svg>
                  </button>
                </div>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={handleDownloadXLS}
                  disabled={!calendar?.posts?.length}
                  className='px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                  title='Download as Excel'
                >
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' />
                  </svg>
                  Download XLS
                </button>
                {canManageSocialCalendar() && (
                  <button
                    onClick={() => setShowAddPost(true)}
                    className='bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium'
                  >
                    + New Post
                  </button>
                )}
              </div>
            </div>

            <div className='grid grid-cols-7 gap-2 mb-4'>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className='text-center font-bold text-gray-600 py-2 text-sm'>
                  {day}
                </div>
              ))}
            </div>

            <div className='grid grid-cols-7 gap-2'>
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className='aspect-square' />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dayPosts = getPostsForDay(day)
                const isEmpty = dayPosts.length === 0
                const isClickable = isEmpty && canManageSocialCalendar()
                return (
                  <div
                    key={day}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={() => isClickable && handleDayClick(day)}
                    onKeyDown={(e) => isClickable && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleDayClick(day))}
                    className={`aspect-square border rounded-lg p-2 flex flex-col border-gray-200 min-h-[80px] ${
                      isClickable
                        ? 'hover:border-cyan-400 hover:bg-cyan-50/50 cursor-pointer transition-colors'
                        : 'hover:border-cyan-300'
                    }`}
                  >
                    <span className='font-bold text-gray-900 text-sm'>{day}</span>
                    {dayPosts.length > 0 && (
                      <div className='mt-1 space-y-1 flex-1 overflow-y-auto overflow-x-hidden min-h-0'>
                        {dayPosts.map((p) => (
                          <div key={p._id} className='flex items-center gap-1'>
                            {canManageSocialCalendar() ? (
                              <button
                                type='button'
                                onClick={() => handleEditPost(p)}
                                className='flex-1 min-w-0 text-left text-xs px-2 py-1 rounded truncate bg-cyan-100 text-cyan-800 hover:bg-cyan-200 cursor-pointer'
                              >
                                {p.title}
                                {getAssignedNames(p.assignedTo) && <span className='block text-[10px] text-cyan-600 truncate'>→ {getAssignedNames(p.assignedTo)}</span>}
                              </button>
                            ) : (
                              <span className='flex-1 min-w-0 text-xs px-2 py-1 rounded truncate bg-cyan-100 text-cyan-800'>
                                {p.title}
                                {getAssignedNames(p.assignedTo) && <span className='block text-[10px] text-cyan-600 truncate'>→ {getAssignedNames(p.assignedTo)}</span>}
                              </span>
                            )}
                            {p.referenceLink && (
                              <a
                                href={p.referenceLink}
                                target='_blank'
                                rel='noopener noreferrer'
                                onClick={(e) => e.stopPropagation()}
                                className='flex-shrink-0 p-1 rounded text-cyan-600 hover:bg-cyan-200'
                                title='Open reference link'
                              >
                                <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                                </svg>
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Posts Sidebar */}
          <div className='bg-white rounded-lg shadow p-6'>
            <h2 className='text-lg font-bold text-gray-900 mb-4'>Upcoming Posts</h2>
            {posts.length === 0 ? (
              <p className='text-sm text-gray-500'>No scheduled posts yet.</p>
            ) : (
              <div className='space-y-3'>
                {posts
                  .filter((p) => p.scheduledTime)
                  .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
                  .slice(0, 10)
                  .map((p) => (
                    <div key={p._id} className='flex items-start gap-2 pb-3 border-b border-gray-100 last:border-0'>
                      {canManageSocialCalendar() ? (
                        <button
                          type='button'
                          onClick={() => handleEditPost(p)}
                          className='flex-1 min-w-0 text-left hover:bg-gray-50 -mx-2 px-2 rounded transition-colors'
                        >
                          <p className='text-sm font-semibold text-gray-900'>{p.title}</p>
                          <p className='text-xs text-gray-600'>
                            {new Date(p.scheduledTime).toLocaleDateString()} • {p.platform}
                            {getAssignedNames(p.assignedTo) && ` • ${getAssignedNames(p.assignedTo)}`}
                          </p>
                        </button>
                      ) : (
                        <div className='flex-1 min-w-0 -mx-2 px-2'>
                          <p className='text-sm font-semibold text-gray-900'>{p.title}</p>
                          <p className='text-xs text-gray-600'>
                            {new Date(p.scheduledTime).toLocaleDateString()} • {p.platform}
                            {getAssignedNames(p.assignedTo) && ` • ${getAssignedNames(p.assignedTo)}`}
                          </p>
                        </div>
                      )}
                      {p.referenceLink && (
                        <a
                          href={p.referenceLink}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex-shrink-0 p-1.5 rounded text-cyan-600 hover:bg-cyan-50'
                          title='Open reference link'
                        >
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Post Modal - only for users who can manage */}
      {canManageSocialCalendar() && ((showAddPost || editingPost) && selectedClient) && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'>
            <h3 className='text-lg font-bold text-gray-900 mb-4'>
              {editingPost ? 'Edit Post' : 'Add Social Media Post'}
            </h3>
            <form onSubmit={editingPost ? handleUpdatePost : handleAddPost} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Title</label>
                  <input
                    type='text'
                    value={postForm.title}
                    onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                    placeholder='Post title'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Platform</label>
                  <select
                    value={postForm.platform}
                    onChange={(e) => setPostForm((f) => ({ ...f, platform: e.target.value }))}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
                <textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  placeholder='Post content...'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Scheduled Date & Time</label>
                  <input
                    type='datetime-local'
                    value={postForm.scheduledTime}
                    onChange={(e) => setPostForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Status</label>
                  <select
                    value={postForm.status}
                    onChange={(e) => setPostForm((f) => ({ ...f, status: e.target.value }))}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  >
                    <option value='Scheduled'>Scheduled</option>
                    <option value='Published'>Published</option>
                    <option value='Draft'>Draft</option>
                    <option value='Cancelled'>Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Reference Link <span className='text-gray-400 font-normal'>(optional)</span></label>
                <input
                  type='url'
                  value={postForm.referenceLink}
                  onChange={(e) => setPostForm((f) => ({ ...f, referenceLink: e.target.value }))}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  placeholder='https://...'
                />
              </div>
              <div ref={assigneeRef}>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Assign To <span className='text-gray-400 font-normal'>(optional, multiple)</span></label>
                <div className='relative'>
                  <input
                    type='text'
                    value={assigneeSearch}
                    onChange={(e) => {
                      setAssigneeSearch(e.target.value)
                      setAssigneeOpen(true)
                    }}
                    onFocus={() => setAssigneeOpen(true)}
                    placeholder='Search employees...'
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm pr-9'
                  />
                  <span className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none'>
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' />
                    </svg>
                  </span>
                  {assigneeOpen && (
                    <div className='absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto'>
                      {filteredEmployees.length === 0 ? (
                        <p className='px-3 py-3 text-sm text-gray-500'>No employees found</p>
                      ) : (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp._id}
                            type='button'
                            onClick={() => {
                              toggleAssignedEmployee(emp._id)
                              setAssigneeSearch('')
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${postForm.assignedTo.includes(emp._id) ? 'bg-cyan-50 text-cyan-800' : ''}`}
                          >
                            {postForm.assignedTo.includes(emp._id) && (
                              <svg className='w-4 h-4 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                                <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                              </svg>
                            )}
                            <span>{emp.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {postForm.assignedTo.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 mt-2'>
                    {postForm.assignedTo.map((id) => {
                      const emp = employees.find((e) => e._id === id)
                      return emp ? (
                        <span
                          key={id}
                          className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-xs'
                        >
                          {emp.name}
                          <button
                            type='button'
                            onClick={() => toggleAssignedEmployee(id)}
                            className='hover:text-cyan-600'
                            aria-label='Remove'
                          >
                            ×
                          </button>
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className='flex gap-3 pt-2'>
                <button
                  type='submit'
                  className='flex-1 bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-lg text-sm font-medium'
                >
                  {editingPost ? 'Update Post' : 'Add Post'}
                </button>
                <button
                  type='button'
                  onClick={closePostModal}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SocialCalendarView
