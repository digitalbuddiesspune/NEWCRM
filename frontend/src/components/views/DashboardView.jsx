import React, { useEffect, useState } from 'react'
import api from '../../api/axios'
import { BookIcon, ProjectsIcon, UsersIcon } from '../../components/Icons'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
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
  const { user, hasFullAccess } = useAuth()
  const navigate = useNavigate()
  const isFullAccess = hasFullAccess()
  const [clients, setClients] = useState([])
  const [clientProfiles, setClientProfiles] = useState([])
  const [projects, setProjects] = useState([])
  const [employees, setEmployees] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [myLeads, setMyLeads] = useState([])
  const [selectedMeetingLeadId, setSelectedMeetingLeadId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState([])
  const [chartLoading, setChartLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterDepartment, setFilterDepartment] = useState('All')

  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i)

  useEffect(() => {
    if (!isFullAccess) return
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
  }, [filterYear, filterDepartment, isFullAccess])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        if (isFullAccess) {
          const [clientsRes, projectsRes, employeesRes, profilesRes] = await Promise.all([
            api.get('/clients'),
            api.get('/projects'),
            api.get('/employees'),
            api.get('/client-profiles'),
          ])
          const clientsList = Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.data || []
          const projectsList = Array.isArray(projectsRes.data) ? projectsRes.data : projectsRes.data?.data || []
          const employeesList = Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data?.data || []
          const profilesList = Array.isArray(profilesRes.data) ? profilesRes.data : profilesRes.data?.data || []
          setClients(Array.isArray(clientsList) ? clientsList : [])
          setProjects(Array.isArray(projectsList) ? projectsList : [])
          setEmployees(Array.isArray(employeesList) ? employeesList : [])
          setClientProfiles(Array.isArray(profilesList) ? profilesList : [])
        } else if (user?._id) {
          const [tasksRes, leadsRes] = await Promise.all([
            api.get('/tasks', { params: { employeeId: user._id } }),
            api.get('/leads'),
          ])
          setMyTasks(Array.isArray(tasksRes.data) ? tasksRes.data : [])
          const allLeads = Array.isArray(leadsRes.data) ? leadsRes.data : []
          const relatedLeads = allLeads.filter((l) => {
            const generatedById = l.generatedBy?._id || l.generatedBy
            const meetingPerson = (l.meetingPersonName || '').toLowerCase()
            const userName = (user?.name || '').toLowerCase()
            return String(generatedById) === String(user._id) || (meetingPerson && meetingPerson === userName)
          })
          setMyLeads(relatedLeads)
        }
      } catch (err) {
        setError(err.message || 'Error loading dashboard data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [isFullAccess, user?._id, user?.name])

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
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const todayTasks = myTasks.filter((t) => {
    if (!t?.dueDate) return false
    const d = new Date(t.dueDate)
    return d >= todayStart && d < todayEnd
  })
  const pendingTasks = myTasks.filter((t) => ['Pending', 'In Progress'].includes(t.status))
  const completedTasks = myTasks.filter((t) => t.status === 'Completed')
  const delayedTasks = myTasks.filter((t) => {
    if (!t?.dueDate) return false
    const d = new Date(t.dueDate)
    return d < new Date() && !['Completed', 'Cancelled'].includes(t.status)
  })
  const meetings = myLeads.filter((l) => l.status === 'Meeting Schedule')
  const attendedMeetings = meetings.filter((m) => m.meetingInfoSent === true)
  const notAttendedMeetings = meetings.filter((m) => m.meetingInfoSent !== true)
  const totalFollowUps = myLeads.reduce((sum, l) => sum + (Array.isArray(l.followUps) ? l.followUps.length : 0), 0)
  const createdMeetings = myLeads.filter((l) => {
    const generatedById = l.generatedBy?._id || l.generatedBy
    return l.status === 'Meeting Schedule' && String(generatedById) === String(user?._id)
  })

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
        isFullAccess ? (
        <>
          {/* Stats Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
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
            <StatCard
              title='Client Profiles'
              value={clientProfiles.length}
              secondary={{ label: 'Managed', value: clientProfiles.length }}
              icon={<BookIcon />}
              color='border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100'
              iconColor='text-amber-500'
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
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
              <StatCard title='Total Tasks (Today)' value={todayTasks.length} icon={<ProjectsIcon />} color='border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100' iconColor='text-blue-500' />
              <StatCard title='Total Pending Tasks' value={pendingTasks.length} icon={<ProjectsIcon />} color='border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100' iconColor='text-amber-500' />
              <StatCard title='Total Completed Tasks' value={completedTasks.length} icon={<ProjectsIcon />} color='border-green-500 bg-gradient-to-br from-green-50 to-green-100' iconColor='text-green-500' />
              <StatCard title='Total Delayed Tasks' value={delayedTasks.length} icon={<ProjectsIcon />} color='border-red-500 bg-gradient-to-br from-red-50 to-red-100' iconColor='text-red-500' />
              <StatCard title='Total Meetings' value={meetings.length} icon={<UsersIcon />} color='border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100' iconColor='text-purple-500' />
              <StatCard title='Meetings Attended' value={attendedMeetings.length} icon={<UsersIcon />} color='border-green-500 bg-gradient-to-br from-green-50 to-green-100' iconColor='text-green-500' />
              <StatCard title="Meetings Didn't Attend" value={notAttendedMeetings.length} icon={<UsersIcon />} color='border-gray-500 bg-gradient-to-br from-gray-50 to-gray-100' iconColor='text-gray-500' />
              <StatCard title='Total Follow Ups' value={totalFollowUps} icon={<BookIcon />} color='border-cyan-500 bg-gradient-to-br from-cyan-50 to-cyan-100' iconColor='text-cyan-500' />
            </div>

            <ChartCard title='Meetings'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 items-end'>
                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>Created Meetings</label>
                  <select
                    value={selectedMeetingLeadId}
                    onChange={(e) => setSelectedMeetingLeadId(e.target.value)}
                    className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm'
                  >
                    <option value=''>Select created meeting</option>
                    {createdMeetings.map((m) => (
                      <option key={m._id} value={m._id}>
                        {(m.businessName || m.name || 'Meeting')} - {m.meetingTime ? new Date(m.meetingTime).toLocaleString() : 'No time'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <button
                    type='button'
                    onClick={() => selectedMeetingLeadId && navigate(`/leads/view/${selectedMeetingLeadId}`)}
                    disabled={!selectedMeetingLeadId}
                    className='px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50'
                  >
                    Open Meeting
                  </button>
                  <button
                    type='button'
                    onClick={() => navigate('/add-lead?meeting=1')}
                    className='px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700'
                  >
                    Create New Meeting
                  </button>
                </div>
              </div>
            </ChartCard>
          </>
        )
      )}
    </div>
  )
}

export default DashboardView
