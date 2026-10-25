'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, UserPlus, KeyRound, Trash2, Edit3, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface AdminAccount {
  id: string;
  teamName: string;
  email: string;
  role: string;
  adminRole: 'primary_admin' | 'event_admin';
  permissions: string[];
  isPrimaryAdmin: boolean;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_stages', label: 'Manage Stage Gates & Locks' },
  { id: 'manage_stage1', label: 'Manage Stage 1 Questions & Telemetry' },
  { id: 'manage_stage2', label: 'Manage Stage 2 Challenges & Hints' },
  { id: 'manage_stage3', label: 'Manage Stage 3 Datasets & Uploads' },
  { id: 'manage_stage4', label: 'Manage Stage 4 Problem Statements' },
  { id: 'manage_stage5', label: 'Manage Stage 5 Instructions & Criteria' },
  { id: 'manage_teams', label: 'Manage Participant Registrations & Passwords' },
  { id: 'manage_submissions', label: 'Manage Submissions, Score Overrides & Resets' },
  { id: 'view_audit_logs', label: 'View Operational Audit Logs' }
];

interface AdminManagementTabProps {
  admins: AdminAccount[];
  currentUserId?: string;
  onRefresh: () => void;
  onNotice: (msg: string) => void;
}

export const AdminManagementTab: React.FC<AdminManagementTabProps> = ({
  admins,
  currentUserId,
  onRefresh,
  onNotice
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>([
    'manage_stages',
    'manage_stage1',
    'manage_stage2',
    'manage_stage3',
    'manage_stage4',
    'manage_stage5',
    'manage_teams',
    'manage_submissions',
    'view_audit_logs'
  ]);

  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCreatePerm = (permId: string) => {
    setCreatePermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const toggleEditPerm = (permId: string) => {
    setEditPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      alert('Please fill in all administrator credentials.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; admin: AdminAccount }>('/admin/admins', {
        method: 'POST',
        body: {
          teamName: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          permissions: createPermissions
        }
      });
      onNotice(res.message);
      setShowCreateModal(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create administrator account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setEditPermissions(admin.permissions || []);
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/admin/admins/' + editingAdmin.id + '/permissions', {
        method: 'PUT',
        body: { permissions: editPermissions }
      });
      onNotice(res.message);
      setEditingAdmin(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update administrator permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (admin: AdminAccount) => {
    if (admin.isPrimaryAdmin) {
      alert('The primary administrator account is protected and cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to revoke and delete admin account "${admin.teamName}" (${admin.email})?`)) {
      return;
    }

    try {
      const res = await apiFetch<{ message: string }>('/admin/admins/' + admin.id, {
        method: 'DELETE'
      });
      onNotice(res.message);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete administrator account.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[rgba(0,245,255,0.2)] bg-[rgba(10,14,23,0.8)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={16} className="text-[#00ffa3]" />
            <h2 className="text-lg font-bold font-mono text-white">Administrator Access & RBAC Controls</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            Primary Administrator clearance: Manage event administrator accounts and granular operational permissions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="cyber-button text-xs px-4 py-2.5 flex items-center gap-2 self-start md:self-auto"
        >
          <UserPlus size={14} />
          <span>Provision Event Admin</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[rgba(0,245,255,0.15)] bg-[rgba(10,14,23,0.6)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[rgba(0,245,255,0.06)] text-[var(--text-secondary)] border-b border-[rgba(0,245,255,0.15)]">
            <tr>
              <th className="p-3">Administrator</th>
              <th className="p-3">Contact Email</th>
              <th className="p-3">Role Tier</th>
              <th className="p-3">Granted Permissions</th>
              <th className="p-3">Registered</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,245,255,0.08)]">
            {admins.map(admin => (
              <tr key={admin.id} className="hover:bg-[rgba(0,245,255,0.03)] transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{admin.teamName}</span>
                    {admin.id === currentUserId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--cyan-primary)]/20 text-[var(--cyan-primary)] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">{admin.email}</td>
                <td className="p-3">
                  {admin.isPrimaryAdmin || admin.adminRole === 'primary_admin' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[rgba(255,170,0,0.15)] text-[#ffaa00] border border-[#ffaa00]/40">
                      <ShieldCheck size={12} />
                      PRIMARY ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[rgba(0,245,255,0.15)] text-[var(--cyan-primary)] border border-[var(--cyan-primary)]/30">
                      EVENT ADMIN
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {admin.isPrimaryAdmin ? (
                    <span className="text-xs text-[var(--text-secondary)] italic">
                      Full Root Access (All Permissions Inherited)
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {admin.permissions && admin.permissions.length > 0 ? (
                        admin.permissions.map(p => (
                          <span
                            key={p}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.15)] text-gray-300"
                          >
                            {p.replace(/^manage_/, '')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-red-400">No permissions assigned</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-[var(--text-secondary)]">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!admin.isPrimaryAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(admin)}
                          className="px-2.5 py-1 rounded text-[11px] font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>Permissions</span>
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          className="px-2.5 py-1 rounded text-[11px] font-mono border border-red-500/40 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          <span>Revoke</span>
                        </button>
                      </>
                    )}
                    {admin.isPrimaryAdmin && (
                      <span className="text-[10px] text-[var(--text-secondary)] italic">Protected</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provision Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-lg border border-[var(--cyan-primary)]/40 bg-[rgba(10,14,23,0.95)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-1 flex items-center gap-2">
              <UserPlus size={16} className="text-[var(--cyan-primary)]" />
              Provision New Event Administrator
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Event admins manage operational data but cannot edit platform code, modify deployment secrets, or elevate privileges.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Display Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage 1 Proctor Officer"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="admin.ops@glitched.campus"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-2">Assign Operational Permissions</label>
                <div className="space-y-2 border border-white/10 rounded p-3 bg-black/30">
                  {AVAILABLE_PERMISSIONS.map(perm => (
                    <label key={perm.id} className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createPermissions.includes(perm.id)}
                        onChange={() => toggleCreatePerm(perm.id)}
                        className="rounded border-white/20 bg-black/40 text-[var(--cyan-primary)] focus:ring-0"
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cyber-button text-xs px-4 py-2"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-lg border border-[var(--cyan-primary)]/40 bg-[rgba(10,14,23,0.95)]">
            <button
              onClick={() => setEditingAdmin(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-1 flex items-center gap-2">
              <KeyRound size={16} className="text-[var(--cyan-primary)]" />
              Edit Permissions: {editingAdmin.teamName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Configure allowed administrative operational zones for {editingAdmin.email}.
            </p>

            <div className="space-y-2 border border-white/10 rounded p-3 bg-black/30 mb-6">
              {AVAILABLE_PERMISSIONS.map(perm => (
                <label key={perm.id} className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editPermissions.includes(perm.id)}
                    onChange={() => toggleEditPerm(perm.id)}
                    className="rounded border-white/20 bg-black/40 text-[var(--cyan-primary)] focus:ring-0"
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="cyber-button text-xs px-4 py-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
