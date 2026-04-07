import { getAllUsers } from '../services/api';

let userCache = [];

// Fetch and cache all users
export const fetchUsers = async () => {
  try {
    const users = await getAllUsers();
    userCache = users;
    console.log('👥 Fetched users:', users.length);
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Get user ID by name
export const getUserIdByName = (fullName) => {
  const user = userCache.find(u => 
    `${u.firstName} ${u.lastName}` === fullName
  );
  return user?.id || null;
};

// Get user name by ID
export const getUserNameById = (userId) => {
  const user = userCache.find(u => u.id === userId);
  return user ? `${user.firstName} ${user.lastName}` : null;
};

// Get all cached users
export const getCachedUsers = () => userCache;

