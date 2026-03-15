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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
connectDB();

// Define routes
app.get('/', (req, res) => {
  res.send('Welcome to the CRM API');
});

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

// Import and use other routes (e.g., auth, users, customers, etc.)
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/customers', customerRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});