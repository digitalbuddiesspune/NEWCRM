import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent']

const AssignTask = () => {
  const { user, canAssignTask } = useAuth()
  const [searchParams] = useSearchParams()
  const projectIdFromUrl = searchParams.get('projectId')
  const navigate = useNavigate()

  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    project: projectIdFromUrl || '',
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects')
        const list = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.projects || []
        setProjects(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employees')
        const list = Array.isArray(res.data) ? res.data : res.data?.data || []
        setEmployees(Array.isArray(list) ? list : [])
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      }
    }
    fetchProjects()
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (projectIdFromUrl) setForm((f) => ({ ...f, project: projectIdFromUrl }))
  }, [projectIdFromUrl])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?._id) {
      setError('You must be logged in to assign tasks')
      return
    }
    if (!form.project || !form.title || !form.assignedTo) {
      setError('Project, title, and assignee are required')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/tasks', {
        project: form.project,
        title: form.title,
        description: form.description || undefined,
        assignedTo: form.assignedTo,
        assignedBy: user._id,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      })
      navigate(projectIdFromUrl ? '/projects' : '/tasks')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error assigning task')
    } finally {
      setLoading(false)
    }
  }

  if (!canAssignTask()) {
    return (
      <div className='p-8'>
        <p className='text-red-600'>You do not have permission to assign tasks.</p>
        <button onClick={() => navigate(-1)} className='mt-4 text-blue-600 hover:underline'>
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className='p-8 max-w-2xl'>
      <div className='mb-8'>
        <h1 className='text-2xl font-bold text-gray-900'>Assign Task</h1>
        <p className='text-gray-600 mt-1 text-sm'>Assign a task to an employee for a project.</p>
      </div>

      <form onSubmit={handleSubmit} className='bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Project *</label>
          <select
            value={form.project}
            onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
            required
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>Select project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName} {p.client?.clientName ? `(${p.client.clientName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Task Title *</label>
          <input
            type='text'
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder='Enter task title'
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder='Task description...'
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>Assign To *</label>
          <select
            value={form.assignedTo}
            onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            required
            className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>Select employee</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.name} {emp.designation?.title ? `(${emp.designation.title})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Due Date</label>
            <input
              type='date'
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        {error && <p className='text-red-600 text-sm'>{error}</p>}

        <div className='flex gap-3 pt-2'>
          <button
            type='submit'
            disabled={loading}
            className='bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? 'Assigning...' : 'Assign Task'}
          </button>
          <button
            type='button'
            onClick={() => navigate(-1)}
            className='px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50'
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default AssignTask
