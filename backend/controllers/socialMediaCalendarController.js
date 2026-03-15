import SocialMediaCalendar from '../models/socialMediaCalendar.js';

export const getCalendars = async (req, res) => {
  try {
    const { client } = req.query;
    const filter = {};
    if (client) filter.client = client;
    const calendars = await SocialMediaCalendar.find(filter).populate('client');
    res.status(200).json(calendars);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendars', error });
  }
};

export const getCalendarByClient = async (req, res) => {
  try {
    let calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId })
      .populate('client')
      .populate('posts.assignedTo');
    if (!calendar) {
      calendar = await SocialMediaCalendar.create({ client: req.params.clientId, posts: [] });
      await calendar.populate('client');
    }
    res.status(200).json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar', error });
  }
};

export const createCalendar = async (req, res) => {
  try {
    const { client } = req.body;
    const existing = await SocialMediaCalendar.findOne({ client }).populate('client');
    if (existing) {
      return res.status(200).json({ message: 'Calendar exists', calendar: existing });
    }
    const calendar = new SocialMediaCalendar({ client, posts: [] });
    await calendar.save();
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client');
    res.status(201).json({ message: 'Calendar created', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error creating calendar', error });
  }
};

export const addPost = async (req, res) => {
  try {
    const { title, description, platform, scheduledTime, status, referenceLink, assignedTo } = req.body;
    let calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) {
      calendar = new SocialMediaCalendar({ client: req.params.clientId, posts: [] });
      await calendar.save();
    }
    calendar.posts.push({
      title,
      description: description || '',
      platform: platform || 'Instagram',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      status: status || 'Scheduled',
      referenceLink: referenceLink || '',
      assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []),
    });
    await calendar.save();
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client').populate('posts.assignedTo');
    res.status(201).json({ message: 'Post added', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding post', error });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { title, description, platform, scheduledTime, status, referenceLink, assignedTo } = req.body;
    const calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) return res.status(404).json({ message: 'Calendar not found' });
    const post = calendar.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (title !== undefined) post.title = title;
    if (description !== undefined) post.description = description;
    if (platform !== undefined) post.platform = platform;
    if (scheduledTime !== undefined) post.scheduledTime = scheduledTime ? new Date(scheduledTime) : undefined;
    if (status !== undefined) post.status = status;
    if (referenceLink !== undefined) post.referenceLink = referenceLink;
    if (assignedTo !== undefined) post.assignedTo = Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []);
    await calendar.save();
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client').populate('posts.assignedTo');
    res.status(200).json({ message: 'Post updated', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating post', error });
  }
};

export const deletePost = async (req, res) => {
  try {
    const calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) return res.status(404).json({ message: 'Calendar not found' });
    calendar.posts.pull(req.params.postId);
    await calendar.save();
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client');
    res.status(200).json({ message: 'Post deleted', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error });
  }
};
