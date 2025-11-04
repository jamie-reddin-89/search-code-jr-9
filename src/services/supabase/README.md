# Supabase Integration

This directory contains the centralized Supabase integration for the application. All interactions with Supabase should be routed through the services defined in this directory.

## Services

- `auth.ts`: Handles user authentication, including sign-in, sign-up, and session management.
- `database.ts`: Provides functions for interacting with the Supabase database, including CRUD operations.
- `storage.ts`: Manages file storage, including uploads, downloads, and deletions.
- `functions.ts`: Provides a generic function for invoking serverless functions deployed to Supabase.

## Usage

To use a Supabase service, import it from the corresponding file. For example, to sign in a user:

```typescript
import { auth } from '@/services/supabase/auth';

const { user, error } = await auth.signIn('test@example.com', 'password');
```

To fetch data from the database:

```typescript
import { database } from '@/services/supabase/database';

const { data, error } = await database.from('users').select('*');
```
