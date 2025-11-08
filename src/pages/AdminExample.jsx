import React, { useState, useEffect } from 'react';
import { crudRequest, hasAuthority, getUser } from '../utils/authHelpers';

/**
 * Example component demonstrating authenticated CRUD operations
 * This is a reference implementation showing how to use the authentication system
 */
function AdminExample() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const user = getUser();

  // Check if user has admin authority
  const isAdmin = hasAuthority(2);
  const isLocalAdmin = hasAuthority(1);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('read', {
        table: 'fixtures',
        // Add any conditions here
        // conditions: { season: '2025-2026' }
      });

      if (result.status_code === 200) {
        // Parse the data if it comes as a JSON string
        let parsedData = result.data;
        if (typeof result.data === 'string') {
          parsedData = JSON.parse(result.data);
        }
        setData(Array.isArray(parsedData) ? parsedData : []);
        setMessage('Data loaded successfully');
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!isAdmin && !isLocalAdmin) {
      setError('You do not have permission to create records');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('create', {
        table: 'fixtures',
        data: {
          date: '2025-11-15',
          opponent: 'Example Team',
          location: 'Home',
          // Add other required fields
        }
      });

      if (result.status_code === 200) {
        setMessage('Record created successfully');
        fetchData(); // Refresh the list
      } else {
        setError(result.message || 'Failed to create record');
      }
    } catch (err) {
      console.error('Create error:', err);
      setError('Failed to create record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!isAdmin && !isLocalAdmin) {
      setError('You do not have permission to update records');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('update', {
        table: 'fixtures',
        data: {
          location: 'Away' // Fields to update
        },
        conditions: {
          id: id // Record to update
        }
      });

      if (result.status_code === 200) {
        setMessage('Record updated successfully');
        fetchData(); // Refresh the list
      } else {
        setError(result.message || 'Failed to update record');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      setError('Only Full Admins can delete records');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this record?')) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const result = await crudRequest('delete', {
        table: 'fixtures',
        conditions: {
          id: id
        }
      });

      if (result.status_code === 200) {
        setMessage('Record deleted successfully');
        fetchData(); // Refresh the list
      } else {
        setError(result.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete record');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Admin Panel Example</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>User Info</h3>
        <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
        <p><strong>Role:</strong> {user?.role}</p>
        <p><strong>Authority Level:</strong> {user?.authority}</p>
        <p><strong>Permissions:</strong></p>
        <ul>
          <li>Read: ✅</li>
          <li>Create/Update: {isLocalAdmin || isAdmin ? '✅' : '❌'}</li>
          <li>Delete: {isAdmin ? '✅' : '❌'}</li>
        </ul>
      </div>

      {message && (
        <div style={{ padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', marginBottom: '10px' }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <button onClick={fetchData} disabled={isLoading} style={{ marginRight: '10px' }}>
          Refresh Data
        </button>
        {(isAdmin || isLocalAdmin) && (
          <button onClick={handleCreate} disabled={isLoading}>
            Create Example Record
          </button>
        )}
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <h3>Data ({data.length} records)</h3>
          {data.length === 0 ? (
            <p>No data available</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {data.map((item, index) => (
                <div 
                  key={item.id || index} 
                  style={{ 
                    padding: '15px', 
                    border: '1px solid #ddd', 
                    borderRadius: '8px',
                    background: 'white'
                  }}
                >
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                  {(isAdmin || isLocalAdmin) && (
                    <div style={{ marginTop: '10px' }}>
                      <button 
                        onClick={() => handleUpdate(item.id)} 
                        disabled={isLoading}
                        style={{ marginRight: '10px' }}
                      >
                        Update
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          disabled={isLoading}
                          style={{ background: '#dc3545', color: 'white' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminExample;
