// Per-file: ensure every test worker talks to the throwaway test DB.
process.env.DATABASE_URL = "file:./test.db";
