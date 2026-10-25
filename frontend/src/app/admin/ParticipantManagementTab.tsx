'use client';

import React, { useState } from 'react';
import { Users, KeyRound, Edit, Trash2, X, Plus, Search } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface ParticipantTeam {
  id: string;
  teamName: string;
  email: string;
  members: string[];
  role: string;
  createdAt: string;
}

interface ParticipantManagementTabProps {
  teams: ParticipantTeam[];
  onRefresh: () => void;
  onNotice: (msg: string) => void;
}

export const ParticipantManagementTab: React.FC<ParticipantManagementTabProps> = ({
  teams,
  onRefresh,
  onNotice
}) => {
  const [search, setSearch] = useState('');
  const [editingTeam, setEditingTeam] = useState<ParticipantTeam | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  const [passwordTeam, setPasswordTeam] = useState<ParticipantTeam | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTeams = teams.filter(t =>
    t.teamName.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.members.some(m => m.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenEdit = (team: ParticipantTeam) => {
    setEditingTeam(team);
    setEditName(team.teamName);
    setEditEmail(team.email);
    setEditMembers([...team.members]);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    setEditMembers(prev => [...prev, newMemberName.trim()]);
    setNewMemberName('');
  };

  const handleRemoveMember = (idx: number) => {
    setEditMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (editMembers.length === 0) {
      alert('A team must have at least one participating member.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/admin/participants/' + editingTeam.id, {
        method: 'PUT',
        body: {
          teamName: editName.trim(),
          email: editEmail.trim(),
          members: editMembers
        }
      });
      onNotice(res.message);
      setEditingTeam(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update participant team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTeam) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/admin/participants/' + passwordTeam.id + '/reset-password', {
        method: 'POST',
        body: { newPassword }
      });
      onNotice(res.message);
      setPasswordTeam(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (team: ParticipantTeam) => {
    if (!confirm(`CAUTION: Are you sure you want to PERMANENTLY delete team "${team.teamName}"? All their stage scores and submissions will be purged.`)) {
      return;
    }

    try {
      const res = await apiFetch<{ message: string }>('/admin/participants/' + team.id, {
        method: 'DELETE'
      });
      onNotice(res.message);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete team.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[rgba(0,245,255,0.2)] bg-[rgba(10,14,23,0.8)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[var(--cyan-primary)]" />
            <h2 className="text-lg font-bold font-mono text-white">Participant Registrations & Roster Management</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            Manage participant squads, update rosters, issue password resets, and audit team composition.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search teams or members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[rgba(0,245,255,0.15)] bg-[rgba(10,14,23,0.6)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[rgba(0,245,255,0.06)] text-[var(--text-secondary)] border-b border-[rgba(0,245,255,0.15)]">
            <tr>
              <th className="p-3">Team Name</th>
              <th className="p-3">Registered Email</th>
              <th className="p-3">Roster Members</th>
              <th className="p-3">Registered At</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,245,255,0.08)]">
            {filteredTeams.map(team => (
              <tr key={team.id} className="hover:bg-[rgba(0,245,255,0.03)] transition-colors">
                <td className="p-3">
                  <span className="font-bold text-white">{team.teamName}</span>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">{team.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1 max-w-md">
                    {team.members.map((m, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-[rgba(0,245,255,0.08)] border border-[rgba(0,245,255,0.2)] text-[var(--cyan-primary)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">
                  {new Date(team.createdAt).toLocaleString()}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(team)}
                      className="px-2.5 py-1 rounded text-[11px] font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/10 flex items-center gap-1"
                    >
                      <Edit size={12} />
                      <span>Edit Roster</span>
                    </button>
                    <button
                      onClick={() => { setPasswordTeam(team); setNewPassword(''); }}
                      className="px-2.5 py-1 rounded text-[11px] font-mono border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-1"
                    >
                      <KeyRound size={12} />
                      <span>Reset Pass</span>
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team)}
                      className="px-2.5 py-1 rounded text-[11px] font-mono border border-red-500/40 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTeams.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[var(--text-secondary)] font-mono">
                  No participant teams match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg p-6 rounded-lg border border-[var(--cyan-primary)]/40 bg-[rgba(10,14,23,0.95)] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingTeam(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-1 flex items-center gap-2">
              <Edit size={16} className="text-[var(--cyan-primary)]" />
              Edit Team: {editingTeam.teamName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Update official team identity and participating member roster.
            </p>

            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Team Display Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">Roster Members</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter student name..."
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="px-3 py-1.5 text-xs font-mono border border-[var(--cyan-primary)]/40 text-[var(--cyan-primary)] rounded hover:bg-[var(--cyan-primary)]/10 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-white/10 rounded p-2 bg-black/30">
                  {editMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-white/5 text-xs font-mono text-gray-300">
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cyber-button text-xs px-4 py-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {passwordTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md p-6 rounded-lg border border-yellow-500/40 bg-[rgba(10,14,23,0.95)]">
            <button
              onClick={() => setPasswordTeam(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold font-mono text-white mb-1 flex items-center gap-2">
              <KeyRound size={16} className="text-yellow-400" />
              Reset Password: {passwordTeam.teamName}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-4">
              Enter a new temporary password for team account {passwordTeam.email}.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-yellow-400 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordTeam(null)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-mono bg-yellow-400 text-black font-bold rounded hover:bg-yellow-300"
                >
                  {isSubmitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
