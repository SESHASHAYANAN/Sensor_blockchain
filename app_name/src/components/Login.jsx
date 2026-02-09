import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../config/supabase';
import './loginUser.css';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage('Login successful! Redirecting...');
      console.log('User logged in:', data.user);

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    } catch (error) {
      setMessage(error.message);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setMessage('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        },
      });

      if (error) throw error;
      setMessage('Magic link sent! Check your email.');
    } catch (error) {
      setMessage(error.message);
      console.error('Magic link error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : 'Login'}
          </button>
        </form>

        <button
          type="button"
          className="link-button"
          onClick={handleMagicLink}
          disabled={loading || !email}
        >
          Send magic link
        </button>

        {message && <p className="info-text">{message}</p>}

        <p className="switch-text">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
