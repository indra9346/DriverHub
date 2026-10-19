import React from 'react';
import {
  CheckCircle2, Clock, XCircle, AlertCircle, Award, UserCheck, ShieldCheck, Eye, PhoneCall, Ban
} from 'lucide-react';
import { ApplicationStatus, JobStatus, UserStatus, VerificationStatus } from '../../types';
import { useLanguage } from '../../services/i18n';

/**
 * What the status belongs to. Shared values ("rejected", "active", "pending")
 * read differently per record type: an application is "Not Selected", a job
 * or a document is "Rejected"; an active account is just "Active".
 */
export type StatusBadgeKind = 'application' | 'job' | 'user' | 'document';

interface StatusBadgeProps {
  status: ApplicationStatus | JobStatus | UserStatus | VerificationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  kind?: StatusBadgeKind;
}

interface BadgeStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', kind }) => {
  const { t } = useLanguage();
  const normalized = (status || '').toLowerCase().replace(/[\s-]/g, '_');

  const config: Record<string, BadgeStyle> = {
    // Application statuses
    applied: {
      label: 'Applied',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />
    },
    viewed: {
      label: 'Viewed',
      bg: 'bg-sky-50',
      text: 'text-sky-800',
      border: 'border-sky-200',
      icon: <Eye className="w-3.5 h-3.5 mr-1 shrink-0 text-sky-600" />
    },
    under_review: {
      label: 'Under Review',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 shrink-0 text-blue-500 animate-pulse" />
    },
    shortlisted: {
      label: 'Shortlisted',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Award className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600" />
    },
    contacted: {
      label: 'Contacted',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      icon: <PhoneCall className="w-3.5 h-3.5 mr-1 shrink-0 text-indigo-600" />
    },
    interview: {
      label: 'Interview Scheduled',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <UserCheck className="w-3.5 h-3.5 mr-1 shrink-0 text-purple-600" />
    },
    selected: {
      label: 'Selected',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-600" />
    },
    hired: {
      label: 'Hired',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-600" />
    },
    rejected: {
      // Softer wording only for a driver's application; jobs and documents are "Rejected".
      label: kind === 'application' ? 'Not Selected' : 'Rejected',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <XCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-red-500" />
    },
    withdrawn: {
      label: 'Withdrawn',
      bg: 'bg-slate-100',
      text: 'text-slate-500',
      border: 'border-slate-200',
      icon: <AlertCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-400" />
    },

    // Job / account statuses
    active: {
      // "Active" says nothing about verification: an active driver account
      // is not necessarily verified. Live jobs have passed review.
      label: kind === 'job' ? 'Active & Verified' : 'Active',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-600" />
    },
    pending: {
      label: kind === 'document' ? 'Pending Review' : kind === 'user' ? 'Pending' : 'Pending Approval',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 shrink-0 text-amber-600" />
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <XCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-400" />
    },
    draft: {
      label: 'Draft',
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-400" />
    },

    // Verification & user statuses
    verified: {
      label: 'Verified',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0 text-emerald-600" />
    },
    blocked: {
      label: 'Blocked',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <XCircle className="w-3.5 h-3.5 mr-1 shrink-0 text-red-500" />
    },
    suspended: {
      label: 'Suspended',
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: <Ban className="w-3.5 h-3.5 mr-1 shrink-0 text-red-500" />
    },
  };

  const item = config[normalized] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: null
  };

  const sizeClass = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center font-medium rounded-md border whitespace-nowrap ${item.bg} ${item.text} ${item.border} ${sizeClass} transition-all`}>
      {item.icon}
      {t(item.label)}
    </span>
  );
};
