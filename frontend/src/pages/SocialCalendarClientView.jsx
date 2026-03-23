import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api/axios'

const REVIEW_BADGE = {
  Pending: 'bg-amber-100 text-amber-800',
  Accepted: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  'Need Changes': 'bg-purple-100 text-purple-800',
}

const SocialCalendarClientView = () => {
  const { token } = useParams()
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTabByPost, setActiveTabByPost] = useState({})
  const [noteDraftByPost, setNoteDraftByPost] = useState({})
  const [savingByPost, setSavingByPost] = useState({})

  const fetchCalendar = async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await api.get(`/social-calendars/shared/${token}`)
      const data = res.data
      setCalendar(data)
      const noteSeed = {}
      ;(data.posts || []).forEach((p) => {
        noteSeed[p._id] = p.clientNote || ''
      })
      setNoteDraftByPost(noteSeed)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load calendar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const sortedPosts = useMemo(
    () => [...(calendar?.posts || [])].sort((a, b) => new Date(a.scheduledTime || 0) - new Date(b.scheduledTime || 0)),
    [calendar?.posts]
  )

  const updateReview = async (postId, action, onlyNote = false) => {
    const note = noteDraftByPost[postId] || ''
    setSavingByPost((s) => ({ ...s, [postId]: true }))
    try {
      const payload = onlyNote ? { clientNote: note } : { action, clientNote: note }
      await api.put(`/social-calendars/shared/${token}/posts/${postId}/review`, payload)
      await fetchCalendar()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update review')
    } finally {
      setSavingByPost((s) => ({ ...s, [postId]: false }))
    }
  }

  const renderDescription = (post) => {
    if (post.contentType === 'Carousel' && Array.isArray(post.carouselItems) && post.carouselItems.length > 0) {
      return (
        <div className='space-y-2'>
          {post.carouselItems.map((item, idx) => (
            <div key={idx} className='border border-gray-200 rounded-lg p-3'>
              <p className='text-xs text-gray-500'>Post {idx + 1}</p>
              <p className='text-sm font-semibold text-gray-900'>{item.subject || '—'}</p>
              <p className='text-sm text-gray-700 whitespace-pre-wrap'>{item.description || '—'}</p>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div>
        {post.subject && <p className='text-sm font-semibold text-gray-900'>{post.subject}</p>}
        <p className='text-sm text-gray-700 whitespace-pre-wrap'>{post.description || '—'}</p>
      </div>
    )
  }

  if (loading) return <div className='p-6 text-sm text-gray-600'>Loading shared calendar...</div>
  if (error) return <div className='p-6 text-sm text-red-600'>{error}</div>
  if (!calendar) return <div className='p-6 text-sm text-gray-600'>Calendar not found.</div>

  return (
    <div className='min-h-screen bg-gray-50 p-4 md:p-6'>
      <div className='max-w-5xl mx-auto'>
        <div className='mb-5'>
          <h1 className='text-2xl font-bold text-gray-900'>Client Social Media Review</h1>
          <p className='text-sm text-gray-600 mt-1'>
            Client: <span className='font-medium'>{calendar.client?.clientName || '—'}</span>
          </p>
        </div>

        <div className='space-y-4'>
          {sortedPosts.length === 0 ? (
            <div className='bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600'>
              No social posts available.
            </div>
          ) : (
            sortedPosts.map((post) => {
              const activeTab = activeTabByPost[post._id] || 'reference'
              const noteDraft = noteDraftByPost[post._id] || ''
              return (
                <div key={post._id} className='bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
                  <div className='flex flex-wrap items-start justify-between gap-3 mb-3'>
                    <div>
                      <p className='text-base font-semibold text-gray-900'>{post.title}</p>
                      <p className='text-xs text-gray-600 mt-0.5'>
                        {post.platform} • {post.contentType || 'Post'} • {post.scheduledTime ? new Date(post.scheduledTime).toLocaleString() : 'No schedule'}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${REVIEW_BADGE[post.clientReviewStatus || 'Pending'] || REVIEW_BADGE.Pending}`}>
                      {post.clientReviewStatus || 'Pending'}
                    </span>
                  </div>

                  <div className='flex flex-wrap gap-2 mb-3'>
                    <button type='button' onClick={() => setActiveTabByPost((s) => ({ ...s, [post._id]: 'reference' }))} className={`px-3 py-1.5 rounded text-xs font-medium border ${activeTab === 'reference' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>Reference</button>
                    <button type='button' onClick={() => setActiveTabByPost((s) => ({ ...s, [post._id]: 'description' }))} className={`px-3 py-1.5 rounded text-xs font-medium border ${activeTab === 'description' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>Description of Post</button>
                    <button type='button' onClick={() => setActiveTabByPost((s) => ({ ...s, [post._id]: 'note' }))} className={`px-3 py-1.5 rounded text-xs font-medium border ${activeTab === 'note' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-300 text-gray-700'}`}>Add Note</button>
                  </div>

                  <div className='border border-gray-100 rounded-lg p-3 bg-gray-50 mb-3'>
                    {activeTab === 'reference' && (
                      <div>
                        {post.referenceLink ? (
                          <a href={post.referenceLink} target='_blank' rel='noopener noreferrer' className='text-sm text-indigo-600 hover:underline break-all'>
                            {post.referenceLink}
                          </a>
                        ) : post.referenceUpload?.dataUrl ? (
                          <a href={post.referenceUpload.dataUrl} target='_blank' rel='noopener noreferrer' className='text-sm text-indigo-600 hover:underline break-all'>
                            {post.referenceUpload.fileName || 'Open uploaded reference'}
                          </a>
                        ) : (
                          <p className='text-sm text-gray-500'>No reference shared.</p>
                        )}
                      </div>
                    )}
                    {activeTab === 'description' && renderDescription(post)}
                    {activeTab === 'note' && (
                      <div>
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraftByPost((s) => ({ ...s, [post._id]: e.target.value }))}
                          rows={3}
                          className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                          placeholder='Add note for changes or feedback...'
                        />
                        <button
                          type='button'
                          onClick={() => updateReview(post._id, undefined, true)}
                          disabled={!!savingByPost[post._id]}
                          className='mt-2 px-3 py-1.5 rounded border border-indigo-600 text-indigo-700 text-xs font-medium hover:bg-indigo-50 disabled:opacity-50'
                        >
                          {savingByPost[post._id] ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className='flex flex-wrap gap-2 mb-3'>
                    <button type='button' onClick={() => updateReview(post._id, 'accept')} disabled={!!savingByPost[post._id]} className='px-3 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'>Accept</button>
                    <button type='button' onClick={() => updateReview(post._id, 'reject')} disabled={!!savingByPost[post._id]} className='px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50'>Reject</button>
                    <button type='button' onClick={() => updateReview(post._id, 'need_changes')} disabled={!!savingByPost[post._id]} className='px-3 py-1.5 rounded text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'>Need Changes</button>
                  </div>

                  {Array.isArray(post.uploadedLinks) && post.uploadedLinks.length > 0 && (
                    <div className='border-t border-gray-100 pt-3'>
                      <p className='text-sm font-semibold text-gray-800'>Post is uploaded</p>
                      <div className='mt-2 space-y-1'>
                        {post.uploadedLinks.map((link, idx) => (
                          <div key={`${link.url}-${idx}`} className='text-sm'>
                            <span className='text-gray-500'>{link.platform || 'Platform'}: </span>
                            <a href={link.url} target='_blank' rel='noopener noreferrer' className='text-indigo-600 hover:underline break-all'>
                              {link.url}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default SocialCalendarClientView
