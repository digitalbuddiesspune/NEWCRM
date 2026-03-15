import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useNavigate } from 'react-router-dom'
import { EditIcon, DeleteIcon } from '../Icons'

const EmployeesView = () => {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const res = await api.get('/employees')
      const payload = res.data
      if (Array.isArray(payload)) {
        setEmployees(payload)
      } else if (payload && Array.isArray(payload.data)) {
        setEmployees(payload.data)
      } else if (payload && payload.employees && Array.isArray(payload.employees)) {
        setEmployees(payload.employees)
      } else {
        setEmployees(payload && typeof payload === 'object' ? [payload] : [])
      }
    } catch (err) {
      setError(err.message || 'Error fetching employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return
    try {
      await api.delete(`/employees/${id}`)
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error deleting employee')
    }
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Employees</h1>
          <p className='text-gray-600 mt-1 text-sm'>Manage all company employees.</p>
        </div>
        <div>
          <button
            onClick={() => navigate('/add-employee')}
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm'
          >
            Add Employee
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
                <th className='px-4 py-3'>Name</th>
                <th className='px-4 py-3'>Email</th>
                <th className='px-4 py-3'>Designation</th>
                <th className='px-4 py-3'>Department</th>
                <th className='px-4 py-3'>Date Joined</th>
                <th className='px-4 py-3'>Salary</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e._id} className='border-b hover:bg-gray-50'>
                  <td className='px-4 py-3 font-medium'>{e.name}</td>
                  <td className='px-4 py-3'>{e.email}</td>
                  <td className='px-4 py-3'>{e.designation?.title || '—'}</td>
                  <td className='px-4 py-3'>{e.department}</td>
                  <td className='px-4 py-3'>{e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString() : '—'}</td>
                  <td className='px-4 py-3 font-semibold'>{e.salary != null ? `₹${Number(e.salary).toLocaleString('en-IN')}` : '—'}</td>
                  <td className='px-4 py-3'>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(e.status || 'Active') === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {e.status || 'Active'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => navigate(`/employees/edit/${e._id}`)}
                        className='p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors'
                        title='Edit'
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(e._id)}
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

export default EmployeesView
