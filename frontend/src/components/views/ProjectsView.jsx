import React, { useEffect, useMemo, useState } from 'react'
import api from '../../api/axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { EditIcon, DeleteIcon } from '../Icons'
import { ProjectDetailModal } from '../ProjectDetailModal'

const ITEMS_PER_PAGE = 10
const STATUS_OPTIONS = ['All', 'Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Urgent']
const DEPARTMENT_OPTIONS = ['All', 'IT', 'Marketing']

const ProjectsView = () => {
  const { canAddProject, canAssignTask } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = (searchParams.get('focus') || '').trim()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterDepartment, setFilterDepartment] = useState('All')
  const [filterSearch, setFilterSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [detailProject, setDetailProject] = useState(null)
  const navigate = useNavigate()
  const detailParam = (searchParams.get('detail') || '').trim()

  const replaceSearchWithoutDetail = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('detail')
        return next
      },
      { replace: true },
    )
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await api.get('/projects')
      const payload = res.data
      const list = Array.isArray(payload) ? payload : payload?.data || payload?.projects || []
      setProjects(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.message || 'Error fetching projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    try {
      await api.delete(`/projects/${projectId}`)
      fetchProjects()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error deleting project')
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800'
      case 'High': return 'bg-orange-100 text-orange-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'On Hold': return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const inProgress = projects.filter((p) => p.status === 'In Progress').length
  const completed = projects.filter((p) => p.status === 'Completed').length
  const onHold = projects.filter((p) => p.status === 'On Hold').length

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const isFocused = focusId && String(p._id) === focusId
      if (!isFocused) {
        if (filterStatus !== 'All' && p.status !== filterStatus) return false
        if (filterPriority !== 'All' && p.priority !== filterPriority) return false
        if (filterDepartment !== 'All' && (p.department || 'IT') !== filterDepartment) return false
        if (filterSearch.trim()) {
          const search = filterSearch.toLowerCase().trim()
          const name = (p.projectName || '').toLowerCase()
          const clientName = (p.client?.clientName || '').toLowerCase()
          const pmName = (p.projectManager?.name || '').toLowerCase()
          if (!name.includes(search) && !clientName.includes(search) && !pmName.includes(search)) return false
        }
      }
      return true
    })
  }, [projects, focusId, filterStatus, filterPriority, filterDepartment, filterSearch])

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPriority, filterDepartment, filterSearch])

  useEffect(() => {
    if (!focusId || loading) return
    const idx = filteredProjects.findIndex((p) => String(p._id) === focusId)
    if (idx < 0) return
    const page = Math.floor(idx / ITEMS_PER_PAGE) + 1
    setCurrentPage((prev) => (prev === page ? prev : page))
  }, [focusId, loading, filteredProjects])

  useEffect(() => {
    if (!focusId || loading) return
    const t = window.setTimeout(() => {
      document.getElementById(`project-focus-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [focusId, loading, currentPage, filteredProjects.length])

  useEffect(() => {
    if (!detailParam || loading) return
    const match = projects.find((p) => String(p._id) === detailParam)
    if (match) {
      setDetailProject(match)
      replaceSearchWithoutDetail()
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get(`/projects/${detailParam}`)
        if (!cancelled && res.data) setDetailProject(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Could not load project')
      } finally {
        if (!cancelled) replaceSearchWithoutDetail()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detailParam, loading, projects, navigate])

  return (
    <div className='p-8 flex flex-col items-center justify-center'>
      <div className='w-full max-w-6xl'>
        <div className='mb-8 flex justify-between items-center'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Projects</h1>
            <p className='text-gray-600 mt-1 text-sm'>Track project progress and deliverables.</p>
          </div>
          {canAddProject() && (
            <button
              onClick={() => navigate('/add-project')}
              className='bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm'
            >
              + New Project
            </button>
          )}
        </div>

        {loading ? (
          <p className='text-sm text-center'>Loading...</p>
        ) : error ? (
          <p className='text-red-600 text-sm text-center'>{error}</p>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-orange-500'>
                <p className='text-gray-600 text-sm font-medium'>Total Projects</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2 text-sm'>{projects.length}</h3>
                <p className='text-xs text-gray-600 mt-2'>{inProgress} in progress, {onHold} on hold</p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500'>
                <p className='text-gray-600 text-sm font-medium'>Completed</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2 text-sm'>{completed}</h3>
                <p className='text-xs text-green-600 mt-2'>
                  {projects.length ? Math.round((completed / projects.length) * 100) : 0}% completion rate
                </p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500'>
                <p className='text-gray-600 text-sm font-medium'>In Progress</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2 text-sm'>{inProgress}</h3>
                <p className='text-xs text-blue-600 mt-2'>Active projects</p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500'>
                <p className='text-gray-600 text-sm font-medium'>On Hold</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2 text-sm'>{onHold}</h3>
                <p className='text-xs text-red-600 mt-2'>May need attention</p>
              </div>
            </div>

            <div className='mb-6 flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium text-gray-700'>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s === 'All' ? 'All status' : s}</option>
                  ))}
                </select>
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium text-gray-700'>Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className='flex items-center gap-2'>
                <label className='text-sm font-medium text-gray-700'>Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className='flex items-center gap-2 flex-1 min-w-[200px]'>
                <label className='text-sm font-medium text-gray-700'>Search</label>
                <input
                  type='text'
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder='Project, client, or PM...'
                  className='border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-6'>
              {filteredProjects.length === 0 ? (
                <div className='bg-white rounded-lg shadow-md p-12 text-center'>
                  <p className='text-sm text-gray-600'>
                    {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
                  </p>
                  {canAddProject() && (
                    <button
                      onClick={() => navigate('/add-project')}
                      className='mt-4 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium'
                    >
                      Add New Project
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <p className='text-sm text-gray-600 mb-2'>
                    Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} project(s)
                  </p>
                  {paginatedProjects.map((project) => (
                  <div
                    key={project._id}
                    id={`project-focus-${project._id}`}
                    role='button'
                    tabIndex={0}
                    aria-label={`Open details for ${project.projectName || 'project'}`}
                    onClick={() => setDetailProject(project)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDetailProject(project)
                      }
                    }}
                    className={`bg-white rounded-lg shadow-md p-6 transition-shadow cursor-pointer hover:shadow-lg ${
                      focusId && String(project._id) === focusId
                        ? 'ring-2 ring-orange-500 ring-offset-2 shadow-lg'
                        : ''
                    }`}
                  >
                    <div className='flex justify-between items-start gap-3 mb-4 flex-wrap'>
                      <div className='flex-1 min-w-0'>
                        <h3 className='text-base font-bold text-gray-900 text-sm'>{project.projectName}</h3>
                        <p className='text-sm text-gray-600'>
                          {project.client?.clientName || '—'} • {project.projectManager?.name ? `PM: ${project.projectManager.name}` : '—'}
                           • {project.department || 'IT'}
                        </p>
                      </div>
                      <div className='flex flex-wrap items-center gap-2 justify-end' onClick={(e) => e.stopPropagation()}>
                        <button
                          type='button'
                          onClick={() => navigate(`/projects/${project._id}/dashboard`)}
                          className='shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors'
                        >
                          Dashboard
                        </button>
                        {canAssignTask() && (
                          <button
                            type='button'
                            onClick={() => navigate(`/assign-task?projectId=${project._id}`)}
                            className='shrink-0 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-colors'
                          >
                            + Assign Task
                          </button>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(project.priority)}`}>
                          {project.priority}
                        </span>
                        <div className='flex gap-1 ml-2'>
                          {canAddProject() && (
                            <>
                              <button
                                type='button'
                                onClick={() => navigate(`/projects/edit/${project._id}`)}
                                className='p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors'
                                title='Edit'
                              >
                                <EditIcon />
                              </button>
                              <button
                                type='button'
                                onClick={() => handleDelete(project._id)}
                                className='p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors'
                                title='Delete'
                              >
                                <DeleteIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200'>
                      <div>
                        <p className='text-xs text-gray-600'>Department</p>
                        <p className='text-sm font-bold text-gray-900'>{project.department || 'IT'}</p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-600'>Due Date</p>
                        <p className='text-sm font-bold text-gray-900'>
                          {project.deadline || project.endDate
                            ? new Date(project.deadline || project.endDate).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-600'>Budget</p>
                        <p className='text-sm font-bold text-gray-900'>
                          {project.budget != null ? `₹${Number(project.budget).toLocaleString('en-IN')}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs text-gray-600'>Progress</p>
                        <p className='text-sm font-bold text-gray-900'>{project.progress ?? 0}%</p>
                      </div>
                    </div>

                    <div>
                      <div className='flex justify-between mb-1'>
                        <span className='text-xs font-semibold text-gray-700'>Overall Progress</span>
                        <span className='text-xs font-bold text-gray-900'>{project.progress ?? 0}%</span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-3'>
                        <div
                          className={`h-3 rounded-full transition-all ${
                            project.status === 'Completed' ? 'bg-green-500' :
                            project.status === 'In Progress' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}
                          style={{ width: `${project.progress ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  ))}

                  {totalPages > 1 && (
                    <div className='flex items-center justify-center gap-2 mt-8'>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className='px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Previous
                      </button>
                      <div className='flex gap-1'>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium ${
                              currentPage === page
                                ? 'bg-orange-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className='px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <ProjectDetailModal project={detailProject} onClose={() => setDetailProject(null)} />
    </div>
  )
}

export default ProjectsView
