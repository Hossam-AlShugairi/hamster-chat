# 🐹 Hamster Chat

A private, real-time, text-only chat application for exactly two users with a dark mystery hamster theme. Inspired by private investigation chat experiences.

---

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL
- **Real-Time**: Supabase Realtime (Postgres Changes + Presence)
- **Auth**: Custom JWT sessions (`jose` + `bcryptjs` + HttpOnly cookies)
- **Deployment**: Vercel

---

## 🛠️ Environment Variables Setup

Create a `.env.local` file in the root directory (refer to `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
AUTH_SECRET=a-very-long-and-secure-random-secret-key-at-least-32-chars
```

---

## 🗄️ Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the file `supabase/setup.sql` in this repository.
4. Copy its entire content, paste it into the SQL Editor, and click **Run**.

This script will:
- Create the `users` and `messages` tables.
- Add indexes for high-performance chronological querying.
- Enable Row Level Security (RLS).
- Enable Supabase Realtime on the `messages` table.
- Seed the two authorized user accounts with secure bcrypt-hashed passwords.

---

## 👥 Pre-Configured User Credentials

The application is strictly limited to these two accounts:

1. **Hanem**
   - **Username**: `hanem`
   - **Password**: *(Refer to your secure credentials store)*
   - **Display Name**: `Hanem`

2. **Admin**
   - **Username**: `Admin`
   - **Password**: *(Refer to your secure credentials store)*
   - **Display Name**: `Admin`

*Public registration is disabled.*

---

## 💻 Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Open browser**:
   Navigate to `http://localhost:3000`. You will be redirected to `/login`.

---

## 🏗️ Building & Verification

To verify that the application compiles with zero TypeScript and ESLint errors:

```bash
npm run build
```

To run the production server locally:

```bash
npm start
```

---

## 🌐 Deploying to Vercel

1. Push your repository to **GitHub**.
2. Import your repository into **Vercel**.
3. In the Vercel Project Settings, add the environment variables defined in `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_SECRET`
4. Click **Deploy**. Vercel will automatically build and deploy the Next.js application.

---

## 🔒 Security Highlights

- **Server-Side Authentication**: Passwords are validated using bcrypt server-side; plaintext passwords never reach the client or database.
- **HttpOnly Cookies**: Session JWTs are stored in secure HttpOnly, SameSite cookies.
- **Server Session Verification**: User identity is derived strictly from verified JWT tokens on the server for all message operations.
- **Rate Limiting**: Built-in rate limiting protects against login brute-forcing and message spamming.
