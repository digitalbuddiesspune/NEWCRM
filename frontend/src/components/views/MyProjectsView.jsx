import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const STATUS_OPTIONS = ['All', 'Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const PRIORITY_OPTIONS = ['All', 'Low', 'Medium', 'High', 'Urgent']
const ITEMS_PER_PAGE = 10

const MyProjectsView = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchProjects = async () => {
    if (!user?._id) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await api.get('/projects/my-projects', { params: { employeeId: user._id } })
      const list = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.projects || []
      setProjects(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [user?._id])

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

  const getRole = (project) => {
    const isPM = project.projectManager?._id === user?._id || project.projectManager === user?._id
    return isPM ? 'Project Manager' : 'Team Member'
  }

  const inProgress = projects.filter((p) => p.status === 'In Progress').length
  const completed = projects.filter((p) => p.status === 'Completed').length
  const onHold = projects.filter((p) => p.status === 'On Hold').length

  const filteredProjects = projects.filter((p) => {
    if (filterStatus !== 'All' && p.status !== filterStatus) return false
    if (filterPriority !== 'All' && p.priority !== filterPriority) return false
    return true
  })

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, filterPriority])

  return (
    <div className='p-8 flex flex-col items-center justify-center'>
      <div className='w-full max-w-6xl'>
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900'>My Projects</h1>
          <p className='text-gray-600 mt-1 text-sm'>Projects where you are assigned as project manager or team member.</p>
        </div>

        {loading ? (
          <p className='text-sm text-center'>Loading...</p>
        ) : error ? (
          <p className='text-red-600 text-sm text-center'>{error}</p>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-orange-500'>
                <p className='text-gray-600 text-sm font-medium'>Total Assigned</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2'>{projects.length}</h3>
                <p className='text-xs text-gray-600 mt-2'>{inProgress} in progress, {onHold} on hold</p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500'>
                <p className='text-gray-600 text-sm font-medium'>Completed</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2'>{completed}</h3>
                <p className='text-xs text-green-600 mt-2'>
                  {projects.length ? Math.round((completed / projects.length) * 100) : 0}% completion rate
                </p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500'>
                <p className='text-gray-600 text-sm font-medium'>In Progress</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2'>{inProgress}</h3>
                <p className='text-xs text-blue-600 mt-2'>Active projects</p>
              </div>
              <div className='bg-white rounded-lg shadow-md p-6 border-t-4 border-red-500'>
                <p className='text-gray-600 text-sm font-medium'>On Hold</p>
                <h3 className='text-2xl font-bold text-gray-900 mt-2'>{onHold}</h3>
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
                    <option key={s} value={s}>{s}</option>
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
            </div>

            <div className='grid grid-cols-1 gap-6'>
              {filteredProjects.length === 0 ? (
                <div className='bg-white rounded-lg shadow-md p-12 text-center'>
                  <p className='text-sm text-gray-600'>
                    {projects.length === 0 ? 'You are not assigned to any projects yet' : 'No projects match your filters'}
                  </p>
                </div>
              ) : (
                <>
                  <p className='text-sm text-gray-600 mb-2'>
                    Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredProjects.length)} of {filteredProjects.length} project(s)
                  </p>
                  {paginatedProjects.map((project) => (
                    <div key={project._id} className='bg-white rounded-lg shadow-md p-6'>
                      <div className='flex justify-between items-start mb-4'>
                        <div className='flex-1'>
                          <h3 className='text-base font-bold text-gray-900'>{project.projectName}</h3>
                          <p className='text-sm text-gray-600'>
                            {project.client?.clientName || '—'} • {project.projectManager?.name ? `PM: ${project.projectManager.name}` : '—'}
                            • {project.department || 'IT'}
                          </p>
                          <span className='inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 text-cyan-800'>
                            Your role: {getRole(project)}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(project.priority)}`}>
                            {project.priority}
                          </span>
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

                      {project.description && (
                        <p className='text-sm text-gray-600 mb-4'>{project.description}</p>
                      )}

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
    </div>
  )
}

export default MyProjectsView
