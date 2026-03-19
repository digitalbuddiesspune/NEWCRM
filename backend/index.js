import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import designationRouter from './routes/designationRoute.js';
import employeeRouter from './routes/employeeRoute.js';
import clientRouter from './routes/clientRoute.js';
import projectRouter from './routes/projectRoute.js';
import salaryRouter from './routes/salaryRoute.js';
import attendanceRouter from './routes/attendanceRoute.js';
import leadRouter from './routes/leadRoute.js';
import socialMediaCalendarRouter from './routes/socialMediaCalendarRoute.js';
import authRouter from './routes/authRoute.js';
import taskRouter from './routes/taskRoute.js';
import collaboratorRouter from './routes/collaboratorRoute.js';
import leaveRouter from './routes/leaveRoute.js';
import billingRouter from './routes/billingRoute.js';
import companyRouter from './routes/companyRoute.js';
import expenseRouter from './routes/expenseRoute.js';
import { autoCheckoutForDay, autoCheckoutPreviousDays } from './utils/attendanceAutoCheckout.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5011;

// Connect Database
await connectDB();

// Background job: auto check-out previous day's open sessions
const runAttendanceSweeper = async () => {
  try {
    const { updated } = await autoCheckoutPreviousDays();
    if (updated) console.log(`Auto checked-out ${updated} attendance record(s)`);
  } catch (e) {
    console.error('Attendance auto-checkout job failed:', e?.message || e);
  }
};
runAttendanceSweeper();

// Daily 11:59 PM auto checkout for users who forgot to check out
const scheduleDailyAttendanceAutoCheckout = () => {
  const now = new Date();
  const runAt = new Date(now);
  runAt.setHours(23, 59, 0, 0);
  if (runAt <= now) runAt.setDate(runAt.getDate() + 1);

  const delay = runAt.getTime() - now.getTime();
  setTimeout(async () => {
    try {
      const { updated } = await autoCheckoutForDay(new Date());
      if (updated) console.log(`11:59 PM auto checked-out ${updated} attendance record(s)`);
    } catch (e) {
      console.error('11:59 PM attendance auto-checkout failed:', e?.message || e);
    } finally {
      scheduleDailyAttendanceAutoCheckout();
    }
  }, delay);
};
scheduleDailyAttendanceAutoCheckout();


app.use(
  cors({
    origin: [
      "https://www.dmcrms.in",
      "https://dmcrms.in",
      "http://localhost:5173"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  })
);
app.options(/.*/, cors());
// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health route
app.get('/', (req, res) => {
  res.send('Welcome to the CRM API');
});

// Routes
app.use('/api/v1', designationRouter);
app.use('/api/v1', employeeRouter);
app.use('/api/v1', clientRouter);
app.use('/api/v1', projectRouter);
app.use('/api/v1', salaryRouter);
app.use('/api/v1', attendanceRouter);
app.use('/api/v1', leadRouter);
app.use('/api/v1', socialMediaCalendarRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', taskRouter);
app.use('/api/v1', collaboratorRouter);
app.use('/api/v1', leaveRouter);
app.use('/api/v1', billingRouter);
app.use('/api/v1', companyRouter);
app.use('/api/v1', expenseRouter);

// Server start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});