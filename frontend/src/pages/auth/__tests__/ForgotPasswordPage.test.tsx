// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
import { authApi } from '../../../api/auth';
import { ApiError } from '../../../api/client';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('renders Step 1 with email input, submit button, and back link', () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send reset code/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /back to log in/i })).toBeTruthy();
  });

  it('validates email presence and format on step 1', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /send reset code/i });

    // Submit with empty email
    fireEvent.click(submitBtn);
    expect(await screen.findByText('Email is required.')).toBeTruthy();

    // Enter invalid email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
  });

  it('submits email and progresses to step 2 upon success', async () => {
    const forgotSpy = vi.spyOn(authApi, 'forgotPassword').mockResolvedValueOnce({
      message: 'OTP sent to your email.',
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'scholar@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(forgotSpy).toHaveBeenCalledWith('scholar@iitp.ac.in');
    });

    // Step 2 should be rendered
    expect(await screen.findByRole('heading', { name: /reset your password/i })).toBeTruthy();
    expect(screen.getByLabelText(/6-digit reset code/i)).toBeTruthy();
    expect(screen.getByLabelText(/^new password/i)).toBeTruthy();
    expect(screen.getByLabelText(/^confirm password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeTruthy();
    expect(screen.getByText('OTP sent to your email.')).toBeTruthy();
  });

  it('validates OTP, password length, and password match on step 2', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockResolvedValueOnce({
      message: 'OTP sent to your email.',
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'scholar@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await screen.findByRole('heading', { name: /reset your password/i });

    const resetBtn = screen.getByRole('button', { name: /reset password/i });

    // Submit empty step 2
    fireEvent.click(resetBtn);
    expect(await screen.findByText('Reset code is required.')).toBeTruthy();
    expect(screen.getByText('New password is required.')).toBeTruthy();
    expect(screen.getByText('Confirm your new password.')).toBeTruthy();

    // Short password and mismatched confirmation
    fireEvent.change(screen.getByLabelText(/6-digit reset code/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: '456' } });
    fireEvent.click(resetBtn);

    expect(await screen.findByText('Enter the 6-digit code.')).toBeTruthy();
    expect(screen.getByText('Password must be at least 6 characters.')).toBeTruthy();
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('successfully resets password and navigates to login with state message', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockResolvedValueOnce({
      message: 'OTP sent.',
    });
    const resetSpy = vi.spyOn(authApi, 'resetPassword').mockResolvedValueOnce({
      message: 'Password reset successful',
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'scholar@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await screen.findByRole('heading', { name: /reset your password/i });

    fireEvent.change(screen.getByLabelText(/6-digit reset code/i), { target: { value: '654321' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'newSecretPass123' } });
    fireEvent.change(screen.getByLabelText(/^confirm password/i), { target: { value: 'newSecretPass123' } });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith({
        email: 'scholar@iitp.ac.in',
        otp: '654321',
        newPassword: 'newSecretPass123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login', {
        replace: true,
        state: { message: 'Password reset successful. Please log in with your new password.' },
      });
    });
  });

  it('allows changing email to return to step 1', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockResolvedValueOnce({
      message: 'OTP sent.',
    });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'scholar@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await screen.findByRole('heading', { name: /reset your password/i });

    fireEvent.click(screen.getByRole('button', { name: /change email/i }));

    expect(screen.getByRole('heading', { name: /forgot password/i })).toBeTruthy();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
  });

  it('allows resending OTP in step 2', async () => {
    const forgotSpy = vi.spyOn(authApi, 'forgotPassword')
      .mockResolvedValueOnce({ message: 'OTP sent.' })
      .mockResolvedValueOnce({ message: 'Resent OTP code.' });

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'scholar@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await screen.findByRole('heading', { name: /reset your password/i });

    const resendBtn = screen.getByRole('button', { name: /resend code/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(forgotSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Resent OTP code.')).toBeTruthy();
    });
  });

  it('displays server error when API request fails', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockRejectedValueOnce(
      new ApiError('No account found with this email.', 404)
    );

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'missing@iitp.ac.in' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    expect(await screen.findByText('No account found with this email.')).toBeTruthy();
  });
});
