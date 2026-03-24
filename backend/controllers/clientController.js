import mongoose from 'mongoose';
import Client from '../models/client.js';
import Project from '../models/project.js';
import Billing from '../models/billing.js';
import Task from '../models/task.js';
import { calculateBillingSummary } from '../utils/clientProfileSync.js';
import { computeTracking, withDynamicRemainingCost } from './billingController.js';

// Create a new client
export const createClient = async (req, res) => {
  try {
    const {
      clientName,
      clientNumber,
      mailId,
      businessType,
      services,
      date,
      clientType,
      projectEndDate,
      address,
      city,
      state,
      pincode,
      onboardBy,
      mouLink,
      mouSentBy,
      mouSentTo,
      status,
    } = req.body;

    const newClient = new Client({
      clientName,
      clientNumber,
      mailId,
      businessType,
      services: services || [],
      date,
      clientType,
      projectEndDate: clientType === 'Non Recurring' ? projectEndDate : undefined,
      address,
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      onboardBy,
      mouLink,
      mouSentBy,
      mouSentTo,
      status: status || 'Active',
    });

    await newClient.save();
    const populated = await Client.findById(newClient._id).populate('onboardBy');
    res.status(201).json({
      message: 'Client created successfully',
      client: populated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating client', error });
  }
};

// Get all clients
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find().populate('onboardBy');
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching clients', error });
  }
};

/** Aggregated dashboard: projects, billing, tasks, work history */
export const getClientDashboard = async (req, res) => {
  try {
    const clientId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({ message: 'Invalid client id' });
    }

    const client = await Client.findById(clientId).populate('onboardBy');
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const [projects, billingsRaw] = await Promise.all([
      Project.find({ client: clientId }).populate('projectManager').sort({ createdAt: -1 }),
      Billing.find({ client: clientId }).populate('projects.project').sort({ createdAt: -1 }),
    ]);

    const billings = billingsRaw.map((b) => withDynamicRemainingCost(b));
    const tracking = computeTracking(billingsRaw);
    const trackingByProjectId = new Map(
      tracking.map((t) => {
        const pid = (t.project?._id || t.project)?.toString?.() || String(t.project || '');
        return [pid, t];
      })
    );

    const projectsPayload = projects.map((p) => {
      const pid = p._id.toString();
      const tr = trackingByProjectId.get(pid);
      const budget = Number(p.budget) || 0;
      const paid = tr?.totalPaid ?? 0;
      const costFromBilling = tr?.projectCost ?? 0;
      const remaining = tr != null ? tr.remaining : budget;
      return {
        _id: p._id,
        projectName: p.projectName,
        status: p.status,
        department: p.department,
        startDate: p.startDate,
        endDate: p.endDate,
        deadline: p.deadline,
        budget,
        projectManager: p.projectManager
          ? { _id: p.projectManager._id, name: p.projectManager.name }
          : null,
        progress: p.progress,
        paidFromBilling: paid,
        remainingAmount: remaining,
        projectCostBilling: costFromBilling || budget,
      };
    });

    const projectIds = projects.map((p) => p._id);
    const tasks =
      projectIds.length > 0
        ? await Task.find({
            project: { $in: projectIds },
            isRecurringTemplate: { $ne: true },
          })
            .populate('project', 'projectName')
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ updatedAt: -1 })
            .limit(100)
            .lean()
        : [];

    const billingSummary = calculateBillingSummary(
      billingsRaw.map((b) => (b.toObject ? b.toObject() : { ...b }))
    );

    const workHistory = [];
    for (const b of billings) {
      const amt = b.paymentDetails?.amount;
      workHistory.push({
        type: 'invoice',
        at: b.createdAt,
        label: `Invoice ${b.invoiceNumber || String(b._id).slice(-6)}`,
        detail:
          amt != null && amt !== ''
            ? `Recorded payment: ₹${Number(amt).toLocaleString('en-IN')}`
            : '—',
        id: b._id,
      });
    }
    for (const p of projects) {
      workHistory.push({
        type: 'project',
        at: p.createdAt,
        label: `Project created: ${p.projectName}`,
        detail: p.status || '—',
        id: p._id,
      });
    }
    for (const t of tasks.slice(0, 50)) {
      workHistory.push({
        type: 'task',
        at: t.updatedAt || t.createdAt,
        label: t.title,
        detail: `${t.status || '—'} · ${t.project?.projectName || 'Project'}`,
        id: t._id,
      });
    }
    workHistory.sort((a, b) => new Date(b.at) - new Date(a.at));

    res.status(200).json({
      client,
      billingSummary,
      projects: projectsPayload,
      billings,
      tasks,
      workHistory: workHistory.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading client dashboard', error: error.message });
  }
};

// Get a single client by ID
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('onboardBy');
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client', error });
  }
};

// Update a client by ID
export const updateClient = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.clientType === 'Recurring') {
      updates.projectEndDate = undefined;
    }
    const updated = await Client.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate('onboardBy');
    if (!updated) return res.status(404).json({ message: 'Client not found' });
    res.status(200).json({ message: 'Client updated', client: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating client', error });
  }
};

// Delete a client by ID
export const deleteClient = async (req, res) => {
  try {
    const deleted = await Client.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Client not found' });
    res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting client', error });
  }
};
