import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema({
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  businessName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  businessType: { type: String },
  leadSource: { type: String },
  description: { type: String },
  status: {
    type: String,
    enum: [
      'Call not Received',
      'Call You After Sometime',
      'Interested',
      'Not Interested',
      'Meeting Schedule',
    ],
    default: 'Call not Received',
  },
  meetingType: {
    type: String,
    enum: ['Online', 'Offline'],
  },
  meetingPersonName: { type: String },
  meetingTime: { type: Date },
  meetingInfoSent: { type: Boolean, default: false },
  followUps: [followUpSchema],
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
}, { timestamps: true });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
