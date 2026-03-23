import Client from '../models/client.js';

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
