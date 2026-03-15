import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useNavigate } from 'react-router-dom'
import { EditIcon, DeleteIcon } from '../Icons'

const ClientsView = () => {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await api.get('/clients')
      const payload = res.data
      let list = []
      if (Array.isArray(payload)) {
        list = payload
      } else if (payload && Array.isArray(payload.data)) {
        list = payload.data
      } else if (payload && payload.clients && Array.isArray(payload.clients)) {
        list = payload.clients
      } else {
        list = payload && typeof payload === 'object' ? [payload] : []
      }
      setClients(list)
    } catch (err) {
      setError(err.message || 'Error fetching clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return
    try {
      await api.delete(`/clients/${id}`)
      fetchClients()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error deleting client')
    }
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Clients</h1>
          <p className='text-gray-600 mt-1 text-sm'>Manage all your clients and accounts.</p>
        </div>
        <div>
          <button
            onClick={() => navigate('/add-client')}
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm'
          >
            Add Client
          </button>
        </div>
      </div>

      {loading ? (
        <p className='text-sm'>Loading...</p>
      ) : error ? (
        <p className='text-red-600 text-sm'>{error}</p>
      ) : (
        <div className='bg-white rounded-lg shadow overflow-x-auto'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='text-left border-b'>
                <th className='px-4 py-3'>Client Name</th>
                <th className='px-4 py-3'>Client Number</th>
                <th className='px-4 py-3'>Mail ID</th>
                <th className='px-4 py-3'>Business Type</th>
                <th className='px-4 py-3'>Services</th>
                <th className='px-4 py-3'>Date</th>
                <th className='px-4 py-3'>Type</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>Onboard By</th>
                <th className='px-4 py-3'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c._id} className='border-b hover:bg-gray-50'>
                  <td className='px-4 py-3 font-medium'>{c.clientName}</td>
                  <td className='px-4 py-3'>{c.clientNumber}</td>
                  <td className='px-4 py-3'>{c.mailId}</td>
                  <td className='px-4 py-3'>{c.businessType}</td>
                  <td className='px-4 py-3'>{Array.isArray(c.services) ? c.services.join(', ') : '—'}</td>
                  <td className='px-4 py-3'>{c.date ? new Date(c.date).toLocaleDateString() : '—'}</td>
                  <td className='px-4 py-3'>{c.clientType || '—'}</td>
                  <td className='px-4 py-3'>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(c.status || 'Active') === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {c.status || 'Active'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>{c.onboardBy?.name || '—'}</td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => navigate(`/clients/edit/${c._id}`)}
                        className='p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors'
                        title='Edit'
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(c._id)}
                        className='p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors'
                        title='Delete'
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ClientsView
