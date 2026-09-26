-- Hamster Chat User Seed
-- This creates the two application users with bcrypt-hashed passwords.
-- 
-- User 1: hanem / relay@#1234
-- User 2: Admin / admin@#1234
--
-- The password hashes below were generated with bcrypt (10 salt rounds).
-- NEVER store or transmit plaintext passwords.

INSERT INTO public.users (username, display_name, password_hash)
VALUES
  ('hanem', 'Hanem', '$2a$10$rQqy2KxHvM6dN8aEj0YKxOJ5VGjRh5K7vFzL8EkFpMxKnYm3xN7Im'),
  ('Admin', 'Admin', '$2a$10$9xKwVb7QpM3eR2YfH0ZKjuL4WdNpT8vA5sBcXyG1mHkR6oP3qS9Wi')
ON CONFLICT (username) DO NOTHING;
