/**
 * @file UsersAdmin.jsx
 * @description User management component for admin panel
 * @module components/admin/UsersAdmin
 */

import React, { useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { crudRequest } from '../../utils/authHelpers';

/**
 * UsersAdmin component - CRUD operations for users
 * 
 * @component
 * @description Provides complete user management interface for administrators.
 * Handles user creation, editing, and deletion with authority level management.
 * 
 * Features:
 * - List all users with details (name, login, role, authority level)
 * - Add new users with password hashing
 * - Edit existing users (optionally change password)
 * - Delete users with confirmation
 * - Manage authority levels (0=follower, 1=team admin, 2=full admin)
 * - Manage team associations (authorityOver field)
 * 
 * Security:
 * - Passwords are hashed with bcrypt before storage
 * - Only accessible by authority level 2 (full admin)
 * 
 * @example
 * // Used within Admin.jsx
 * {activeTab === 'users' && <UsersAdmin />}
 * 
 * @returns {JSX.Element} Users management interface
 */
function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    role: '',
    login: '',
    password: '',
    authority: 0,
    authorityOver: 0
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  /**
   * Fetches all users from database
   * @async
   * @description Loads users sorted by name
   */
  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('read', {
        table: 'tblusers',
        orderBy: 'lastName ASC, firstName ASC'
      });

      if (result.status_code === 200) {
        const userData = result.data.records || result.data;
        setUsers(userData);
      } else {
        setError(result.message || 'Failed to load users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'authority' || name === 'authorityOver' ? parseInt(value) : value
    }));
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      role: '',
      login: '',
      password: '',
      authority: 0,
      authorityOver: 0
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      login: user.login,
      password: '', // Don't show password
      authority: user.authority,
      authorityOver: user.authorityOver
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const operation = editingUser ? 'update' : 'create';
      
      let dataToSend;
      if (editingUser) {
        // Update operation
        if (formData.password) {
          // Hash the password if it's being changed
          const hashedPassword = bcrypt.hashSync(formData.password, 10);
          dataToSend = { ...formData, password: hashedPassword };
        } else {
          // Don't include password field if empty
          const { password, ...dataWithoutPassword } = formData;
          dataToSend = dataWithoutPassword;
        }
      } else {
        // Create operation - always hash the password
        const hashedPassword = bcrypt.hashSync(formData.password, 10);
        dataToSend = { ...formData, password: hashedPassword };
      }

      const requestData = editingUser
        ? {
            table: 'tblusers',
            data: dataToSend,
            conditions: { id: editingUser.id }
          }
        : {
            table: 'tblusers',
            data: dataToSend
          };

      const result = await crudRequest(operation, requestData);

      if (result.status_code === 200) {
        setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
        setShowForm(false);
        fetchUsers();
      } else {
        setError(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving user:', err);
      setError('Failed to save user');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await crudRequest('delete', {
        table: 'tblusers',
        conditions: { id: user.id }
      });

      if (result.status_code === 200) {
        setSuccess('User deleted successfully');
        fetchUsers();
      } else {
        setError(result.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  const getAuthorityLabel = (authority) => {
    const labels = { 0: 'Spectator', 1: 'Local Admin', 2: 'Full Admin' };
    return labels[authority] || 'Unknown';
  };

  if (isLoading) {
    return <div className="admin-loading">Loading users...</div>;
  }

  return (
    <div>
      <div className="admin-header">
        <h3>Manage Users</h3>
        <button className="admin-btn admin-btn-primary" onClick={handleAdd}>
          + Add User
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {showForm && (
        <div className="admin-form">
          <h4>{editingUser ? 'Edit User' : 'Add New User'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Role *</label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Login *</label>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Password {editingUser && '(leave blank to keep current)'}</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!editingUser}
              />
            </div>
            <div className="admin-form-group">
              <label>Authority Level *</label>
              <select
                name="authority"
                value={formData.authority}
                onChange={handleInputChange}
                required
              >
                <option value="0">0 - Spectator</option>
                <option value="1">1 - Local Admin</option>
                <option value="2">2 - Full Admin</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label>Authority Over (Team ID)</label>
              <input
                type="number"
                name="authorityOver"
                value={formData.authorityOver}
                onChange={handleInputChange}
              />
            </div>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary">
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Login</th>
              <th>Authority</th>
              <th>Authority Over</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="darkText">
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.role}</td>
                <td>{user.login}</td>
                <td>{getAuthorityLabel(user.authority)}</td>
                <td>{user.authorityOver || '-'}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      className="admin-btn admin-btn-secondary admin-btn-small"
                      onClick={() => handleEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-btn admin-btn-danger admin-btn-small"
                      onClick={() => handleDelete(user)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UsersAdmin;
