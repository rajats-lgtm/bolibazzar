// apps/admin-web — dedicated Next.js deploy for the admin dashboard
// This is the SPLIT-DEPLOY version. It re-exports the AdminDashboard from the
// root Next.js codebase so both stay in sync while you gradually migrate.
//
// To deploy this as a standalone project:
//   cd apps/admin-web && vercel
// (Add ADMIN_EMAILS, MONGO_URL, DB_NAME env vars in Vercel project settings.)

export { AdminEntry as default } from './entry';
