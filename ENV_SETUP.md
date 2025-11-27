# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# JWT Secret (generate a strong random string for production)
# You can generate one using: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_key_here
```

## How to Generate JWT_SECRET

Run this command to generate a secure random key:

```bash
openssl rand -base64 32
```

Or use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Important Notes

- **Never commit `.env.local` to version control**
- The `.env.local` file is already in `.gitignore`
- Change `JWT_SECRET` to a strong random string in production
- Keep your Supabase keys secure and never expose them publicly

