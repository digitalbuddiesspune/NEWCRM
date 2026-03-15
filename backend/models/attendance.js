import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    type: Date,
  },
  checkInLatitude: { type: Number },
  checkInLongitude: { type: Number },
  checkInAddress: { type: String },
  checkOut: {
    type: Date,
  },
  durationHours: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['Absent', 'Half Day', 'Full Day', 'In Progress'],
    default: 'Absent',
  },
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
