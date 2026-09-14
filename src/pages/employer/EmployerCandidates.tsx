import React, { useState, useEffect } from 'react';
import { 
  Users, Search, MapPin, Award, ShieldCheck, Phone, 
  Mail, Briefcase, IndianRupee, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { DriverProfile, DriverCategory } from '../../types';
import { CandidateCard } from '../../components/common/CandidateCard';

export const EmployerCandidates: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  useEffect(() => {
    // Only active verified drivers in talent pool
    const pool = DataStore.getDrivers().filter(d => d.status === 'active');
    setDrivers(pool);
  }, []);

  const filtered = drivers.filter(d => {
    const matchesSearch = 
      !search ||
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.driverCategory.toLowerCase().includes(search.toLowerCase()) ||
      d.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = !categoryFilter || d.driverCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy font-display">Driver Talent Pool</h1>
          <p className="text-xs text-slate-500 mt-1">Discover certified, verified commercial and private drivers available for hiring</p>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-card flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name, city, skills..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-56 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
        >
          <option value="">All Driver Categories</option>
          <option value="HMV">Heavy Motor Vehicle (HMV)</option>
          <option value="LMV">Light Motor Vehicle (LMV)</option>
          <option value="Cab Driver">Cab / Taxi Driver</option>
          <option value="Delivery Driver">Delivery Driver</option>
          <option value="Bus Driver">School & Passenger Bus</option>
          <option value="Trailer Driver">Trailer Truck</option>
          <option value="Tempo Driver">Tempo Driver</option>
        </select>
      </div>

      {/* Drivers Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-card space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-brand-navy font-display">No candidates found</h3>
          <p className="text-xs text-slate-500">Try broadening your search query or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((driver) => (
            <CandidateCard
              key={driver.id}
              driver={driver}
              onSelect={(d) => setSelectedDriver(d)}
            />
          ))}
        </div>
      )}

      {/* Selected Driver Detailed Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
                  {selectedDriver.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    {selectedDriver.fullName}
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </h3>
                  <p className="text-xs text-slate-500">{selectedDriver.driverCategory} • {selectedDriver.experienceYears} Yrs Exp</p>
                </div>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="text-slate-400 hover:text-slate-900">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Phone:</span>
                <a href={`tel:${selectedDriver.phone}`} className="font-bold text-blue-600 hover:underline">{selectedDriver.phone}</a>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="font-medium text-slate-900">{selectedDriver.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location:</span>
                <span className="font-medium text-slate-900">{selectedDriver.location}, {selectedDriver.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">License Type:</span>
                <span className="font-medium text-slate-900">{selectedDriver.licenseType}</span>
              </div>
              {selectedDriver.expectedSalary && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Pay:</span>
                  <span className="font-bold text-emerald-700">₹{selectedDriver.expectedSalary.toLocaleString('en-IN')} / mo</span>
                </div>
              )}
            </div>

            {selectedDriver.bio && (
              <div className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                "{selectedDriver.bio}"
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600"
              >
                Close
              </button>
              <a
                href={`tel:${selectedDriver.phone}`}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call Driver Directly
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
