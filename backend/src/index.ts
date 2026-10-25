import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import authRoutes from './routes/authRoutes';
import stageRoutes from './routes/stageRoutes';
import adminRoutes from './routes/adminRoutes';
import adminTestRoutes from './routes/adminTestRoutes';
import { store } from './store';
import { loadEnvironment } from './config/env';
import { ALL_ADMIN_PERMISSIONS } from './types';

// Load environment configuration
loadEnvironment();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: [CLIENT_ORIGIN, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'THE GLITCHED CAMPUS API GATEWAY',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    storeType: 'PERSISTENT_FILE_STORE'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', stageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/test-mode', adminTestRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Seed administrator only when explicit configuration is provided
export async function seedDefaultAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('[AUTH] Administrator bootstrap skipped: configuration missing.');
    return;
  }

  const existing = await store.findTeamByEmail(adminEmail);
  if (existing) {
    if (!existing.isPrimaryAdmin || existing.adminRole !== 'primary_admin' || !existing.permissions || existing.permissions.length === 0) {
      await store.updateTeam(existing.id, {
        adminRole: 'primary_admin',
        isPrimaryAdmin: true,
        permissions: [...ALL_ADMIN_PERMISSIONS]
      });
    }
    console.log('[AUTH] Administrator already exists. Primary administrator privileges verified.');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await store.createTeam({
    teamName: 'Cyber Command Ops',
    email: adminEmail,
    passwordHash,
    members: ['Lead Forensic Examiner', 'Incident Director'],
    role: 'admin',
    adminRole: 'primary_admin',
    isPrimaryAdmin: true,
    permissions: [...ALL_ADMIN_PERMISSIONS]
  });
  console.log('[AUTH] Primary administrator bootstrap completed.');
}

// Start Server when run directly
if (require.main === module && process.env.NODE_ENV !== 'test') {
  seedDefaultAdmin().then(() => {
    app.listen(PORT, () => {
      console.log('===========================================================');
      console.log('⚡ THE GLITCHED CAMPUS // BACKEND API SERVER ACTIVE');
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log('💾 DATA STORE: In-Memory (All records reset on server restart)');
      console.log('===========================================================');
    });
  }).catch(err => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
  });
}

export default app;
