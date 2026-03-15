import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const LEAVE_TYPES = ['Sick', 'Casual', 'Annual', 'Unpaid', 'Other']

const LeaveView = () => {
  const { user, canApproveLeave } = useAuth()
  const isApprover = canApproveLeave()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [applyForm, setApplyForm] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [viewLeave, setViewLeave] = useState(null)

  const fetchLeaves = async () => {
    try {
      setLoading(true)
      const params = {}
      if (!isApprover && user?._id) params.employeeId = user._id
      else if (filterStatus) params.status = filterStatus
      const res = await api.get('/leave', { params })
      setLeaves(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err.message || 'Error fetching leaves')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaves()
  }, [isApprover, user?._id, filterStatus])

  const handleApplySubmit = async (e) => {
    e.preventDefault()
    if (!applyForm.startDate || !applyForm.endDate) {
      setError('Start date and end date are required')
      return
    }
    if (new Date(applyForm.endDate) < new Date(applyForm.startDate)) {
      setError('End date must be on or after start date')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/leave', {
        employee: user._id,
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason || '',
      })
      setShowApplyForm(false)
      setApplyForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' })
      fetchLeaves()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error submitting leave')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.patch(`/leave/${id}/status`, { status: 'Approved', approvedBy: user._id })
      fetchLeaves()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error approving leave')
    }
  }

  const handleReject = async (id) => {
    if (rejectingId !== id) {
      setRejectingId(id)
      setRejectReason('')
      return
    }
    try {
      await api.patch(`/leave/${id}/status`, {
        status: 'Rejected',
        approvedBy: user._id,
        rejectionReason: rejectReason || '',
      })
      setRejectingId(null)
      setRejectReason('')
      fetchLeaves()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error rejecting leave')
    }
  }

  const displayLeaves = isApprover ? leaves : leaves

  const getStatusBadge = (status) => {
    const classes = {
      Pending: 'bg-amber-100 text-amber-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status] || ''}`}>
        {status}
      </span>
    )
  }

  return (
    <div className='p-4 md:p-5'>
      <div className='flex flex-wrap items-center justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Leave</h1>
          <p className='text-gray-600 text-sm mt-1'>
            {isApprover ? 'View and approve leave applications.' : 'Apply for leave and view your applications.'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          {isApprover && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            >
              <option value=''>All statuses</option>
              <option value='Pending'>Pending</option>
              <option value='Approved'>Approved</option>
              <option value='Rejected'>Rejected</option>
            </select>
          )}
          <button
            onClick={() => setShowApplyForm(true)}
            className='bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700'
          >
            Apply for Leave
          </button>
        </div>
      </div>

      {error && (
        <div className='mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2'>
          <p className='text-red-600 text-sm'>{error}</p>
        </div>
      )}

      {viewLeave && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50' role='dialog' aria-modal='true' aria-labelledby='leave-detail-title'>
          <div className='bg-white rounded-xl shadow-xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto'>
            <h2 id='leave-detail-title' className='text-lg font-semibold text-gray-900 mb-4'>Leave Details</h2>
            <div className='space-y-3 text-sm'>
              {isApprover && (
                <div>
                  <span className='font-medium text-gray-500 block'>Employee</span>
                  <p className='text-gray-900'>{viewLeave.employee?.name || '—'}</p>
                </div>
              )}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <span className='font-medium text-gray-500 block'>Type</span>
                  <p className='text-gray-900'>{viewLeave.leaveType || '—'}</p>
                </div>
                <div>
                  <span className='font-medium text-gray-500 block'>Status</span>
                  <p>{getStatusBadge(viewLeave.status)}</p>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <span className='font-medium text-gray-500 block'>Start Date</span>
                  <p className='text-gray-900'>{viewLeave.startDate ? new Date(viewLeave.startDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <span className='font-medium text-gray-500 block'>End Date</span>
                  <p className='text-gray-900'>{viewLeave.endDate ? new Date(viewLeave.endDate).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <div>
                <span className='font-medium text-gray-500 block'>Number of days</span>
                <p className='text-gray-900'>{viewLeave.numberOfDays ?? '—'}</p>
              </div>
              <div>
                <span className='font-medium text-gray-500 block'>Reason / Message</span>
                <p className='text-gray-900 mt-1 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 min-h-[60px]'>{viewLeave.reason || '—'}</p>
              </div>
              {viewLeave.status !== 'Pending' && viewLeave.approvedBy && (
                <>
                  <div>
                    <span className='font-medium text-gray-500 block'>Approved / Rejected by</span>
                    <p className='text-gray-900'>{viewLeave.approvedBy?.name || '—'}</p>
                  </div>
                  {viewLeave.approvedAt && (
                    <div>
                      <span className='font-medium text-gray-500 block'>Date</span>
                      <p className='text-gray-900'>{new Date(viewLeave.approvedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {viewLeave.status === 'Rejected' && viewLeave.rejectionReason && (
                    <div>
                      <span className='font-medium text-gray-500 block'>Rejection reason</span>
                      <p className='text-gray-900 mt-1 whitespace-pre-wrap break-words bg-red-50 rounded-lg p-3 text-red-800'>{viewLeave.rejectionReason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className='mt-5 pt-4 border-t border-gray-200'>
              <button
                type='button'
                onClick={() => setViewLeave(null)}
                className='w-full py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showApplyForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50' role='dialog' aria-modal='true'>
          <div className='bg-white rounded-xl shadow-xl max-w-md w-full p-5'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>Apply for Leave</h2>
            <form onSubmit={handleApplySubmit} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Leave Type</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm((f) => ({ ...f, leaveType: e.target.value }))}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>Start Date</label>
                  <input
                    type='date'
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>End Date</label>
                  <input
                    type='date'
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm((f) => ({ ...f, endDate: e.target.value }))}
                    required
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>Reason (optional)</label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  placeholder='Brief reason for leave'
                />
              </div>
              <div className='flex gap-2 pt-2'>
                <button
                  type='submit'
                  disabled={submitting}
                  className='flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50'
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
                <button
                  type='button'
                  onClick={() => { setShowApplyForm(false); setError(null) }}
                  className='flex-1 border border-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className='text-sm text-gray-600'>Loading...</p>
      ) : (
        <div className='bg-white rounded-xl shadow border border-gray-200 overflow-x-auto'>
          <div className='px-4 py-3 border-b border-gray-100'>
            <h2 className='text-lg font-semibold text-gray-800'>
              {isApprover ? 'All Leave Applications' : 'My Leave Applications'}
            </h2>
          </div>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='text-left border-b bg-gray-50'>
                {isApprover && <th className='px-4 py-3 font-semibold text-gray-700'>Employee</th>}
                <th className='px-4 py-3 font-semibold text-gray-700'>Type</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Start Date</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>End Date</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Days</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Reason</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Status</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>View</th>
                {isApprover && <th className='px-4 py-3 font-semibold text-gray-700'>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayLeaves.length === 0 ? (
                <tr>
                  <td colSpan={isApprover ? 9 : 7} className='px-4 py-10 text-center text-gray-500'>
                    No leave applications found.
                  </td>
                </tr>
              ) : (
                displayLeaves.map((leave) => (
                  <tr key={leave._id} className='border-b hover:bg-gray-50'>
                    {isApprover && (
                      <td className='px-4 py-3 font-medium'>{leave.employee?.name || '—'}</td>
                    )}
                    <td className='px-4 py-3'>{leave.leaveType || '—'}</td>
                    <td className='px-4 py-3'>{leave.startDate ? new Date(leave.startDate).toLocaleDateString() : '—'}</td>
                    <td className='px-4 py-3'>{leave.endDate ? new Date(leave.endDate).toLocaleDateString() : '—'}</td>
                    <td className='px-4 py-3'>{leave.numberOfDays ?? '—'}</td>
                    <td
                      className='px-4 py-3 max-w-[180px] truncate cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded transition-colors'
                      title='Click to view full details in popup'
                      onClick={() => setViewLeave(leave)}
                      role='button'
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewLeave(leave) } }}
                    >
                      {leave.reason || '—'}
                    </td>
                    <td className='px-4 py-3'>{getStatusBadge(leave.status)}</td>
                    <td className='px-4 py-3'>
                      <button
                        type='button'
                        onClick={() => setViewLeave(leave)}
                        className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 text-sm font-medium transition-colors'
                        title='View full details in popup'
                      >
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                        </svg>
                        View
                      </button>
                    </td>
                    {isApprover && (
                      <td className='px-4 py-3'>
                        {leave.status === 'Pending' ? (
                          <div className='flex flex-wrap items-center gap-2'>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className='px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700'
                            >
                              Approve
                            </button>
                            {rejectingId === leave._id ? (
                              <>
                                <input
                                  type='text'
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder='Rejection reason (optional)'
                                  className='border border-gray-300 rounded px-2 py-1 text-xs w-36'
                                />
                                <button
                                  onClick={() => handleReject(leave._id)}
                                  className='px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700'
                                >
                                  Confirm Reject
                                </button>
                                <button
                                  onClick={() => { setRejectingId(null); setRejectReason('') }}
                                  className='text-xs text-gray-500 hover:text-gray-700'
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleReject(leave._id)}
                                className='px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700'
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          leave.approvedBy && (
                            <span className='text-xs text-gray-500'>
                              By {leave.approvedBy?.name || '—'}
                              {leave.rejectionReason && `: ${leave.rejectionReason}`}
                            </span>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LeaveView
