const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
require('dotenv').config();

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tz_id,
      zan_id,
      phone_no,
      gender,
      house_no,
      street,
      username,
      password,
      first_name,
      last_name,
      status,
      role,
      shehia_id,
    } = req.body;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedData = {
      tz_id,
      zan_id,
      phone_no,
      gender,
      house_no,
      street,
      username,
      first_name,
      last_name,
      status,
      shehia_id,
      role,
    };

    // Hash new password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedData.password = await bcrypt.hash(password, salt);
    }

    await user.update(updatedData);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.destroy();
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all users by shehia
const getAllUsersShehia = async (req, res) => {
  try {
    const { role, shehia_id } = req.user;

    let users;
    
    if (role === 'sheha') {
      // If the user is a sheha, only return users from their shehia
      users = await User.findAll({
        where: { shehia_id }
      });
    } else if (role === 'admin') {
      // If the user is an admin, return all users
      users = await User.findAll();
    } else {
      // For citizens or other roles, return an unauthorized error or an empty list
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register a new admin or citizen
const register = async (req, res) => {
  const { username, password, first_name, last_name, shehia_id, status, street, house_no, gender, phone_no, zan_id, tz_id, role } = req.body;

  const userRole = role ? role : 'citizen';

  if (!['admin', 'sheha', 'citizen'].includes(userRole)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    let user = await User.findOne({ where: { username } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      tz_id,
      zan_id,
      phone_no,
      gender,
      house_no,
      street,
      username,
      password: hashedPassword,
      first_name,
      last_name,
      shehia_id,
      status,
      role: userRole,
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new sheha (only by admin)
const registerSheha = async (req, res) => {
  const { username, password, first_name, last_name, shehia_id, status } = req.body;
  const role = 'sheha';

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Permission denied' });
  }

  try {
    let user = await User.findOne({ where: { username } });
    if (user) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({
      username,
      password: hashedPassword,
      first_name,
      last_name,
      shehia_id,
      status,
      role,
    });

    res.status(201).json({ message: 'Sheha registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userData = {
      user_id: user.user_id,
      role: user.role,
      shehia_id: user.shehia_id,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status,
    };

    const payload = {
      user: {
        id: user.user_id,
        role: user.role,
        shehia_id: user.shehia_id
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token: token, user: userData });
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

// Middleware for verifying token and setting req.user
const authMiddleware = (req, res, next) => {
  const authData = req.headers['authorization'];
  
  if (!authData) {
    console.log("Authorization header missing");
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authData.split(' ')[1];
  if (!token) {
    console.log("Token missing from Authorization header");
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log("Decoded user from token:", req.user); // Add this line
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message); // Add this line
    res.status(401).json({ message: 'Token is not valid' });
  }
};


// Exporting all functions
module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsersShehia,
  register,
  registerSheha,
  login,
  logout,
  authMiddleware
};
