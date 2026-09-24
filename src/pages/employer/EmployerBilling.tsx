import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, Info, Phone, Download, CreditCard, Wallet, 
  Sparkles, ShieldCheck, Building2, X, Gift, Copy
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerSubscription, BillingTransaction } from '../../types';

export const EmployerBilling: React.FC = () => {
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.id || 'usr-employer-1';

  const [subscription, setSubscription] = useState<EmployerSubscription>(
    DataStore.getSubscription(employerId)
  );
  const [transactions, setTransactions] = useState<BillingTransaction[]>(
    DataStore.getBillingTransactions(employerId)
  );
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  // GSTIN Form
  const [gstinInput, setGstinInput] = useState(subscription.gstin);
  const [companyNameInput, setCompanyNameInput] = useState(subscription.billingCompanyName);
  const [addressInput, setAddressInput] = useState(subscription.billingAddress);
  const [toast, setToast] = useState<string | null>(null);

  const refreshData = () => {
    setSubscription(DataStore.getSubscription(employerId));
    setTransactions(DataStore.getBillingTransactions(employerId));
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('driverhub_storage_updated', refreshData);
    return () => window.removeEventListener('driverhub_storage_updated', refreshData);
  }, [employerId]);

  const handleSaveGstin = (e: React.FormEvent) => {
    e.preventDefault();
    DataStore.updateSubscription(employerId, {
      gstin: gstinInput.trim().toUpperCase(),
      billingCompanyName: companyNameInput.trim().toUpperCase(),
      billingAddress: addressInput.trim(),
      gstinVerified: true
    });
    setShowGstinModal(false);
    refreshData();
    setToast('GSTIN & Billing Profile updated and verified!');
    setTimeout(() => setToast(null), 3500);
  };

  const handlePurchasePlan = (name: string, amount: number, jobsAdd: number, dbAdd: number) => {
    DataStore.purchaseSubscriptionPlan(employerId, name, amount, jobsAdd, dbAdd);
    setShowPlansModal(false);
    refreshData();
    setToast(`Activated "${name}"! Added +${jobsAdd} Job Credits & +${dbAdd} Driver Unlocks.`);
    setTimeout(() => setToast(null), 4000);
  };

  const filteredTxns = transactions.filter(t => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Failed') return t.status === 'Failed' || t.status === 'Cancelled';
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#08233F] text-white rounded-2xl shadow-xl border border-slate-700 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">Billing</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your GSTIN billing profile, active fleet hiring subscription, and credit invoices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span>Job Credits: <strong className="text-emerald-700">{subscription.jobCredits}</strong></span>
            <span className="text-slate-300">|</span>
            <span>DB Unlocks: <strong className="text-blue-700">{subscription.dbUnlockCredits}</strong></span>
          </div>

          <button
            onClick={() => setShowPlansModal(true)}
            className="px-4 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Buy Credits / Upgrade Plan
          </button>
        </div>
      </div>

      {/* Billing Profile Card (Exact Match to Screenshot 8 `employer.apna.co/mon/billing/`) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2.5">
            <h2 className="text-base font-extrabold text-slate-900">Billing profile</h2>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">GSTIN:</span>
              <span className="text-slate-700 font-mono">{subscription.gstin}</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" /> Verified
              </span>
            </div>

            <div className="text-xs">
              <span className="font-bold text-slate-800">Company name: </span>
              <span className="text-slate-700">{subscription.billingCompanyName}</span>
            </div>

            <div className="text-xs max-w-2xl leading-relaxed">
              <span className="font-bold text-slate-800">Address: </span>
              <span className="text-slate-600">{subscription.billingAddress}</span>
            </div>
          </div>

          <button
            onClick={() => setShowGstinModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs shrink-0 self-start cursor-pointer"
          >
            Update GSTIN / ISD-GSTIN
          </button>
        </div>
      </div>

      {/* Yellow ISD-GSTIN Info Banner (Exact Match to Screenshot 8) */}
      <div className="bg-[#FEF9E7] border border-amber-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-800">
          <Info className="w-4 h-4 text-slate-700 shrink-0" />
          <span>If you're registered with ISD-GSTIN, kindly update your GSTIN accordingly.</span>
        </div>
        <button
          onClick={() => setShowGstinModal(true)}
          className="text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 text-left cursor-pointer"
        >
          Update GSTIN / ISD-GSTIN
        </button>
      </div>

      {/* Billing History Card & Table (Exact Match to Screenshot 8) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-slate-900">Billing History</h2>
            <span className="text-xs text-slate-500">
              Active Plan: <strong className="text-emerald-700">{subscription.planName}</strong>
            </span>
          </div>

          {/* Filter Pills (All | Success | Pending | Failed) */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Success', 'Pending', 'Failed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Plan details</th>
                <th className="py-3.5 px-6">Applies until</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredTxns.map(txn => (
                <tr key={txn.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="font-semibold text-slate-800">{txn.date}</div>
                    <div className="text-[11px] text-slate-500">{txn.time}</div>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => setShowPlansModal(true)}
                      className="font-semibold text-slate-800 underline hover:text-blue-700 text-left cursor-pointer"
                    >
                      {txn.planDetails}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-slate-600 whitespace-nowrap">{txn.appliesUntil}</td>
                  <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                    ₹ {txn.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    {txn.status === 'Success' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Success
                      </span>
                    ) : txn.status === 'Pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Cancelled
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" /> Contact us
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE GSTIN MODAL */}
      {showGstinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGstin}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#08233F]">Update GSTIN / Billing Profile</h3>
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">15-Digit GSTIN / ISD-GSTIN *</label>
              <input
                type="text"
                required
                value={gstinInput}
                onChange={e => setGstinInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registered Legal Company Name *</label>
              <input
                type="text"
                required
                value={companyNameInput}
                onChange={e => setCompanyNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Billing Address *</label>
              <textarea
                rows={3}
                required
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Verify & Save GSTIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBSCRIPTION PLANS & CREDIT PACKAGES MODAL */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold">
                  DriverHub Fleet Hiring Plans
                </span>
                <h3 className="text-xl font-extrabold text-[#08233F] mt-1">
                  Choose a Job Credit & Driver Database Plan
                </h3>
                <p className="text-xs text-slate-500">
                  Instant activation • Unlock verified driver phone numbers & publish high-visibility vacancies
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Plan 1 */}
              <div className="p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500">Starter Package</span>
                  <h4 className="text-base font-extrabold text-slate-900">2 Job Credit Package</h4>
                  <div className="text-2xl font-extrabold text-[#08233F]">₹ 1,651</div>
                  <p className="text-[11px] text-slate-500">Inclusive of 18% GST</p>
                  <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                    <li>✓ 2 Active Driver Job Postings</li>
                    <li>✓ 50 Driver Database Unlocks</li>
                    <li>✓ Excel Candidate Export</li>
                    <li>✓ 30 Days Validity</li>
                  </ul>
                </div>
                <button
                  onClick={() => handlePurchasePlan('2 Job Credit Package', 1651, 2, 50)}
                  className="w-full py-2.5 bg-[#08233F] hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Activate Starter Plan
                </button>
              </div>

              {/* Plan 2 */}
              <div className="p-5 rounded-2xl border-2 border-emerald-600 bg-emerald-50/20 flex flex-col justify-between space-y-5 relative">
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                  Best Value
                </span>
                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700">Fleet Growth</span>
                  <h4 className="text-base font-extrabold text-slate-900">10 Jobs + 200 Driver Unlocks</h4>
                  <div className="text-2xl font-extrabold text-emerald-800">₹ 4,999</div>
                  <p className="text-[11px] text-slate-500">Inclusive of 18% GST</p>
                  <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                    <li>✓ 10 Instant Live Job Postings</li>
                    <li>✓ 200 Driver Phone Unlocks</li>
                    <li>✓ Priority HMV / LMV Matching</li>
                    <li>✓ 90 Days Validity</li>
                  </ul>
                </div>
                <button
                  onClick={() =>
                    handlePurchasePlan('Enterprise Fleet Pass (10 Job Credits + 200 Driver Unlocks)', 4999, 10, 200)
                  }
                  className="w-full py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  Activate Growth Plan
                </button>
              </div>

              {/* Plan 3 */}
              <div className="p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-amber-700">Enterprise Logistics</span>
                  <h4 className="text-base font-extrabold text-slate-900">25 Jobs + 600 Driver Unlocks</h4>
                  <div className="text-2xl font-extrabold text-[#08233F]">₹ 11,999</div>
                  <p className="text-[11px] text-slate-500">Inclusive of 18% GST</p>
                  <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                    <li>✓ 25 Multi-City Driver Vacancies</li>
                    <li>✓ 600 Driver Database Unlocks</li>
                    <li>✓ Dedicated Account Manager</li>
                    <li>✓ 1 Year Validity</li>
                  </ul>
                </div>
                <button
                  onClick={() =>
                    handlePurchasePlan('Enterprise Annual Fleet Subscription (25 Jobs + 600 Unlocks)', 11999, 25, 600)
                  }
                  className="w-full py-2.5 bg-[#08233F] hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Activate Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
