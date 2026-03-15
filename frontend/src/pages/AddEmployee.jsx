import React, { useEffect, useState, useRef } from 'react'
import api from '../api/axios'
import { useNavigate, useParams } from 'react-router-dom'

const AddEmployee = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    designation: '',
    department: '',
    dateOfJoining: '',
    salary: '',
    workingHours: '',
    status: 'Active',
  })
  const [designations, setDesignations] = useState([])
  const [designationSearch, setDesignationSearch] = useState('')
  const [designationOpen, setDesignationOpen] = useState(false)
  const [designationLoading, setDesignationLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const designationRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchDesignations = async () => {
      try {
        const res = await api.get('/designations')
        const payload = res.data
        let list = []
        if (Array.isArray(payload)) {
          list = payload
        } else if (payload && Array.isArray(payload.data)) {
          list = payload.data
        } else if (payload && Array.isArray(payload.designations)) {
          list = payload.designations
        } else if (payload && typeof payload === 'object') {
          list = [payload]
        }
        setDesignations(list)
      } catch (err) {
        console.error('Failed to fetch designations:', err)
      } finally {
        setDesignationLoading(false)
      }
    }
    fetchDesignations()
  }, [])

  useEffect(() => {
    if (!id) return
    const fetchEmployee = async () => {
      try {
        const res = await api.get(`/employees/${id}`)
        const emp = res.data
        const designationId = emp.designation?._id ?? emp.designation
        const designationTitle = emp.designation?.title ?? emp.designation?.name ?? ''
        setForm({
          name: emp.name ?? '',
          email: emp.email ?? '',
          password: '',
          designation: designationId ?? '',
          department: emp.department ?? '',
          dateOfJoining: emp.dateOfJoining ? emp.dateOfJoining.split('T')[0] : '',
          salary: emp.salary ?? '',
          workingHours: emp.workingHours ?? '',
          status: emp.status ?? 'Active',
        })
        setDesignationSearch(designationTitle)
      } catch (err) {
        console.error('Failed to fetch employee:', err)
        setError(err.response?.data?.message || err.message || 'Error loading employee')
      }
    }
    fetchEmployee()
  }, [id])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (designationRef.current && !designationRef.current.contains(e.target)) {
        setDesignationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getDesignationTitle = (d) => d?.title ?? d?.name ?? ''

  const filteredDesignations = designations.filter((d) =>
    getDesignationTitle(d).toLowerCase().includes(designationSearch.toLowerCase())
  )

  const selectedDesignation = designations.find((d) => d._id === form.designation)
  const selectedTitle = selectedDesignation ? getDesignationTitle(selectedDesignation) : ''

  const handleDesignationSelect = (d) => {
    setForm((f) => ({ ...f, designation: d._id }))
    setDesignationSearch(getDesignationTitle(d))
    setDesignationOpen(false)
  }

  const handleDesignationSearchChange = (e) => {
    const value = e.target.value
    setDesignationSearch(value)
    setDesignationOpen(true)
    if (!value) setForm((f) => ({ ...f, designation: '' }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.designation) {
      setError('Please select a designation')
      return
    }
    if (!isEdit && (!form.password || form.password.length < 6)) {
      setError('Password is required and must be at least 6 characters')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = { ...form, salary: Number(form.salary) }
      if (isEdit) {
        if (!payload.password) delete payload.password
        await api.put(`/employees/${id}`, payload)
      } else {
        await api.post('/employees', payload)
      }
      navigate('/employees')
    } catch (err) {
      setError(err.response?.data?.message || err.message || (isEdit ? 'Error updating employee' : 'Error creating employee'))
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'mt-1 block w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'

  return (
    <div className='p-8 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]'>
      <h1 className='text-2xl font-bold mb-4'>{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
      <form className='max-w-2xl w-full space-y-4 bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center' onSubmit={handleSubmit}>
        <div className='w-full grid grid-cols-2 gap-4'>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Name</label>
            <input name='name' value={form.name} onChange={handleChange} required className={inputClass} />
          </div>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Email</label>
            <input name='email' type='email' value={form.email} onChange={handleChange} required className={inputClass} />
          </div>
        </div>

        <div className='w-full'>
          <label className='block text-sm font-medium text-gray-700'>Password to Login</label>
          <input
            name='password'
            type='password'
            value={form.password}
            onChange={handleChange}
            placeholder={isEdit ? 'Leave blank to keep current password' : 'Min 6 characters'}
            className={inputClass}
            required={!isEdit}
            minLength={isEdit ? undefined : 6}
          />
        </div>

        <div className='w-full grid grid-cols-2 gap-4'>
          <div className='flex flex-col relative' ref={designationRef}>
            <label className='block text-sm font-medium text-gray-700'>Designation</label>
            <input
              type='text'
              value={designationSearch}
              onChange={handleDesignationSearchChange}
              onFocus={() => setDesignationOpen(true)}
              placeholder='Search designation...'
              className={inputClass}
              autoComplete='off'
            />
            {designationOpen && (
              <ul className='absolute z-10 top-full left-0 right-0 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-300 rounded-xl shadow-lg py-1'>
                {designationLoading ? (
                  <li className='px-3 py-2 text-sm text-gray-500'>Loading...</li>
                ) : filteredDesignations.length === 0 ? (
                  <li className='px-3 py-2 text-sm text-gray-500'>No designations found</li>
                ) : (
                  filteredDesignations.map((d) => (
                    <li
                      key={d._id}
                      onClick={() => handleDesignationSelect(d)}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${form.designation === d._id ? 'bg-blue-100' : ''}`}
                    >
                      {getDesignationTitle(d)}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Department</label>
            <input name='department' value={form.department} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div className='w-full grid grid-cols-2 gap-4'>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Date of Joining</label>
            <input name='dateOfJoining' type='date' value={form.dateOfJoining} onChange={handleChange} className={inputClass} />
          </div>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Salary</label>
            <input name='salary' type='number' value={form.salary} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div className='w-full grid grid-cols-2 gap-4'>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Working Hours</label>
            <input name='workingHours' value={form.workingHours} onChange={handleChange} className={inputClass} />
          </div>
          <div className='flex flex-col'>
            <label className='block text-sm font-medium text-gray-700'>Status</label>
            <select name='status' value={form.status} onChange={handleChange} className={inputClass}>
              <option value='Active'>Active</option>
              <option value='Inactive'>Inactive</option>
            </select>
          </div>
        </div>

        {error && <p className='text-red-600 text-sm w-full text-center rounded-lg bg-red-50 py-2 px-3'>{error}</p>}

        <div className='flex items-center justify-center gap-3 pt-2'>
          <button type='submit' disabled={loading} className='bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50'>
            {loading ? 'Saving...' : isEdit ? 'Update Employee' : 'Save Employee'}
          </button>
          <button type='button' onClick={() => navigate('/employees')} className='px-5 py-2.5 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors'>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default AddEmployee
