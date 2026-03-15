import Employee from "../models/employee.js";
import Designation from "../models/designation.js";
import bcrypt from "bcryptjs";

// Create a new employee
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, designation, department, dateOfJoining, salary, workingHours, status } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password is required and must be at least 6 characters" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newEmployee = new Employee({
        name,
        email,
        password: hashedPassword,
        designation,
        department,
        dateOfJoining,
        salary,
        workingHours,
        status: status || 'Active',
    });
    await newEmployee.save();
    res.status(201).json({
        message: "Employee created successfully",
        employee: newEmployee
    })  
    }
   catch (error) {
    res.status(500).json({ message: "Error creating employee", error });
  }
};

// Get all employees
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().populate('designation');
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error });
  }
};

// Get a single employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('designation');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee', error });
  }
};

// Update an employee by ID
export const updateEmployee = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const updates = { ...rest };
    if (password && password.length >= 6) {
      updates.password = await bcrypt.hash(password, 10);
    }
    const updated = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('designation');
    if (!updated) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json({ message: 'Employee updated', employee: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee', error });
  }
};

// Delete an employee by ID
export const deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Employee not found' });
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error });
  }
};
    