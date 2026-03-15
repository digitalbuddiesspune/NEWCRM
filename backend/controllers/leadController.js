import Lead from '../models/lead.js';

export const createLead = async (req, res) => {
  try {
    const lead = new Lead(req.body);
    await lead.save();
    const populated = await Lead.findById(lead._id).populate('generatedBy');
    res.status(201).json({ message: 'Lead created successfully', lead: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lead', error });
  }
};

export const getLeads = async (req, res) => {
  try {
    const {
      status,
      date,
      dateFrom,
      dateTo,
      employee,
      businessType,
      leadSource,
      city,
      state,
      search,
    } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (employee) filter.generatedBy = employee;
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (businessType) filter.businessType = new RegExp(businessType, 'i');
    if (leadSource) filter.leadSource = new RegExp(leadSource, 'i');

    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.createdAt = { $gte: d, $lt: nextDay };
    } else if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { businessName: new RegExp(search, 'i') },
        { contactNumber: new RegExp(search, 'i') },
        { leadSource: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }

    const leads = await Lead.find(filter).populate('generatedBy').sort({ createdAt: -1 });
    res.status(200).json(leads);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leads', error });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('generatedBy');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.status(200).json(lead);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lead', error });
  }
};

export const updateLead = async (req, res) => {
  try {
    const updated = await Lead.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('generatedBy');
    if (!updated) return res.status(404).json({ message: 'Lead not found' });
    res.status(200).json({ message: 'Lead updated', lead: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating lead', error });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const deleted = await Lead.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Lead not found' });
    res.status(200).json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lead', error });
  }
};

export const addFollowUp = async (req, res) => {
  try {
    const { text } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    lead.followUps.push({ text, date: new Date() });
    await lead.save();
    const populated = await Lead.findById(lead._id).populate('generatedBy');
    res.status(200).json({ message: 'Follow-up added', lead: populated });
  } catch (error) {
    res.status(500).json({ message: 'Error adding follow-up', error });
  }
};
