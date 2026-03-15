import mongoose from 'mongoose';

const socialMediaPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  platform: {
    type: String,
    enum: ['All', 'Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'YouTube', 'Other'],
    default: 'Instagram',
  },
  scheduledTime: { type: Date },
  status: {
    type: String,
    enum: ['Scheduled', 'Published', 'Draft', 'Cancelled'],
    default: 'Scheduled',
  },
  referenceLink: { type: String },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
}, { timestamps: true });

const socialMediaCalendarSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  posts: [socialMediaPostSchema],
}, { timestamps: true });

const SocialMediaCalendar = mongoose.model('SocialMediaCalendar', socialMediaCalendarSchema);
export default SocialMediaCalendar;
