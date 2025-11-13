/**
 * @file Login.test.jsx
 * @description Tests for Login component
 * @module pages/Login.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock authHelpers
vi.mock('../utils/authHelpers', () => ({
  getApiUrl: () => 'http://localhost:3000',
}));

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLogin();
    
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    renderLogin();

    // HTML required attribute should prevent form submission with empty fields
    expect(screen.getByLabelText(/Username/i)).toBeRequired();
    expect(screen.getByLabelText(/Password/i)).toBeRequired();
  });

  it('should handle successful login', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: { id: 1, firstName: 'Test', lastName: 'User', authority: 1 },
        token: 'fake-jwt-token'
      }),
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'testuser');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ login: 'testuser', password: 'password123' })
        })
      );
    });
    
    // Note: navigation happens after localStorage is set
    // In a real integration test, you could verify localStorage.setItem was called
  });

  it('should display error message on failed login', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: 'Invalid credentials'
      }),
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'wronguser');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('should clear error message when user types', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        message: 'Invalid credentials'
      }),
    });

    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'wronguser');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Username/i), 'a');

    await waitFor(() => {
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });
  });
});
