import { supabase } from './supabaseClient';
import { Job, Application, DriverProfile, EmployerProfile, User, Notification } from '../types';

// Helper to convert any string ID to a valid deterministic UUID
export function toUUID(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  // Create a reproducible 32-char hex string from input
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const tail = '0000-4000-8000-' + hex.padStart(12, '0');
  return `00000000-${tail}`;
}

export const SupabaseSync = {
  // Sync a single job to Supabase
  async syncJob(job: Job, _employer?: EmployerProfile): Promise<boolean> {
    try {
      if (!job.employerId) return false;
      const employerUUID = toUUID(job.employerId);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true');
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
      const isAdmin = currentProfile?.role === 'admin';
      if (authData.user.id !== employerUUID && !isAdmin) return false;
      const { data: company } = await supabase.from('companies').select('id').eq('user_id', employerUUID).maybeSingle();
      if (!company && !isAdmin) return false;

      const payload = {
        id: toUUID(job.id),
        employer_id: employerUUID,
        company_id: company?.id || null,
        title: job.title,
        category: job.category,
        location: job.location,
        city: job.city || 'Bengaluru',
        state: job.state || 'Karnataka',
        experience_required: job.experienceRequired,
        experience_min_years: job.experienceMinYears || 2,
        salary_min: job.salaryMin || 25000,
        salary_max: job.salaryMax || 35000,
        salary_type: job.salaryType || 'monthly',
        working_hours: job.workingHours || 'Full-time',
        employment_type: job.employmentType || 'Full-time',
        description: job.description,
        required_skills: job.requiredSkills || [],
        required_docs: job.requiredDocs || [],
        pay_type: job.payType || 'Fixed Only',
        perks: job.perks || [],
        night_shift: Boolean(job.nightShift),
        vehicle_type: job.vehicleType || null,
        work_location_type: job.workLocationType || 'Work From Depot / Office',
        joining_fee_required: Boolean(job.joiningFeeRequired),
        screening_questions: job.screeningQuestions || [],
        vacancies: job.vacancies || 1,
        application_deadline: job.applicationDeadline || null,
        status: job.status || 'pending'
      };
      const { data: existing } = await supabase.from('jobs').select('id').eq('id', payload.id).maybeSingle();
      if (isAdmin && !existing) return false;
      const result = existing
        ? await supabase.from('jobs').update(payload).eq('id', payload.id)
        : await supabase.from('jobs').insert(payload);
      const error = result.error;

      if (error) {
        console.warn('Supabase syncJob error:', error.message);
        return false;
      } else {
        return true;
      }
    } catch (e) {
      console.warn('Failed to sync job to Supabase:', e);
      return false;
    }
  },

  // Sync an application to Supabase
  async syncApplication(app: Application) {
    try {
      const driverUUID = toUUID(app.driverId);
      const jobUUID = toUUID(app.jobId);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true');
      if (authData.user.id !== driverUUID) return false;

      const { error } = await supabase.from('applications').upsert({
        id: toUUID(app.id),
        job_id: jobUUID,
        driver_id: driverUUID,
        cover_message: app.coverMessage || '',
        resume_url: app.resumeUrl || null,
        status: app.status || 'applied',
        applied_date: app.appliedDate || new Date().toISOString().slice(0, 10),
      }, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase syncApplication error:', error.message);
        return false;
      } else {
        return true;
      }
    } catch (e) {
      console.warn('Failed to sync application to Supabase:', e);
      return false;
    }
  },

  // Register and sync new user to Supabase
  async registerUser(user: User, profileData?: DriverProfile | EmployerProfile) {
    try {
      const userUUID = toUUID(user.id);
      const { data: authData } = await supabase.auth.getUser();
      // Public profile writes are only allowed for the signed-in owner. Demo/local users never sync.
      if (!authData.user || authData.user.id !== userUUID) return;
      const fullName = (profileData as DriverProfile)?.fullName || (profileData as EmployerProfile)?.contactPerson || user.email.split('@')[0];
      const phone = user.phone || (profileData as DriverProfile)?.phone || (profileData as EmployerProfile)?.phone || null;
      const city = (profileData as DriverProfile)?.city || (profileData as EmployerProfile)?.city || (profileData as DriverProfile)?.location || null;
      const state = (profileData as DriverProfile)?.state || (profileData as EmployerProfile)?.state || null;
      const location = (profileData as DriverProfile)?.location || (city && state ? `${city}, ${state}` : city) || null;
      
      // Upsert into profiles so newly registered users are guaranteed a row even if trigger didn't run
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userUUID,
        role: user.role,
        full_name: fullName,
        email: user.email.trim().toLowerCase(),
        phone: phone,
        city: city,
        state: state,
        location: location,
        status: 'active',
      }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Supabase profiles upsert notice:', profileError.message);
      } else {
        console.log('✅ Supabase public.profiles record created for:', user.email);
      }

      // 3. Upsert driver_profiles or companies tables
      if (user.role === 'driver' && profileData) {
        const dp = profileData as DriverProfile;
        const { error: drvError } = await supabase.from('driver_profiles').upsert({
          id: userUUID,
          user_id: userUUID,
          driver_category: dp.driverCategory || null,
          years_experience: dp.experienceYears || 0,
          license_number: dp.licenseNumber || null,
          license_type: dp.licenseType || null,
          license_expiry: dp.licenseExpiry || null,
          skills: dp.skills || [],
          preferred_location: dp.preferredLocation || dp.location || dp.city || null,
          expected_salary: dp.expectedSalary || null,
          availability: dp.availability || 'Flexible',
          bio: dp.bio || null
        }, { onConflict: 'user_id' });

        if (drvError) console.warn('Supabase driver_profiles upsert notice:', drvError.message);
      } else if (user.role === 'employer' && profileData) {
        const ep = profileData as EmployerProfile;
        const { error: compError } = await supabase.from('companies').upsert({
          id: userUUID,
          user_id: userUUID,
          company_name: ep.companyName || fullName,
          contact_person: ep.contactPerson || null,
          email: ep.email || user.email,
          phone: ep.phone || user.phone,
          industry: ep.industry || null,
          location: ep.location || location,
          city: ep.city || city,
          state: ep.state || state,
          verified: ep.verified,
          status: ep.verified ? 'active' : 'pending'
        }, { onConflict: 'user_id' });

        if (compError) console.warn('Supabase companies upsert notice:', compError.message);

        // Ensure starter subscription exists for the employer
        try {
          await supabase.from('employer_subscriptions').upsert({
            id: userUUID,
            employer_id: userUUID,
            plan_name: 'Starter Fleet Hiring Plan (4 Job Credits + 50 Driver Unlocks)',
            job_credits: 4,
            db_unlock_credits: 50,
            total_job_credits: 5,
            total_db_unlock_credits: 50,
            active_job_slots: 2,
            status: 'active',
            expires_at: new Date(Date.now() + 90 * 86400000).toISOString()
          }, { onConflict: 'employer_id' });
        } catch {
          // Ignore if exists
        }
      }
      console.log('✅ Registered user fully synced to Supabase tables:', user.email);
    } catch (e) {
      console.warn('Supabase registerUser error:', e);
    }
  },

  // Update user status (active/blocked) in Supabase
  async syncUserStatus(userId: string, status: 'active' | 'blocked' | 'pending' | 'suspended') {
    try {
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) return;
      const { data: actor } = await supabase.from('profiles').select('role').eq('id', current.user.id).maybeSingle();
      if (actor?.role !== 'admin') return;
      const userUUID = toUUID(userId);
      await supabase.from('profiles').update({ status }).eq('id', userUUID);
    } catch (e) {
      console.warn('syncUserStatus error:', e);
    }
  },

  async syncEmployerVerification(employerId: string, verified: boolean) {
    try {
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) return;
      const { error } = await supabase.from('companies').update({ verified, status: verified ? 'active' : 'pending' }).eq('user_id', toUUID(employerId));
      if (error) console.warn('syncEmployerVerification error:', error.message);
    } catch (e) {
      console.warn('syncEmployerVerification error:', e);
    }
  },

  // Update application status in Supabase
  async syncApplicationStatus(appId: string, status: string, options?: { employerNotes?: string; interviewDate?: string; interviewMode?: string; interviewLocation?: string }): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true');
      const appUUID = toUUID(appId);
      const { error } = await supabase.from('applications').update({
        status,
        employer_notes: options?.employerNotes,
        interview_date: options?.interviewDate,
        updated_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString()
      }).eq('id', appUUID);
      return !error;
    } catch (e) {
      console.warn('syncApplicationStatus error:', e);
      return false;
    }
  },

  // Initialize Realtime WebSocket subscriptions
  initRealtimeListeners(onUpdate?: () => void) {
    try {
      const channel = supabase
        .channel('driverhub_live_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
          console.log('⚡ Realtime Jobs Update from Supabase:', payload);
          if (onUpdate) onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, (payload) => {
          console.log('⚡ Realtime Applications Update from Supabase:', payload);
          if (onUpdate) onUpdate();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          console.log('⚡ Realtime Profiles Update from Supabase:', payload);
          if (onUpdate) onUpdate();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime subscription setup:', e);
    }
  },

  async syncSubscription(sub: import('../types').EmployerSubscription) {
    try {
      const empUUID = toUUID(sub.employerId);
      await supabase.from('employer_subscriptions').upsert({
        id: empUUID,
        employer_id: empUUID,
        plan_name: sub.planName,
        job_credits: sub.jobCredits,
        db_unlock_credits: sub.dbUnlockCredits,
        total_job_credits: sub.totalJobCredits,
        total_db_unlock_credits: sub.totalDbUnlockCredits,
        gstin: sub.gstin,
        gstin_verified: sub.gstinVerified,
        billing_company_name: sub.billingCompanyName,
        billing_address: sub.billingAddress,
        status: sub.status
      }, { onConflict: 'employer_id' });
    } catch (e) {
      console.warn('syncSubscription error:', e);
    }
  },

  async syncBillingTransaction(txn: import('../types').BillingTransaction) {
    try {
      const empUUID = toUUID(txn.employerId);
      await supabase.from('billing_transactions').upsert({
        id: toUUID(txn.id),
        employer_id: empUUID,
        plan_details: txn.planDetails,
        applies_until: txn.appliesUntil,
        amount: txn.amount,
        status: txn.status,
        invoice_id: txn.invoiceId || 'INV-DH-2026',
        job_credits_added: txn.jobCreditsAdded || 0,
        db_credits_added: txn.dbCreditsAdded || 0
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('syncBillingTransaction error:', e);
    }
  },

  async syncCandidateUnlock(unlock: import('../types').CandidateUnlock) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true');
      if (authData.user.id !== toUUID(unlock.employerId)) return false;
      const { error } = await supabase.from('candidate_unlocks').upsert({
        id: toUUID(unlock.id),
        employer_id: toUUID(unlock.employerId),
        driver_id: toUUID(unlock.driverId),
        downloaded_excel: unlock.downloadedExcel || false
      }, { onConflict: 'employer_id,driver_id' });
      return !error;
    } catch (e) {
      console.warn('syncCandidateUnlock error:', e);
      return false;
    }
  },

  async syncSavedSearch(search: import('../types').SavedSearch) {
    try {
      await supabase.from('saved_searches').upsert({
        id: toUUID(search.id),
        employer_id: toUUID(search.employerId),
        title: search.title,
        category: search.category,
        city: search.city,
        min_exp: search.minExp,
        must_have_skills: search.mustHaveSkills || [],
        match_count: search.matchCount || 10
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('syncSavedSearch error:', e);
    }
  },

  async syncDirectMessage(msg: import('../types').DirectMessage) {
    try {
      await supabase.from('direct_messages').upsert({
        id: toUUID(msg.id),
        sender_id: toUUID(msg.senderId),
        receiver_id: toUUID(msg.receiverId),
        job_id: msg.jobId ? toUUID(msg.jobId) : null,
        text: msg.text,
        read: msg.read || false
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('syncDirectMessage error:', e);
    }
  },

  // Fetch public active driver vacancies plus records the authenticated user is allowed to see.
  async fetchAndMergeRemoteData(dataStore: any) {
    try {
      const { data: authResult } = await supabase.auth.getUser();
      const authUser = authResult.user;
      const current = dataStore.getCurrentUser();
      const role = authUser ? current?.id === authUser.id ? current.role : null : null;
      let profile: any = null;
      if (authUser && role) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        profile = data;
        if (profile) dataStore.addUser({
          id: authUser.id, email: profile.email || authUser.email || '', role: profile.role,
          status: profile.status === 'suspended' ? 'blocked' : profile.status || 'active',
          phone: profile.phone || '', createdAt: profile.created_at?.slice(0, 10) || ''
        });
      }

      const { data: jobRows, error: jobError } = await supabase.from('jobs').select('*').order('posted_date', { ascending: false });
      if (jobError) throw jobError;
      const rows = jobRows || [];
      const companyIds = [...new Set(rows.map((r: any) => r.company_id).filter(Boolean))];
      const { data: companies } = companyIds.length
        ? await supabase.from('companies').select('*').in('id', companyIds)
        : { data: [] as any[] };
      const companyById = new Map((companies || []).map((company: any) => [company.id, company]));
      const jobs: Job[] = rows.map((row: any) => {
        const company = companyById.get(row.company_id) as any;
        return {
          id: row.id, employerId: row.employer_id, companyName: company?.company_name || 'Verified employer',
          companyLogo: company?.logo_url || undefined, postedBy: company?.contact_person || undefined,
          title: row.title, category: row.category, location: row.location, city: row.city || '', state: row.state || '',
          experienceRequired: row.experience_required || '', experienceMinYears: row.experience_min_years || 0,
          salaryMin: row.salary_min || 0, salaryMax: row.salary_max || 0, salaryType: row.salary_type || 'monthly',
          workingHours: row.working_hours || '', employmentType: row.employment_type || 'Full-time',
          description: row.description || '', requiredSkills: row.required_skills || [], requiredDocs: row.required_docs || [],
          vacancies: row.vacancies || 1, status: row.status, postedDate: row.posted_date || '',
          applicationDeadline: row.application_deadline || undefined, applicationsCount: 0,
          creditConsumed: Boolean(row.credit_consumed), slotConsumed: Boolean(row.slot_consumed),
          expiresAt: row.expires_at || undefined
        };
      });
      dataStore.mergeRemoteJobs(jobs);

      if (authUser && role) {
        let appQuery = supabase.from('applications').select('*');
        if (role === 'driver') appQuery = appQuery.eq('driver_id', authUser.id);
        else if (role === 'employer') {
          const ownJobIds = rows.filter((row: any) => row.employer_id === authUser.id).map((row: any) => row.id);
          if (ownJobIds.length) appQuery = appQuery.in('job_id', ownJobIds);
          else appQuery = appQuery.in('job_id', ['00000000-0000-0000-0000-000000000000']);
        }
        const { data: appRows, error: appError } = await appQuery.order('applied_date', { ascending: false });
        if (appError) throw appError;
        const driverIds = [...new Set((appRows || []).map((row: any) => row.driver_id))];
        const { data: driverRows } = driverIds.length
          ? await supabase.from('profiles').select('id,full_name,email,phone,city').in('id', driverIds)
          : { data: [] as any[] };
        const profileById = new Map((driverRows || []).map((row: any) => [row.id, row]));
        const jobById = new Map(jobs.map(job => [job.id, job]));
        const apps: Application[] = (appRows || []).map((row: any) => {
          const driver = profileById.get(row.driver_id) as any;
          const job = jobById.get(row.job_id);
          return {
            id: row.id, jobId: row.job_id, jobTitle: job?.title, companyName: job?.companyName,
            driverId: row.driver_id, driverName: driver?.full_name || 'Driver', driverPhone: driver?.phone || '',
            driverEmail: driver?.email || '', driverLocation: driver?.city || '',
            coverMessage: row.cover_message || '', resumeUrl: row.resume_url || undefined,
            status: row.status, appliedDate: row.applied_date || '', updatedDate: row.updated_date || row.applied_date || ''
          };
        });
        dataStore.mergeRemoteApplications(apps);
      }

      if (authUser && role === 'employer') {
        const { data: sub } = await supabase.from('employer_subscriptions').select('*').eq('employer_id', authUser.id).maybeSingle();
        dataStore.mergeRemoteSubscription(sub ? {
          employerId: authUser.id, planName: sub.plan_name || 'Hiring plan', jobCredits: sub.job_credits || 0,
          dbUnlockCredits: sub.db_unlock_credits || 0, totalJobCredits: sub.total_job_credits || 0,
          totalDbUnlockCredits: sub.total_db_unlock_credits || 0, activeJobSlots: sub.active_job_slots || 0,
          gstin: sub.gstin || '', gstinVerified: Boolean(sub.gstin_verified),
          billingCompanyName: sub.billing_company_name || '', billingAddress: sub.billing_address || '',
          expiresAt: sub.expires_at || new Date(0).toISOString(),
          status: sub.status === 'active' && new Date(sub.expires_at).getTime() > Date.now() ? 'active' : 'expired'
        } : {
          employerId: authUser.id, planName: 'No active hiring plan', jobCredits: 0, dbUnlockCredits: 0,
          totalJobCredits: 0, totalDbUnlockCredits: 0, activeJobSlots: 0, gstin: '', gstinVerified: false,
          billingCompanyName: '', billingAddress: '', expiresAt: new Date(0).toISOString(), status: 'expired'
        });
        const { data: billingRows } = await supabase.from('billing_transactions').select('*').eq('employer_id', authUser.id).order('created_at', { ascending: false });
        dataStore.mergeRemoteBillingTransactions((billingRows || []).map((txn: any) => ({
          id: txn.id, employerId: authUser.id, date: txn.created_at?.slice(0, 10) || '', time: txn.created_at?.slice(11, 16) || '',
          planDetails: txn.plan_details, appliesUntil: txn.applies_until || '', amount: txn.amount || 0,
          status: txn.status === 'Success' ? 'Success' : txn.status === 'Failed' ? 'Failed' : txn.status === 'Cancelled' ? 'Cancelled' : 'Pending',
          invoiceId: txn.invoice_id || undefined, jobCreditsAdded: txn.job_credits_added || 0, dbCreditsAdded: txn.db_credits_added || 0
        })));
        const { data: company } = await supabase.from('companies').select('*').eq('user_id', authUser.id).maybeSingle();
        if (company && profile) dataStore.mergeRemoteEmployers([{
          id: authUser.id, companyName: company.company_name, contactPerson: company.contact_person || profile.full_name || '',
          email: company.email || profile.email || '', phone: company.phone || profile.phone || '',
          industry: company.industry || '', location: company.location || '', city: company.city || '', state: company.state || '',
          address: company.address || '', website: company.website || '', logoUrl: company.logo_url || '',
          description: company.description || '', verified: company.verified || false,
          status: company.status === 'suspended' ? 'blocked' : company.status || 'pending',
          createdAt: company.created_at?.slice(0, 10) || ''
        }]);
      }
    } catch (e) {
      console.warn('Supabase fetchAndMergeRemoteData notice:', e);
    }
  },
};
