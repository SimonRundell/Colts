# Testing Guide

This project uses **Vitest** and **React Testing Library** for unit and component testing.

## Running Tests

```powershell
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm test -- --watch

# Run tests with UI interface
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Files

Test files are located alongside their source files with the `.test.js` or `.test.jsx` extension:

- `src/utils/dateHelpers.test.js` - Date utility function tests
- `src/components/admin/LeaguesAdmin.test.jsx` - Leagues admin component tests
- `src/pages/Login.test.jsx` - Login page tests

## Writing Tests

### Component Test Example

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Utility Function Test Example

```javascript
import { describe, it, expect } from 'vitest';
import { myUtilFunction } from './utils';

describe('myUtilFunction', () => {
  it('should return expected result', () => {
    const result = myUtilFunction('input');
    expect(result).toBe('expected output');
  });
});
```

## Test Coverage

Coverage reports are generated in the `coverage/` directory when running:

```powershell
npm run test:coverage
```

View the HTML report at `coverage/index.html` in your browser.

## Current Test Suite

### ✅ Utility Tests
- Date formatting functions
- Input validation
- Data transformations

### ✅ Component Tests
- LeaguesAdmin CRUD operations
- Form validation
- User interactions
- Error handling

### ✅ Page Tests
- Login flow
- Authentication
- Error messages
- Navigation

## Best Practices

1. **Test User Behavior** - Focus on what users do, not implementation details
2. **Mock External Dependencies** - Use `vi.mock()` for API calls and external modules
3. **Use Testing Library Queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
4. **Async Operations** - Use `waitFor` for async state updates
5. **Clean Setup** - Use `beforeEach` to reset mocks and state

## Continuous Integration

Tests should be run before commits and in CI/CD pipelines:

```powershell
# Run before committing
npm test -- --run
```

## Next Steps

Consider adding tests for:
- [ ] TeamsAdmin component
- [ ] FixturesAdmin component
- [ ] ResultsAdmin component
- [ ] Fixtures page with exports
- [ ] Tables/Standings page
- [ ] API helper functions
- [ ] Auth helper functions
