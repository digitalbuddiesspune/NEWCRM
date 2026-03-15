import mongoose from 'mongoose';
import Task from '../models/task.js';
import SocialMediaCalendar from '../models/socialMediaCalendar.js';

export const createTask = async (req, res) => {
  try {
    const { project, title, description, assignedTo, assignedBy, status, priority, dueDate } = req.body;
    if (!project || !title || !assignedTo || !assignedBy) {
      return res.status(400).json({ message: 'Project, title, assignedTo, and assignedBy are required' });
    }
    const task = new Task({
      project,
      title,
      description,
      assignedTo,
      assignedBy,
      status: status || 'Pending',
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
    await task.save();
    const populated = await Task.findById(task._id)
      .populate('project')
      .populate('assignedTo')
      .populate('assignedBy');
    res.status(201).json({ message: 'Task assigned successfully', task: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error });
  }
};

const socialStatusToTaskStatus = (status) => {
  if (status === 'Published') return 'Completed';
  if (status === 'Cancelled') return 'Cancelled';
  return 'Pending'; // Scheduled, Draft
};

export const getTasks = async (req, res) => {
  try {
    const { projectId, employeeId } = req.query;
    const filter = {};
    if (projectId) filter.project = projectId;
    if (employeeId) filter.assignedTo = employeeId;

    const tasks = await Task.find(filter)
      .populate('project')
      .populate('assignedTo')
      .populate('assignedBy')
      .sort({ createdAt: -1 });

    let result = [...tasks];
    const includeSocialMedia = !projectId || projectId === 'social-media';

    if (includeSocialMedia) {
      const socialQuery = employeeId ? { 'posts.assignedTo': employeeId } : {};
      const calendars = await SocialMediaCalendar.find(socialQuery)
        .populate('client')
        .populate('posts.assignedTo');

      const socialTasks = [];
      for (const cal of calendars) {
        for (const post of cal.posts) {
          const assignees = post.assignedTo || [];
          if (!assignees.length) continue;
          for (const emp of assignees) {
            const empId = emp?._id || emp;
            const empIdStr = empId?.toString?.() || empId;
            if (employeeId && empIdStr !== employeeId) continue;
            socialTasks.push({
              _id: `social-media-${cal._id}-${post._id}-${empIdStr || 'unassigned'}`,
              source: 'social_media',
              clientId: (cal.client?._id || cal.client)?.toString?.() || cal.client,
              postId: post._id,
              calendarId: cal._id,
              title: post.title,
              description: post.description,
              project: { projectName: 'Social Media', _id: 'social-media' },
              clientName: cal.client?.clientName,
              assignedTo: typeof emp === 'object' && emp?.name ? emp : { _id: empId, name: empIdStr === employeeId ? 'You' : '—' },
              assignedBy: null,
              status: socialStatusToTaskStatus(post.status),
              priority: 'Medium',
              dueDate: post.scheduledTime,
              platform: post.platform,
            });
          }
        }
      }
      result = [...tasks, ...socialTasks].sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate) : new Date(0);
        const dateB = b.dueDate ? new Date(b.dueDate) : new Date(0);
        return dateB - dateA;
      });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project')
      .populate('assignedTo')
      .populate('assignedBy');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task', error });
  }
};

export const updateTask = async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('project')
      .populate('assignedTo')
      .populate('assignedBy');
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task updated', task: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Task not found' });
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error });
  }
};
