import SocialMediaCalendar from '../models/socialMediaCalendar.js';
import { syncClientProfile } from '../utils/clientProfileSync.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const generateShareToken = () => crypto.randomBytes(24).toString('hex');

const toEmployeeObjectId = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object' && raw._id != null) raw = raw._id;
  const s = typeof raw === 'string' ? raw.trim() : String(raw);
  if (!s || !mongoose.isValidObjectId(s)) return null;
  return new mongoose.Types.ObjectId(s);
};

const normalizeAssignedTo = (assignedTo) => {
  const arr = Array.isArray(assignedTo) ? assignedTo : assignedTo ? [assignedTo] : [];
  return arr.map(toEmployeeObjectId).filter(Boolean);
};

const normalizeCarouselItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      subject: typeof item?.subject === 'string' ? item.subject : '',
      description: typeof item?.description === 'string' ? item.description : '',
    }))
    .filter((item) => item.subject.trim() || item.description.trim());
};

const normalizeReferenceUpload = (upload) => {
  if (!upload || typeof upload !== 'object') return undefined;
  return {
    fileName: typeof upload.fileName === 'string' ? upload.fileName : '',
    mimeType: typeof upload.mimeType === 'string' ? upload.mimeType : '',
    dataUrl: typeof upload.dataUrl === 'string' ? upload.dataUrl : '',
  };
};

const sanitizeClientViewPost = (post) => ({
  _id: post._id,
  title: post.title,
  contentType: post.contentType,
  subject: post.subject || '',
  description: post.description || '',
  carouselItems: Array.isArray(post.carouselItems) ? post.carouselItems : [],
  platform: post.platform,
  scheduledTime: post.scheduledTime,
  status: post.status,
  referenceLink: post.referenceLink || '',
  referenceUpload: post.referenceUpload || { fileName: '', mimeType: '', dataUrl: '' },
  clientReviewStatus: post.clientReviewStatus || 'Pending',
  clientNote: post.clientNote || '',
  uploadedLinks: Array.isArray(post.uploadedLinks) ? post.uploadedLinks : [],
});

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
      calendar = await SocialMediaCalendar.create({
        client: req.params.clientId,
        posts: [],
        shareToken: generateShareToken(),
      });
      await calendar.populate('client');
      await syncClientProfile({ clientId: req.params.clientId });
    } else if (!calendar.shareToken) {
      calendar.shareToken = generateShareToken();
      await calendar.save();
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
      if (!existing.shareToken) {
        existing.shareToken = generateShareToken();
        await existing.save();
      }
      return res.status(200).json({ message: 'Calendar exists', calendar: existing });
    }
    const calendar = new SocialMediaCalendar({ client, posts: [], shareToken: generateShareToken() });
    await calendar.save();
    await syncClientProfile({ clientId: client });
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client');
    res.status(201).json({ message: 'Calendar created', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error creating calendar', error });
  }
};

export const addPost = async (req, res) => {
  try {
    const {
      title,
      contentType,
      subject,
      description,
      carouselItems,
      platform,
      scheduledTime,
      status,
      referenceLink,
      referenceUpload,
      assignedTo,
    } = req.body;
    let calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) {
      calendar = new SocialMediaCalendar({
        client: req.params.clientId,
        posts: [],
        shareToken: generateShareToken(),
      });
      await calendar.save();
    } else if (!calendar.shareToken) {
      calendar.shareToken = generateShareToken();
    }

    const resolvedContentType = contentType || 'Feed Post';
    const resolvedCarouselItems = resolvedContentType === 'Carousel' ? normalizeCarouselItems(carouselItems) : [];
    const resolvedSubject = resolvedContentType === 'Carousel' ? '' : (subject || '');

    calendar.posts.push({
      title,
      contentType: resolvedContentType,
      subject: resolvedSubject,
      description: description || '',
      carouselItems: resolvedCarouselItems,
      platform: platform || 'Instagram',
      scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      status: status || 'Scheduled',
      referenceLink: referenceLink || '',
      referenceUpload: normalizeReferenceUpload(referenceUpload),
      clientReviewStatus: 'Pending',
      assignedTo: normalizeAssignedTo(assignedTo),
    });
    await calendar.save();
    await syncClientProfile({ clientId: req.params.clientId });
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client').populate('posts.assignedTo');
    res.status(201).json({ message: 'Post added', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding post', error });
  }
};

export const updatePost = async (req, res) => {
  try {
    const {
      title,
      contentType,
      subject,
      description,
      carouselItems,
      platform,
      scheduledTime,
      status,
      referenceLink,
      referenceUpload,
      assignedTo,
      clientReviewStatus,
      clientNote,
      uploadedLinks,
    } = req.body;
    const calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) return res.status(404).json({ message: 'Calendar not found' });
    const post = calendar.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (title !== undefined) post.title = title;
    if (contentType !== undefined) post.contentType = contentType;
    if (subject !== undefined) post.subject = subject;
    if (description !== undefined) post.description = description;
    if (carouselItems !== undefined) post.carouselItems = normalizeCarouselItems(carouselItems);
    if (platform !== undefined) post.platform = platform;
    if (scheduledTime !== undefined) post.scheduledTime = scheduledTime ? new Date(scheduledTime) : undefined;
    if (status !== undefined) post.status = status;
    if (referenceLink !== undefined) post.referenceLink = referenceLink;
    if (referenceUpload !== undefined) post.referenceUpload = normalizeReferenceUpload(referenceUpload);
    if (assignedTo !== undefined) post.assignedTo = normalizeAssignedTo(assignedTo);
    if (clientReviewStatus !== undefined) {
      post.clientReviewStatus = clientReviewStatus;
      post.clientDecisionAt = new Date();
    }
    if (clientNote !== undefined) post.clientNote = clientNote;
    if (uploadedLinks !== undefined && Array.isArray(uploadedLinks)) {
      post.uploadedLinks = uploadedLinks
        .filter((l) => l?.url)
        .map((l) => ({
          platform: typeof l.platform === 'string' ? l.platform : '',
          url: l.url,
          addedBy: l.addedBy || undefined,
          addedAt: l.addedAt ? new Date(l.addedAt) : new Date(),
        }));
    }
    await calendar.save();
    await syncClientProfile({ clientId: req.params.clientId });
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
    await syncClientProfile({ clientId: req.params.clientId });
    const populated = await SocialMediaCalendar.findById(calendar._id).populate('client');
    res.status(200).json({ message: 'Post deleted', calendar: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting post', error });
  }
};

export const getCalendarByShareToken = async (req, res) => {
  try {
    const calendar = await SocialMediaCalendar.findOne({ shareToken: req.params.token })
      .populate('client')
      .populate('posts.uploadedLinks.addedBy', 'name');

    if (!calendar) return res.status(404).json({ message: 'Shared calendar not found' });

    res.status(200).json({
      _id: calendar._id,
      shareToken: calendar.shareToken,
      client: calendar.client ? { _id: calendar.client._id, clientName: calendar.client.clientName } : null,
      posts: (calendar.posts || []).map(sanitizeClientViewPost),
      updatedAt: calendar.updatedAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shared calendar', error });
  }
};

export const updatePostReviewByShareToken = async (req, res) => {
  try {
    const { action, clientNote } = req.body || {};
    const actionMap = {
      accept: 'Accepted',
      reject: 'Rejected',
      need_changes: 'Need Changes',
      pending: 'Pending',
    };
    const mappedStatus = action ? actionMap[String(action).toLowerCase()] : undefined;
    if (action !== undefined && !mappedStatus) {
      return res.status(400).json({ message: 'Invalid action. Use accept, reject, need_changes, or pending' });
    }

    const calendar = await SocialMediaCalendar.findOne({ shareToken: req.params.token });
    if (!calendar) return res.status(404).json({ message: 'Shared calendar not found' });

    const post = calendar.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (mappedStatus) {
      post.clientReviewStatus = mappedStatus;
      post.clientDecisionAt = new Date();
    }
    if (clientNote !== undefined) {
      post.clientNote = typeof clientNote === 'string' ? clientNote : '';
    }

    await calendar.save();
    await syncClientProfile({ clientId: calendar.client });
    return res.status(200).json({
      message: 'Post review updated',
      post: sanitizeClientViewPost(post),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating post review', error });
  }
};

export const addUploadedLinkToPost = async (req, res) => {
  try {
    const { platform, url, addedBy } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'url is required' });
    }

    const calendar = await SocialMediaCalendar.findOne({ client: req.params.clientId });
    if (!calendar) return res.status(404).json({ message: 'Calendar not found' });

    const post = calendar.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.uploadedLinks.push({
      platform: typeof platform === 'string' ? platform : '',
      url: url.trim(),
      addedBy: addedBy || undefined,
      addedAt: new Date(),
    });

    await calendar.save();
    const populated = await SocialMediaCalendar.findById(calendar._id)
      .populate('client')
      .populate('posts.assignedTo')
      .populate('posts.uploadedLinks.addedBy', 'name');

    return res.status(200).json({ message: 'Uploaded link added', calendar: populated });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding uploaded link', error });
  }
};
