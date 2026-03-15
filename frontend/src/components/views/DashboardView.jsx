import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { BookIcon, ProjectsIcon, UsersIcon } from '../../components/Icons'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const StatCard = ({ title, value, secondary, icon, color, iconColor }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className='flex items-start justify-between'>
        <div>
          <p className='text-gray-600 text-sm font-medium'>{title}</p>
          <h3 className='text-3xl font-bold text-gray-900 mt-2'>{value}</h3>
          {secondary && (
            <p className='text-sm mt-2 text-gray-600'>
              <span className='font-semibold'>{secondary.label}:</span> {secondary.value}
            </p>
          )}
        </div>
        <div className={`text-3xl ${iconColor} opacity-20`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const ChartCard = ({ title, children }) => {
  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-lg font-bold text-gray-900 mb-4'>{title}</h2>
      {children}
    </div>
  )
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DashboardView = () => {
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterDepartment, setFilterDepartment] = useState('All')

  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setChartLoading(true)
        const res = await api.get(`/projects/stats/by-month?year=${filterYear}&department=${filterDepartment}`)
        setChartData(Array.isArray(res.data) ? res.data : [])
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        setChartData(Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], monthNum: i + 1, projectCount: 0, totalAmount: 0 })))
      } finally {
        setChartLoading(false)
      }
    }
    fetchChartData()
  }, [filterYear, filterDepartment])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [clientsRes, projectsRes, employeesRes] = await Promise.all([
          api.get('/clients'),
          api.get('/projects'),
          api.get('/employees'),
        ])
        const clientsList = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.data || []
        const projectsList = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.data || []
        const employeesList = Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data?.data || []
        setClients(Array.isArray(clientsList) ? clientsList : [])
        setProjects(Array.isArray(projectsList) ? projectsList : [])
        setEmployees(Array.isArray(employeesList) ? employeesList : [])
      } catch (err) {
        setError(err.message || 'Error loading dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const recentActivity = [
    ...projects.map((p) => ({
      type: 'Project',
      name: p.projectName,
      date: p.createdAt || p.startDate,
      id: p._id,
    })),
    ...clients.map((c) => ({
      type: 'Client',
      name: c.clientName,
      date: c.createdAt || c.date,
      id: c._id,
    })),
    ...employees.map((e) => ({
      type: 'Employee',
      name: e.name,
      date: e.createdAt || e.dateOfJoining,
      id: e._id,
    })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10)

  const activeProjects = projects.filter((p) => p.status === 'In Progress').length

  return (
    <div className='p-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Dashboard</h1>
        <p className='text-gray-600 mt-2'>Welcome back! Here's your CRM overview.</p>
      </div>

      {loading ? (
        <p className='text-sm text-gray-600'>Loading...</p>
      ) : error ? (
        <p className='text-red-600 text-sm'>{error}</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
            <StatCard
              title='Total Clients'
              value={clients.length}
              secondary={{ label: 'Total', value: clients.length }}
              icon={<BookIcon />}
              color='border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100'
              iconColor='text-blue-500'
            />
            <StatCard
              title='Total Projects'
              value={projects.length}
              secondary={{ label: 'Active', value: activeProjects }}
              icon={<ProjectsIcon />}
              color='border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100'
              iconColor='text-purple-500'
            />
            <StatCard
              title='Total Employees'
              value={employees.length}
              secondary={{ label: 'Total', value: employees.length }}
              icon={<UsersIcon />}
              color='border-green-500 bg-gradient-to-br from-green-50 to-green-100'
              iconColor='text-green-500'
            />
          </div>

          {/* Projects by Month Bar Chart */}
          <div className='mb-8'>
            <ChartCard title='Projects by Month'>
              <div className='mb-4 flex flex-wrap gap-4 items-center'>
                <div className='flex items-center gap-2'>
                  <label className='text-sm font-medium text-gray-700'>Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className='border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>{y}</option>
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
                    <option value='All'>All</option>
                    <option value='IT'>IT</option>
                    <option value='Marketing'>Marketing</option>
                  </select>
                </div>
              </div>
              {chartLoading ? (
                <p className='text-sm text-gray-500 py-8'>Loading chart...</p>
              ) : (
                <div className='h-80'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                      <XAxis dataKey='month' tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId='left'
                        orientation='left'
                        domain={[1, 'auto']}
                        allowDecimals={false}
                        ticks={Array.from({ length: Math.max(1, ...chartData.map((d) => d.projectCount), 1) }, (_, i) => i + 1)}
                        tick={{ fontSize: 12 }}
                        label={{ value: 'Projects', angle: -90, position: 'insideLeft' }}
                      />
                      <YAxis yAxisId='right' orientation='right' tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} label={{ value: 'Total Project Budget (₹)', angle: 90, position: 'insideRight' }} />
                      <Tooltip
                        formatter={(value, name) => [name === 'projectCount' ? value : `₹${Number(value).toLocaleString('en-IN')}`, name === 'projectCount' ? 'Projects' : 'Total Projects']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Bar yAxisId='left' dataKey='projectCount' name='Projects' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
                      <Bar yAxisId='right' dataKey='totalAmount' name='Total Project Budget' fill='#06b6d4' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Recent Activity */}
          <div className='grid grid-cols-1 gap-6'>
            <ChartCard title='Recent Activity'>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-200'>
                      <th className='text-left py-3 px-4 font-semibold text-gray-700'>Type</th>
                      <th className='text-left py-3 px-4 font-semibold text-gray-700'>Name</th>
                      <th className='text-left py-3 px-4 font-semibold text-gray-700'>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr>
                        <td colSpan={3} className='py-8 px-4 text-center text-gray-500'>
                          No recent activity
                        </td>
                      </tr>
                    ) : (
                      recentActivity.map((item) => (
                        <tr key={`${item.type}-${item.id}`} className='border-b border-gray-100 hover:bg-gray-50 transition-colors'>
                          <td className='py-3 px-4'>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${item.type === 'Project' ? 'bg-purple-100 text-purple-800' :
                                item.type === 'Client' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                              }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className='py-3 px-4 text-gray-900 font-medium'>{item.name}</td>
                          <td className='py-3 px-4 text-gray-600'>
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

export default DashboardView
