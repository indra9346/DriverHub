import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, MessageSquare, ShieldAlert } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Driver Support Query',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold text-brand-amber uppercase tracking-wider">Get in Touch</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-navy font-display tracking-tight">
          We're Here to Help Drivers & Fleets 24/7
        </h1>
        <p className="text-sm text-slate-600">
          Have questions about job listings, RTO verification, or enterprise fleet hiring? Reach out to our dedicated support desk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact Info Col */}
        <div className="lg:col-span-5 bg-brand-navy text-white p-8 rounded-2xl space-y-6 shadow-elevated relative overflow-hidden">
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-display text-white">Central Operations & Helpdesk</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our national dispatch & verification desk is based in Bengaluru with regional support coordinators across South and Western India.
            </p>
          </div>

          <div className="space-y-4 text-xs text-slate-200">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-amber shrink-0 mt-0.5" />
              <span>Driver Hub HQ, 2nd Floor, Phase 1, Electronic City, Bengaluru - 560100</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-brand-amber shrink-0" />
              <a href="tel:+918022008899" className="hover:text-white font-semibold">
                +91 80 2200 8899 (Toll Free Helpline)
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-brand-amber shrink-0" />
              <a href="mailto:support@driverhub.in" className="hover:text-white">
                support@driverhub.in
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-brand-amber shrink-0" />
              <span>Monday - Saturday (9:00 AM - 7:00 PM IST)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-1">
            <div className="flex items-center gap-1.5 text-brand-amber text-xs font-bold">
              <ShieldAlert className="w-4 h-4" /> 24/7 Highway Emergency Assistance
            </div>
            <p className="text-[11px] text-slate-300">For verified drivers currently on interstate transit routes: <span className="font-bold text-white">+91 99000 88776</span></p>
          </div>
        </div>

        {/* Form Col */}
        <div className="lg:col-span-7 bg-white p-8 rounded-2xl border border-slate-200 shadow-card">
          {submitted ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-xl font-bold text-brand-navy font-display">Inquiry Received!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Thank you for contacting Driver Hub. A support specialist will review your request and respond within 2 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 bg-brand-navy hover:bg-brand-navy-light text-white text-xs font-bold rounded-xl transition-all"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ravi Kumar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ravi@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Inquiry Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
                  >
                    <option value="Driver Support Query">Driver Support Query</option>
                    <option value="Employer Fleet Hiring">Employer Fleet Hiring</option>
                    <option value="Document Verification Help">Document Verification Help</option>
                    <option value="Report Listing Issue">Report Listing Issue</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can our recruitment team assist you today?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber focus:bg-white transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-navy hover:bg-brand-navy-light text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-brand-amber" /> Send Inquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
