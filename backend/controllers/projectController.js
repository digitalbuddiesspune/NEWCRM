import Project from '../models/project.js';
import { syncClientProfile } from '../utils/clientProfileSync.js';

// Create a new project
export const createProject = async (req, res) => {
  try {
    const {
      projectName,
      department,
      client,
      description,
      status,
      priority,
      startDate,
      endDate,
      deadline,
      budget,
      progress,
      projectManager,
      teamMembers,
      services,
      notes,
    } = req.body;

    const newProject = new Project({
      projectName,
      department: department || 'IT',
      client,
      description,
      status: status || 'Not Started',
      priority: priority || 'Medium',
      startDate,
      endDate,
      deadline,
      budget,
      progress: progress ?? 0,
      projectManager,
      teamMembers: teamMembers || [],
      services: services || [],
      notes,
    });

    await newProject.save();
    await syncClientProfile({ clientId: client, preferredProjectId: newProject._id });
    const populated = await Project.findById(newProject._id)
      .populate('client')
      .populate('projectManager')
      .populate('teamMembers');
    res.status(201).json({
      message: 'Project created successfully',
      project: populated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating project', error });
  }
};

// Get project stats by month for dashboard chart
export const getProjectStatsByMonth = async (req, res) => {
  try {
    const { year, department } = req.query;
    const targetYear = parseInt(year, 10) || new Date().getFullYear();
    const filter = {
      startDate: {
        $gte: new Date(targetYear, 0, 1),
        $lt: new Date(targetYear + 1, 0, 1),
      },
    };
    if (department && department !== 'All') {
      filter.department = department;
    }
    const projects = await Project.find(filter);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const stats = monthNames.map((name, idx) => ({
      month: name,
      monthNum: idx + 1,
      projectCount: 0,
      totalAmount: 0,
    }));
    projects.forEach((p) => {
      const month = new Date(p.startDate).getMonth();
      stats[month].projectCount += 1;
      stats[month].totalAmount += p.budget || 0;
    });
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project stats', error });
  }
};

// Get projects assigned to the current employee (projectManager or teamMembers)
export const getMyProjects = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }
    const projects = await Project.find({
      $or: [
        { projectManager: employeeId },
        { teamMembers: employeeId },
      ],
    })
      .populate('client')
      .populate('projectManager')
      .populate('teamMembers');
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching my projects', error });
  }
};

// Get all projects
export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('client')
      .populate('projectManager')
      .populate('teamMembers');
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
};

// Get a single project by ID
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client')
      .populate('projectManager')
      .populate('teamMembers');
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
};

// Update a project by ID
export const updateProject = async (req, res) => {
  try {
    const previous = await Project.findById(req.params.id).select('client');
    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate('client')
      .populate('projectManager')
      .populate('teamMembers');
    if (!updated) return res.status(404).json({ message: 'Project not found' });
    if (previous?.client) await syncClientProfile({ clientId: previous.client, preferredProjectId: updated._id });
    if (updated?.client) await syncClientProfile({ clientId: updated.client, preferredProjectId: updated._id });
    res.status(200).json({ message: 'Project updated', project: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error });
  }
};

// Delete a project by ID
export const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Project not found' });
    if (deleted?.client) await syncClientProfile({ clientId: deleted.client });
    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project', error });
  }
};
