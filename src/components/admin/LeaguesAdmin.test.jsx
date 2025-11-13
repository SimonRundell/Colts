/**
 * @file LeaguesAdmin.test.jsx
 * @description Tests for LeaguesAdmin component
 * @module components/admin/LeaguesAdmin.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaguesAdmin from './LeaguesAdmin';
import * as authHelpers from '../../utils/authHelpers';

// Mock the authHelpers module
vi.mock('../../utils/authHelpers', () => ({
  crudRequest: vi.fn(),
}));

describe('LeaguesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    authHelpers.crudRequest.mockImplementation(() => new Promise(() => {}));
    render(<LeaguesAdmin />);
    expect(screen.getByText('Loading leagues...')).toBeInTheDocument();
  });

  it('should render leagues list after loading', async () => {
    const mockLeagues = [
      { id: 1, leagueName: 'Devon Merit Table', leagueSeason: '2025-26' },
      { id: 2, leagueName: 'Devon Colts Cup', leagueSeason: '2025-26' },
    ];

    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: mockLeagues },
    });

    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Manage Leagues')).toBeInTheDocument();
    });

    expect(screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'strong' && content === 'Devon Merit Table';
    })).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'strong' && content === 'Devon Colts Cup';
    })).toBeInTheDocument();
    expect(screen.getAllByText('2025-26').length).toBe(2);
  });

  it('should show empty state when no leagues exist', async () => {
    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: [] },
    });

    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('No leagues found. Add your first league to get started.')).toBeInTheDocument();
    });
  });

  it('should show add league form when Add League button is clicked', async () => {
    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: [] },
    });

    const user = userEvent.setup();
    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('+ Add League')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add League'));

    expect(screen.getByText('Add New League')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., Devon Merit Table/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., 2025-26/i)).toBeInTheDocument();
  });

  it('should validate required fields when submitting', async () => {
    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: [] },
    });

    const user = userEvent.setup();
    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('+ Add League')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add League'));
   
    // HTML required attribute will prevent actual form submission
    // Just verify the form renders with required fields
    expect(screen.getByPlaceholderText(/e.g., Devon Merit Table/i)).toBeRequired();
    expect(screen.getByPlaceholderText(/e.g., 2025-26/i)).toBeRequired();
  });

  it('should create new league successfully', async () => {
    authHelpers.crudRequest
      .mockResolvedValueOnce({
        status_code: 200,
        data: { records: [] },
      })
      .mockResolvedValueOnce({
        status_code: 200,
      })
      .mockResolvedValueOnce({
        status_code: 200,
        data: { records: [{ id: 1, leagueName: 'Test League', leagueSeason: '2025-26' }] },
      });

    const user = userEvent.setup();
    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('+ Add League')).toBeInTheDocument();
    });

    await user.click(screen.getByText('+ Add League'));
    await user.type(screen.getByPlaceholderText(/e.g., Devon Merit Table/i), 'Test League');
    await user.type(screen.getByPlaceholderText(/e.g., 2025-26/i), '2025-26');
    await user.click(screen.getByText('Create League'));

    await waitFor(() => {
      expect(screen.getByText('League created successfully')).toBeInTheDocument();
    });
  });

  it('should open edit form with league data', async () => {
    const mockLeagues = [
      { id: 1, leagueName: 'Devon Merit Table', leagueSeason: '2025-26' },
    ];

    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: mockLeagues },
    });

    const user = userEvent.setup();
    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'strong' && content === 'Devon Merit Table';
      })).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);

    expect(screen.getByText('Edit League')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Devon Merit Table')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-26')).toBeInTheDocument();
  });

  it('should confirm before deleting league', async () => {
    const mockLeagues = [
      { id: 1, leagueName: 'Devon Merit Table', leagueSeason: '2025-26' },
    ];

    authHelpers.crudRequest.mockResolvedValue({
      status_code: 200,
      data: { records: mockLeagues },
    });

    const user = userEvent.setup();
    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'strong' && content === 'Devon Merit Table';
      })).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(globalThis.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Are you sure you want to delete Devon Merit Table')
    );
  });

  it('should handle error when loading leagues fails', async () => {
    authHelpers.crudRequest.mockResolvedValue({
      status_code: 500,
      message: 'Database error',
    });

    render(<LeaguesAdmin />);

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });
  });
});
