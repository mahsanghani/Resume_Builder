import { render, screen } from '@testing-library/react';
import AIResumeGenerator from './components/AIResumeGenerator'
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});

// Mock fetch for testing
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockClear();
});

test('renders resume generator heading', () => {
  render(<AIResumeGenerator />);
  const heading = screen.getByText(/AI Resume Generator/i);
  expect(heading).toBeInTheDocument();
});

test('renders data source configuration', () => {
  render(<AIResumeGenerator />);
  const configHeading = screen.getByText(/Data Source Configuration/i);
  expect(configHeading).toBeInTheDocument();
});

test('handles GitHub profile input', () => {
  render(<AIResumeGenerator />);
  const input = screen.getByDisplayValue('octocat');
  fireEvent.change(input, { target: { value: 'testuser' } });
  expect(input.value).toBe('testuser');
});

test('switches between data source types', () => {
  render(<AIResumeGenerator />);
  const select = screen.getByDisplayValue('GitHub Profile');
  fireEvent.change(select, { target: { value: 'linkedin' } });

  // Should show LinkedIn input
  const linkedinInput = screen.getByPlaceholderText(/LinkedIn profile ID/i);
  expect(linkedinInput).toBeInTheDocument();
});

test('shows test buttons for GitHub and LinkedIn', () => {
  render(<AIResumeGenerator />);

  // GitHub should be selected by default and show test button
  const githubTestButton = screen.getByText(/Test GitHub API/i);
  expect(githubTestButton).toBeInTheDocument();

  // Switch to LinkedIn
  const select = screen.getByDisplayValue('GitHub Profile');
  fireEvent.change(select, { target: { value: 'linkedin' } });

  const linkedinTestButton = screen.getByText(/Test LinkedIn Function/i);
  expect(linkedinTestButton).toBeInTheDocument();
});

test('handles generate resume button click', async () => {
  // Mock successful API response
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        name: 'Test User',
        location: 'Test Location',
        experience: [],
        skills: [],
        projects: [],
        metadata: { platform: 'github' }
      }
    }),
  });

  render(<AIResumeGenerator />);
  const generateButton = screen.getByText(/Generate Resume/i);

  fireEvent.click(generateButton);

  // Should show loading state
  await waitFor(() => {
    expect(screen.getByText(/Fetching profile data/i)).toBeInTheDocument();
  });
});

test('displays error message on API failure', async () => {
  // Mock API failure
  fetch.mockRejectedValueOnce(new Error('API Error'));

  render(<AIResumeGenerator />);
  const generateButton = screen.getByText(/Generate Resume/i);

  fireEvent.click(generateButton);

  // Should show error message
  await waitFor(() => {
    expect(screen.getByText(/API Error/i)).toBeInTheDocument();
  });
});
