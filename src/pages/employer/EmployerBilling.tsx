import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle2, Info, Phone, Sparkles, Wallet, X 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerSubscription, BillingTransaction } from '../../types';
import { SupabaseSync } from '../../services/supabaseSync';
import { useLanguage } from '../../services/i18n';

export const EmployerBilling: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';

  const [subscription, setSubscription] = useState<EmployerSubscription>(
    DataStore.getSubscription(employerId)
  );
  const [transactions, setTransactions] = useState<BillingTransaction[]>(
    DataStore.getBillingTransactions(employerId)
  );
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; amount: number; jobs: number; drivers: number; validity: string; days: number; slots: number } | null>(null);
  const demoCheckoutAvailable = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_CHECKOUT === 'true';

  // GSTIN Form
  const [gstinInput, setGstinInput] = useState(subscription.gstin);
  const [companyNameInput, setCompanyNameInput] = useState(subscription.billingCompanyName);
  const [addressInput, setAddressInput] = useState(subscription.billingAddress);
  const [toast, setToast] = useState<string | null>(null);
  const [savingBilling, setSavingBilling] = useState(false);

  const refreshData = () => {
    setSubscription(DataStore.getSubscription(employerId));
    setTransactions(DataStore.getBillingTransactions(employerId));
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('driverhub_storage_updated', refreshData);
    return () => window.removeEventListener('driverhub_storage_updated', refreshData);
  }, [employerId]);

  const handleSaveGstin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBilling(true);
    const billing = {
      gstin: gstinInput.trim().toUpperCase(),
      billingCompanyName: companyNameInput.trim(),
      billingAddress: addressInput.trim()
    };
    const saved = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'
      ? (DataStore.updateSubscription(employerId, billing), true)
      : await SupabaseSync.updateEmployerBillingProfile(employerId, billing);
    if (!saved) {
      setSavingBilling(false);
      setToast('Billing profile could not be saved. Check your connection and try again.');
      return;
    }
    if (!(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true')) {
      await SupabaseSync.fetchAndMergeRemoteData(DataStore);
    }
    setShowGstinModal(false);
    refreshData();
    setSavingBilling(false);
    setToast('Billing profile saved. GSTIN verification is pending administrator review.');
    setTimeout(() => setToast(null), 3500);
  };

  const selectPlan = (name: string, amount: number, jobs: number, drivers: number, validity: string, days: number, slots = 0) =>
    setSelectedPlan({ name, amount, jobs, drivers, validity, days, slots });

  const activateDemoPlan = () => {
    if (!selectedPlan || !demoCheckoutAvailable) return;
    const activated = DataStore.activateDemoPlan(employerId, selectedPlan.name, selectedPlan.amount,
      selectedPlan.jobs, selectedPlan.drivers, selectedPlan.days, selectedPlan.slots);
    if (!activated) return;
    setToast('Development demo plan activated. This is not a payment or production entitlement.');
    setShowPlansModal(false);
    setSelectedPlan(null);
    refreshData();
    setTimeout(() => setToast(null), 4500);
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
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">{t('billing')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('billingDesc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span>{t('jobCredits')}: <strong className="text-emerald-700">{subscription.jobCredits}</strong></span>
            <span className="text-slate-300">|</span>
            <span>{t('dbUnlocks')}: <strong className="text-blue-700">{subscription.dbUnlockCredits}</strong></span>
          </div>

          <button
            onClick={() => setShowPlansModal(true)}
            className="px-4 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {t('buyCreditsUpgrade')}
          </button>
        </div>
      </div>

      {/* Billing Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2.5">
            <h2 className="text-base font-extrabold text-slate-900">{t('billingProfile')}</h2>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-800">GSTIN:</span>
              <span className="text-slate-700 font-mono">{subscription.gstin}</span>
              <span className={`inline-flex items-center gap-1 font-bold ${subscription.gstinVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                {subscription.gstinVerified ? <><CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" /> {t('verified')}</> : t('verificationPending')}
              </span>
            </div>

            <div className="text-xs">
              <span className="font-bold text-slate-800">{t('companyName')}: </span>
              <span className="text-slate-700">{subscription.billingCompanyName}</span>
            </div>

            <div className="text-xs max-w-2xl leading-relaxed">
              <span className="font-bold text-slate-800">{t('address')}: </span>
              <span className="text-slate-600">{subscription.billingAddress}</span>
            </div>
          </div>

          <button
            onClick={() => setShowGstinModal(true)}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs shrink-0 self-start cursor-pointer"
          >
            {t('updateGstin')}
          </button>
        </div>
      </div>

      {/* Yellow ISD-GSTIN Info Banner */}
      <div className="bg-[#FEF9E7] border border-amber-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-800">
          <Info className="w-4 h-4 text-slate-700 shrink-0" />
          <span>{t('isdGstinNotice')}</span>
        </div>
        <button
          onClick={() => setShowGstinModal(true)}
          className="text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 text-left cursor-pointer"
        >
          {t('updateGstin')}
        </button>
      </div>

      {/* Billing History Card & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-slate-900">{t('billingHistory')}</h2>
            <span className="text-xs text-slate-500">
              {t('activePlan')}: <strong className="text-emerald-700">{subscription.planName}</strong>
            </span>
          </div>

          {/* Filter Pills */}
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
                {tab === 'All' ? t('all') : tab === 'Success' ? t('success') : tab === 'Pending' ? t('pending') : t('rejected')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                <th className="py-3.5 px-6">{t('date')}</th>
                <th className="py-3.5 px-6">{t('planDetails')}</th>
                <th className="py-3.5 px-6">{t('appliesUntil')}</th>
                <th className="py-3.5 px-6">{t('amount')}</th>
                <th className="py-3.5 px-6">{t('status')}</th>
                <th className="py-3.5 px-6">{t('action')}</th>
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
                        {t('success')}
                      </span>
                    ) : txn.status === 'Pending' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {t('pending')}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {t('rejected')}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-bold"
                      >
                        <Phone className="w-3.5 h-3.5" /> {t('contactUs')}
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
              <h3 className="text-lg font-extrabold text-[#08233F]">{t('updateGstin')}</h3>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('companyName')} *</label>
              <input
                type="text"
                required
                value={companyNameInput}
                onChange={e => setCompanyNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('address')} *</label>
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
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingBilling}
                className="px-5 py-2 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {savingBilling ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBSCRIPTION PLANS & CREDIT PACKAGES MODAL */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold">
                  {t('driverHubHiringPlans')}
                </span>
                <h3 className="text-xl font-extrabold text-[#08233F] mt-1">
                  {t('everythingToHireDrivers')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('chooseCreditsOrSubscription')}
                </p>
              </div>
              <button
                onClick={() => setShowPlansModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { name: `3 ${t('jobCredits')}`, amount: 1949, jobs: 3, drivers: 0, days: 30, old: 2097, detail: t('idealForSmallTeams') },
                { name: `6 ${t('jobCredits')}`, amount: 3649, jobs: 6, drivers: 0, days: 90, old: 4194, detail: t('forGrowingFleets'), recommended: true },
                { name: `13 ${t('jobCredits')}`, amount: 7099, jobs: 13, drivers: 0, days: 180, old: 9087, detail: t('forLargerNeeds') },
                { name: 'DriverHub Unlimited', amount: 5999, jobs: 0, drivers: 600, days: 90, detail: t('quarterlyPlanSingleCity') },
              ].map(plan => (
                <section key={plan.name} className={`relative p-5 rounded-2xl border flex flex-col justify-between gap-5 ${plan.recommended ? 'border-emerald-600 bg-emerald-50/30' : 'border-slate-200'}`}>
                  {plan.recommended && <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">{t('recommended')}</span>}
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-900">{plan.name}</h4>
                    <p className="text-xs text-slate-500">{plan.detail}</p>
                    <div className="text-2xl font-extrabold text-[#08233F]">₹{plan.amount.toLocaleString('en-IN')}</div>
                    {'old' in plan && <p className="text-[11px] text-slate-500 line-through">₹{plan.old.toLocaleString('en-IN')} {t('listPrice')}</p>}
                    <p className="text-[11px] text-slate-500">{t('validForDays', { days: plan.days })} · {t('gstAddedAtCheckout')}</p>
                    <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                      {plan.jobs > 0 && <li>✓ {plan.jobs} {t('driverJobCreditsDesc')}</li>}
                      {plan.drivers > 0 && <><li>✓ 1 {t('activeSlot90Days')}</li><li>✓ {plan.drivers} {t('driverDbCreditsDesc')}</li></>}
                      {plan.jobs > 0 && <li>✓ {t('chooseJobType')}</li>}
                      <li>✓ {t('driverAppsFollowUp')}</li>
                    </ul>
                  </div>
                  <button onClick={() => selectPlan(plan.name, plan.amount, plan.jobs, plan.drivers, `${t('validFor')} ${plan.days} ${t('days')}`, plan.days, plan.jobs === 0 ? 1 : 0)} className="w-full py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs cursor-pointer">{t('viewOrder')}</button>
                </section>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div><strong className="text-slate-900">{t('needSingleCredit')}</strong><p className="text-slate-600 mt-0.5">{t('contactForOneCredit')}</p></div>
              <Link to="/contact" onClick={() => setShowPlansModal(false)} className="font-bold text-emerald-700 shrink-0">{t('contactSales')} →</Link>
            </div>
            <p className="text-xs text-slate-500">{t('creditUsageInfo')}</p>
            <section className="grid md:grid-cols-2 gap-6 border-t border-slate-200 pt-5">
              <div><h4 className="font-bold text-slate-900">{t('needCustomPlan')}</h4><p className="text-xs text-slate-600 mt-1">{t('tellAboutLocations')}</p><Link to="/contact" onClick={() => setShowPlansModal(false)} className="inline-block mt-3 text-sm font-bold text-emerald-700">{t('contactSales')} →</Link></div>
              <div><h4 className="font-bold text-slate-900">{t('faqs')}</h4><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t('faqCreditsWork')}</summary><p className="mt-1">{t('faqCreditsAnswer')}</p></details><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t('faqMoreCandidates')}</summary><p className="mt-1">{t('faqMoreCandidatesAnswer')}</p></details></div>
            </section>
            {selectedPlan && <aside className="rounded-2xl bg-slate-50 border border-slate-200 p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div><h4 className="font-bold text-slate-900">{t('orderSummary')} · {selectedPlan.name}</h4><p className="text-xs text-slate-600 mt-1">{selectedPlan.jobs ? `${selectedPlan.jobs} ${t('jobCredits')}` : `${selectedPlan.drivers} ${t('dbUnlocks')}`} · {selectedPlan.validity}</p><div className="text-xs text-slate-600 mt-3 space-y-1"><p>{t('subtotal')} <span className="float-right">₹{selectedPlan.amount.toLocaleString('en-IN')}</span></p><p>GST (18%) <span className="float-right">₹{Math.round(selectedPlan.amount * 0.18).toLocaleString('en-IN')}</span></p><p className="font-extrabold text-slate-900 border-t border-slate-200 pt-2">{t('totalInclGst')} <span className="float-right">₹{Math.round(selectedPlan.amount * 1.18).toLocaleString('en-IN')}</span></p></div></div>
              <div className="text-right">{demoCheckoutAvailable ? <><p className="text-xs text-amber-800 font-semibold">{t('devTestCheckout')}</p><p className="text-[11px] text-slate-500 mt-1">{t('noRealPaymentDemo')}</p><button onClick={activateDemoPlan} className="mt-3 px-5 py-2.5 rounded-xl bg-[#19745B] text-white text-xs font-bold">{t('activateDemoPlan')}</button></> : <><p className="text-xs text-amber-800 font-semibold">{t('onlineCheckoutPending')}</p><p className="text-[11px] text-slate-500 mt-1">{t('noPaymentTaken')}</p><button disabled className="mt-3 px-5 py-2.5 rounded-xl bg-slate-300 text-slate-600 text-xs font-bold cursor-not-allowed">{t('proceedToPayment')}</button></>}</div>
            </aside>}
          </div>
        </div>
      )}
    </div>
  );
};
