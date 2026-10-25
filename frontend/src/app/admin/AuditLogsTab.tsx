'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, RefreshCw, ChevronDown, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
}

export const AuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [limit, setLimit] = useState(100);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AuditLogEntry[]>('/admin/audit-logs?limit=' + limit);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = logs.filter(l =>
    l.actorEmail.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.targetType.toLowerCase().includes(search.toLowerCase()) ||
    (l.targetId && l.targetId.toLowerCase().includes(search.toLowerCase()))
  );

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('revoke')) return 'text-red-400 border-red-500/30 bg-red-500/10';
    if (action.includes('create') || action.includes('upload')) return 'text-[#00ffa3] border-[#00ffa3]/30 bg-[#00ffa3]/10';
    if (action.includes('override') || action.includes('reset')) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
    return 'text-[var(--cyan-primary)] border-[var(--cyan-primary)]/30 bg-[var(--cyan-primary)]/10';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border border-[rgba(0,245,255,0.2)] bg-[rgba(10,14,23,0.8)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={16} className="text-[var(--cyan-primary)]" />
            <h2 className="text-lg font-bold font-mono text-white">Immutable Administrative Audit Log</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono">
            Chronological record of every administrative action, score override, content update, and configuration change.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search action, actor, target..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-white focus:border-[var(--cyan-primary)] outline-none"
            />
          </div>

          <select
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            className="px-2 py-2 text-xs font-mono bg-black/50 border border-white/20 rounded text-gray-300 focus:border-[var(--cyan-primary)] outline-none"
          >
            <option value={50}>50 logs</option>
            <option value={100}>100 logs</option>
            <option value={250}>250 logs</option>
          </select>

          <button
            onClick={() => fetchLogs()}
            className="p-2 border border-white/20 rounded text-gray-300 hover:text-white hover:border-[var(--cyan-primary)]"
            title="Refresh Logs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[rgba(0,245,255,0.15)] bg-[rgba(10,14,23,0.6)]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[rgba(0,245,255,0.06)] text-[var(--text-secondary)] border-b border-[rgba(0,245,255,0.15)]">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Actor / Admin</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target Resource</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,245,255,0.08)]">
            {filteredLogs.map(log => {
              const isExpanded = Boolean(expandedRows[log.id]);
              const hasDetails = log.details && Object.keys(log.details).length > 0;

              return (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-[rgba(0,245,255,0.03)] transition-colors">
                    <td className="p-3 text-center">
                      {hasDetails ? (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-gray-400 hover:text-white"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : null}
                    </td>
                    <td className="p-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {log.actorRole === 'primary_admin' ? (
                          <ShieldCheck size={12} className="text-[#ffaa00]" />
                        ) : (
                          <ShieldAlert size={12} className="text-[var(--cyan-primary)]" />
                        )}
                        <span className="font-bold text-white">{log.actorEmail}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-300 font-bold">{log.targetType}</span>
                      {log.targetId && (
                        <span className="text-[var(--text-secondary)] ml-1">({log.targetId})</span>
                      )}
                    </td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      {hasDetails ? (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="text-[11px] text-[var(--cyan-primary)] hover:underline"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>

                  {isExpanded && hasDetails && (
                    <tr className="bg-black/40">
                      <td colSpan={6} className="p-4 border-b border-white/10">
                        <pre className="text-[11px] font-mono text-emerald-400 bg-black/60 p-3 rounded border border-white/10 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-secondary)] font-mono">
                  {loading ? 'Streaming audit records...' : 'No audit records match your query.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
