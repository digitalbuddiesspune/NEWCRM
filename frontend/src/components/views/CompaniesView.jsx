import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useNavigate } from 'react-router-dom'
import { EditIcon, DeleteIcon } from '../Icons'

const CompaniesView = () => {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const res = await api.get('/companies')
      const list = Array.isArray(res.data) ? res.data : res.data?.data || []
      setCompanies(list)
    } catch (err) {
      setError(err.message || 'Error fetching companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return
    try {
      await api.delete(`/companies/${id}`)
      fetchCompanies()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error deleting company')
    }
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Company</h1>
          <p className='text-gray-600 mt-1 text-sm'>Manage your company details (logo, address, GST, etc.).</p>
        </div>
        <button
          onClick={() => navigate('/add-company')}
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium'
        >
          Add Company
        </button>
      </div>

      {loading ? (
        <p className='text-sm text-gray-600'>Loading...</p>
      ) : error ? (
        <p className='text-red-600 text-sm'>{error}</p>
      ) : (
        <div className='bg-white rounded-lg shadow overflow-x-auto border border-gray-100'>
          <table className='w-full table-auto text-sm'>
            <thead>
              <tr className='text-left border-b bg-gray-50'>
                <th className='px-4 py-3 font-semibold text-gray-700'>Logo</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Company Name</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Address</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Email</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Phone</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>GSTIN</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>State</th>
                <th className='px-4 py-3 font-semibold text-gray-700'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={8} className='px-4 py-12 text-center text-gray-500'>
                    No companies found. Add one to get started.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c._id} className='border-b hover:bg-gray-50'>
                    <td className='px-4 py-3'>
                      {c.companyLogo ? (
                        <img src={c.companyLogo} alt='' className='w-10 h-10 object-contain border rounded' />
                      ) : (
                        <span className='text-gray-400'>—</span>
                      )}
                    </td>
                    <td className='px-4 py-3 font-medium'>{c.companyName || '—'}</td>
                    <td className='px-4 py-3 max-w-[200px] truncate' title={c.address}>{c.address || '—'}</td>
                    <td className='px-4 py-3'>{c.email || '—'}</td>
                    <td className='px-4 py-3'>{c.phone || '—'}</td>
                    <td className='px-4 py-3'>{c.gstin || '—'}</td>
                    <td className='px-4 py-3'>{c.state || '—'}</td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => navigate(`/companies/edit/${c._id}`)}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CompaniesView
