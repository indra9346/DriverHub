import { supabase } from './supabaseClient';
import { Job, Application, DriverProfile, EmployerProfile, User, Notification, DriverDocument, DirectMessage, SavedSearch, FavoriteJob, DriverExperience } from '../types';

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
  async getAdminDocumentQueue(): Promise<Array<DriverDocument & {
    driverName: string; driverEmail: string; driverPhone: string; driverCity: string; driverState: string;
  }>> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in with an administrator account to review documents.');
    const { data: actor, error: actorError } = await supabase.from('profiles').select('role')
      .eq('id', authData.user.id).maybeSingle();
    if (actorError || actor?.role !== 'admin') throw new Error('Administrator access is required to review driver documents.');

    const { data: documentRows, error: documentError } = await supabase.from('driver_documents').select('*')
      .order('upload_date', { ascending: false });
    if (documentError) throw new Error(documentError.message);
    const driverIds = [...new Set((documentRows || []).map((row: any) => row.driver_id))];
    const { data: profileRows, error: profileError } = driverIds.length
      ? await supabase.from('profiles').select('id,full_name,email,phone,city,state').in('id', driverIds)
      : { data: [], error: null };
    if (profileError) throw new Error(profileError.message);
    const profileById = new Map((profileRows || []).map((row: any) => [row.id, row]));
    return (documentRows || []).map((row: any) => {
      const driver = profileById.get(row.driver_id) as any;
      return {
        id: row.id, driverId: row.driver_id, name: row.name, type: row.type,
        fileUrl: row.file_url, fileSize: row.file_size || undefined,
        uploadDate: row.upload_date?.slice(0, 10) || '', verificationStatus: row.verification_status,
        driverName: driver?.full_name || 'Driver', driverEmail: driver?.email || '',
        driverPhone: driver?.phone || '', driverCity: driver?.city || '', driverState: driver?.state || ''
      };
    });
  },

  async reviewDriverDocument(documentId: string, status: 'verified' | 'rejected'): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return false;
      const { data: actor } = await supabase.from('profiles').select('role')
        .eq('id', authData.user.id).maybeSingle();
      if (actor?.role !== 'admin') return false;
      const { error } = await supabase.rpc('review_driverhub_document', {
        p_document_id: toUUID(documentId), p_status: status
      });
      if (error) console.warn('Supabase reviewDriverDocument error:', error.message);
      return !error;
    } catch (e) {
      console.warn('Supabase reviewDriverDocument error:', e);
      return false;
    }
  },

  async updateEmployerBillingProfile(employerId: string, billing: {
    gstin: string; billingCompanyName: string; billingAddress: string;
  }): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== toUUID(employerId)) return false;
      const { error } = await supabase.rpc('update_driverhub_billing_profile', {
        p_gstin: billing.gstin,
        p_billing_company_name: billing.billingCompanyName,
        p_billing_address: billing.billingAddress
      });
      if (error) console.warn('Supabase billing profile update error:', error.message);
      return !error;
    } catch (e) {
      console.warn('Supabase billing profile update error:', e);
      return false;
    }
  },

  async searchDriverCandidates(filters: {
    keyword?: string; category?: string; city?: string; state?: string;
    minExperience?: number; skill?: string; vehicleType?: string; userId?: string; activeInDays?: number; limit?: number;
  }): Promise<DriverProfile[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in as an employer to search driver profiles.');
    const { data, error } = await supabase.rpc('search_driverhub_candidates', {
      p_keyword: filters.keyword?.trim() || null,
      p_category: filters.category || null,
      p_city: filters.city || null,
      p_state: filters.state || null,
      p_min_years: filters.minExperience || 0,
      p_skill: filters.skill?.trim() || null,
      p_vehicle_type: filters.vehicleType || null,
      p_user_id: filters.userId || null,
      p_active_in_days: filters.activeInDays || null,
      p_limit: Math.min(Math.max(filters.limit || 100, 1), 250),
      p_offset: 0
    });
    if (error) throw new Error(error.message.includes('search_driverhub_candidates')
      ? 'Driver search needs the latest Supabase migration. Apply supabase-marketplace-flows.sql in the Supabase SQL Editor.'
      : error.message);
    return (data || []).map((row: any): DriverProfile => ({
      id: row.user_id,
      fullName: row.full_name || 'Driver',
      phone: row.phone || '',
      email: row.email || '',
      location: [row.city, row.state].filter(Boolean).join(', '),
      city: row.city || '',
      state: row.state || '',
      driverCategory: row.driver_category || '',
      licenseNumber: row.license_number || '',
      licenseType: row.license_type || '',
      licenseExpiry: row.license_expiry || '',
      experienceYears: row.years_experience || 0,
      experienceMonths: row.months_experience || 0,
      skills: row.skills || [],
      languages: row.languages || [],
      vehicleTypes: row.vehicle_types || [],
      currentRole: row.current_role || '',
      education: row.education || '',
      preferredLocation: row.preferred_location || '',
      expectedSalary: row.expected_salary || 0,
      availability: row.availability || 'Flexible',
      cvAttached: Boolean(row.cv_attached),
      policeVerified: Boolean(row.police_verified),
      lastActive: row.last_active || undefined,
      bio: row.bio || '',
      resumeUrl: row.resume_url || undefined,
      status: 'active',
      documents: []
    }));
  },

  async syncFavorite(driverId: string, jobId: string, saved: boolean): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) return false;
      const query = supabase.from('favorite_jobs');
      const { error } = saved
        ? await query.upsert({ driver_id: authData.user.id, job_id: toUUID(jobId) }, { onConflict: 'driver_id,job_id' })
        : await query.delete().eq('driver_id', authData.user.id).eq('job_id', toUUID(jobId));
      if (error) console.warn('Supabase syncFavorite error:', error.message);
      return !error;
    } catch (e) {
      console.warn('Supabase syncFavorite error:', e);
      return false;
    }
  },

  async uploadDriverDocument(driverId: string, file: File, type: DriverDocument['type']): Promise<DriverDocument> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== toUUID(driverId)) {
      throw new Error('Sign in to your driver account before uploading documents.');
    }
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${authData.user.id}/${id}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('driver-documents').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });
    if (uploadError) throw new Error(uploadError.message);

    const doc: DriverDocument = {
      id,
      driverId: authData.user.id,
      name: file.name,
      type,
      fileUrl: path,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadDate: new Date().toISOString().slice(0, 10),
      verificationStatus: 'pending'
    };
    const { error: rowError } = await supabase.from('driver_documents').insert({
      id, driver_id: authData.user.id, name: doc.name, type: doc.type,
      file_url: path, file_size: doc.fileSize, verification_status: 'pending'
    });
    if (rowError) {
      await supabase.storage.from('driver-documents').remove([path]);
      throw new Error(rowError.message);
    }
    return doc;
  },

  async deleteDriverDocument(driverId: string, doc: DriverDocument): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) return false;
      const { error: rowError } = await supabase.from('driver_documents').delete()
        .eq('id', toUUID(doc.id)).eq('driver_id', authData.user.id);
      if (rowError) throw rowError;
      if (doc.fileUrl && !doc.fileUrl.startsWith('blob:') && !doc.fileUrl.startsWith('data:')) {
        const { error: fileError } = await supabase.storage.from('driver-documents').remove([doc.fileUrl]);
        if (fileError) console.warn('Supabase document file removal error:', fileError.message);
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteDriverDocument error:', e);
      return false;
    }
  },

  async getDriverDocumentUrl(filePath: string): Promise<string> {
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('blob:')) return filePath;
    const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not open this document.');
    return data.signedUrl;
  },

  async getEmployerApplicantDocuments(driverId: string, jobId: string): Promise<DriverDocument[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in as an employer to view applicant documents.');
    const employerId = authData.user.id;

    const [{ data: employer }, { data: plan }, { data: job }, { data: application }] = await Promise.all([
      supabase.from('profiles').select('role,status').eq('id', employerId).maybeSingle(),
      supabase.from('employer_subscriptions').select('status,expires_at').eq('employer_id', employerId).maybeSingle(),
      supabase.from('jobs').select('id').eq('id', toUUID(jobId)).eq('employer_id', employerId).maybeSingle(),
      supabase.from('applications').select('id').eq('job_id', toUUID(jobId)).eq('driver_id', toUUID(driverId)).maybeSingle()
    ]);
    if (employer?.role !== 'employer' || employer.status !== 'active') {
      throw new Error('An active employer account is required to view documents.');
    }
    if (!plan || plan.status !== 'active' || !plan.expires_at || new Date(plan.expires_at).getTime() <= Date.now()) {
      throw new Error('An active hiring subscription is required to view driver documents.');
    }
    if (!job || !application) throw new Error('You can view documents only for a driver who applied to your job.');

    const { data: rows, error } = await supabase.from('driver_documents').select('*')
      .eq('driver_id', toUUID(driverId)).order('upload_date', { ascending: false });
    if (error) throw new Error(error.message);

    return await Promise.all((rows || []).map(async (row: any) => {
      const path = String(row.file_url || '');
      if (!path || path.startsWith('blob:') || path.startsWith('data:')) return null;
      const { data: signed, error: signError } = await supabase.storage.from('driver-documents').createSignedUrl(path, 60);
      if (signError || !signed?.signedUrl) return null;
      return {
        id: row.id, driverId: row.driver_id, name: row.name, type: row.type,
        fileUrl: signed.signedUrl, fileSize: row.file_size || undefined,
        uploadDate: row.upload_date?.slice(0, 10) || '',
        verificationStatus: row.verification_status
      } as DriverDocument;
    })).then(documents => documents.filter((document): document is DriverDocument => Boolean(document)));
  },

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
      const { data: company } = await supabase.from('companies').select('company_name,logo_url,contact_person').eq('user_id', employerUUID).maybeSingle();
      if (!company && !isAdmin) return false;

      const payload = {
        id: toUUID(job.id),
        employer_id: employerUUID,
        company_name: job.companyName || company?.company_name || 'DriverHub Employer',
        company_logo: job.companyLogo || company?.logo_url || null,
        posted_by: job.postedBy || company?.contact_person || null,
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
        route_type: job.routeType || 'Local City & Highway',
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
  async registerUser(user: User, profileData?: DriverProfile | EmployerProfile): Promise<boolean> {
    try {
      const userUUID = toUUID(user.id);
      const { data: authData } = await supabase.auth.getUser();
      // Public profile writes are only allowed for the signed-in owner. Demo/local users never sync.
      if (!authData.user || authData.user.id !== userUUID) {
        return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true');
      }
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
        return false;
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
          months_experience: dp.experienceMonths || 0,
          license_number: dp.licenseNumber || null,
          license_type: dp.licenseType || null,
          license_expiry: dp.licenseExpiry || null,
          skills: dp.skills || [],
          languages: dp.languages || [],
          vehicle_types: dp.vehicleTypes || [],
          current_role: dp.currentRole || null,
          previous_role: dp.previousRole || null,
          education: dp.education || null,
          preferred_location: dp.preferredLocation || dp.location || dp.city || null,
          expected_salary: dp.expectedSalary || null,
          availability: dp.availability || 'Flexible',
          cv_attached: Boolean(dp.cvAttached || dp.resumeUrl),
          police_verified: Boolean(dp.policeVerified),
          resume_url: dp.resumeUrl || null,
          bio: dp.bio || null
        }, { onConflict: 'user_id' });

        if (drvError) {
          console.warn('Supabase driver_profiles upsert notice:', drvError.message);
          return false;
        }
        const experienceRows = (dp.experiences || []).map((experience: DriverExperience) => ({
          id: toUUID(experience.id), driver_id: userUUID, company_name: experience.companyName,
          role_title: experience.roleTitle, vehicle_type: experience.vehicleType || null,
          duration_years: experience.durationYears || 0, start_date: experience.startDate || null,
          end_date: experience.endDate || null, description: experience.description || null
        }));
        if (experienceRows.length) {
          const { error: experienceError } = await supabase.from('driver_experiences').upsert(experienceRows, { onConflict: 'id' });
          if (experienceError) {
            console.warn('Supabase driver_experiences upsert notice:', experienceError.message);
            return false;
          }
        }
        const documentRows = (dp.documents || []).filter(doc => !doc.fileUrl.startsWith('blob:') && !doc.fileUrl.startsWith('data:')).map((doc: DriverDocument) => ({
          id: toUUID(doc.id), driver_id: userUUID, name: doc.name, type: doc.type,
          file_url: doc.fileUrl, file_size: doc.fileSize || null,
          upload_date: doc.uploadDate, verification_status: doc.verificationStatus
        }));
        if (documentRows.length) {
          const { error: documentsError } = await supabase.from('driver_documents').upsert(documentRows, { onConflict: 'id' });
          if (documentsError) {
            console.warn('Supabase driver_documents upsert notice:', documentsError.message);
            return false;
          }
        }
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

        if (compError) {
          console.warn('Supabase companies upsert notice:', compError.message);
          return false;
        }

      }
      console.log('✅ Registered user fully synced to Supabase tables:', user.email);
      return true;
    } catch (e) {
      console.warn('Supabase registerUser error:', e);
      return false;
    }
  },

  async deleteDriverExperience(driverId: string, experienceId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) {
        return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true');
      }
      const { error } = await supabase.from('driver_experiences').delete()
        .eq('id', toUUID(experienceId)).eq('driver_id', authData.user.id);
      if (error) console.warn('Supabase deleteDriverExperience error:', error.message);
      return !error;
    } catch (e) {
      console.warn('Supabase deleteDriverExperience error:', e);
      return false;
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
        interview_mode: options?.interviewMode,
        interview_location: options?.interviewLocation,
        updated_date: new Date().toISOString()
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_experiences' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'favorite_jobs' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_searches' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_unlocks' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employer_subscriptions' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_transactions' }, () => onUpdate?.())
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

  async syncSavedSearch(search: SavedSearch): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(search.employerId)) return false;
      const { error } = await supabase.from('saved_searches').upsert({
        id: toUUID(search.id),
        employer_id: authData.user.id,
        title: search.title,
        category: search.category,
        city: search.city,
        state: search.state || null,
        keyword: search.keyword || null,
        vehicle_type: search.vehicleType || null,
        active_in_days: search.activeInDays || 15,
        min_exp: search.minExp,
        must_have_skills: search.mustHaveSkills || [],
        match_count: search.matchCount || 10
      }, { onConflict: 'id' });
      if (error) console.warn('Supabase syncSavedSearch error:', error.message);
      return !error;
    } catch (e) {
      console.warn('syncSavedSearch error:', e);
      return false;
    }
  },

  async deleteSavedSearch(id: string, employerId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(employerId)) return false;
      const { error } = await supabase.from('saved_searches').delete()
        .eq('id', toUUID(id)).eq('employer_id', authData.user.id);
      return !error;
    } catch (e) {
      console.warn('Supabase deleteSavedSearch error:', e);
      return false;
    }
  },

  async syncDirectMessage(msg: DirectMessage): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(msg.senderId)) return false;
      const { error } = await supabase.from('direct_messages').insert({
        id: toUUID(msg.id),
        sender_id: authData.user.id,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        receiver_id: toUUID(msg.receiverId),
        receiver_name: msg.receiverName,
        job_id: msg.jobId ? toUUID(msg.jobId) : null,
        job_title: msg.jobTitle || null,
        text: msg.text,
        read: msg.read || false
      });
      if (error) console.warn('Supabase syncDirectMessage error:', error.message);
      return !error;
    } catch (e) {
      console.warn('syncDirectMessage error:', e);
      return false;
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;
      const { error } = await supabase.from('notifications').update({ read: true })
        .eq('id', toUUID(id)).eq('user_id', authData.user.id);
      return !error;
    } catch (e) {
      console.warn('Supabase markNotificationRead error:', e);
      return false;
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

        if (role === 'driver') {
          const [{ data: driverRow }, { data: experienceRows }, { data: documentRows }, { data: favoriteRows }] = await Promise.all([
            supabase.from('driver_profiles').select('*').eq('user_id', authUser.id).maybeSingle(),
            supabase.from('driver_experiences').select('*').eq('driver_id', authUser.id).order('start_date', { ascending: false }),
            supabase.from('driver_documents').select('*').eq('driver_id', authUser.id).order('upload_date', { ascending: false }),
            supabase.from('favorite_jobs').select('*').eq('driver_id', authUser.id)
          ]);
          if (driverRow) {
            const driver: DriverProfile = {
              id: authUser.id,
              fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
              phone: profile?.phone || '', email: profile?.email || authUser.email || '',
              location: profile?.location || profile?.city || '', city: profile?.city || '', state: profile?.state || '',
              driverCategory: driverRow.driver_category || '', licenseNumber: driverRow.license_number || '',
              licenseType: driverRow.license_type || '', licenseExpiry: driverRow.license_expiry || '',
              experienceYears: driverRow.years_experience || 0, experienceMonths: driverRow.months_experience || 0,
              skills: driverRow.skills || [], languages: driverRow.languages || [], vehicleTypes: driverRow.vehicle_types || [],
              currentRole: driverRow.current_role || '', previousRole: driverRow.previous_role || '',
              education: driverRow.education || '', preferredLocation: driverRow.preferred_location || '',
              expectedSalary: driverRow.expected_salary || 0,
              availability: driverRow.availability || 'Flexible',
              nightShiftWilling: Boolean(driverRow.night_shift_willing), outstationWilling: Boolean(driverRow.outstation_willing),
              cvAttached: Boolean(driverRow.cv_attached), policeVerified: Boolean(driverRow.police_verified),
              lastActive: driverRow.updated_at || driverRow.created_at, bio: driverRow.bio || '',
              resumeUrl: driverRow.resume_url || undefined, status: profile?.status || 'active',
              experiences: (experienceRows || []).map((row: any): DriverExperience => ({
                id: row.id, driverId: authUser.id, companyName: row.company_name || '', roleTitle: row.role_title || '',
                vehicleType: row.vehicle_type || '', durationYears: Number(row.duration_years || 0),
                startDate: row.start_date || '', endDate: row.end_date || undefined, description: row.description || ''
              })),
              documents: (documentRows || []).map((row: any): DriverDocument => ({
                id: row.id, driverId: authUser.id, name: row.name, type: row.type,
                fileUrl: row.file_url, fileSize: row.file_size || undefined,
                uploadDate: row.upload_date?.slice(0, 10) || '', verificationStatus: row.verification_status
              }))
            };
            dataStore.mergeRemoteDrivers([driver]);
          }
          dataStore.mergeRemoteFavorites(authUser.id, favoriteRows || []);
        }

        const [{ data: notificationRows }, { data: messageRows }] = await Promise.all([
          supabase.from('notifications').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('direct_messages').select('*')
            .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
            .order('created_at', { ascending: true }).limit(500)
        ]);
        dataStore.mergeRemoteNotifications(authUser.id, notificationRows || []);
        dataStore.mergeRemoteMessages(authUser.id, messageRows || []);
      }

      const { data: jobRows, error: jobError } = await supabase.from('jobs').select('*').order('posted_date', { ascending: false });
      if (jobError) throw jobError;
      const rows = jobRows || [];
      const employerIds = [...new Set(rows.map((r: any) => r.employer_id).filter(Boolean))];
      const { data: companies } = employerIds.length
        ? await supabase.from('companies').select('*').in('user_id', employerIds)
        : { data: [] as any[] };
      const companyById = new Map((companies || []).map((company: any) => [company.user_id, company]));
      const jobs: Job[] = rows.map((row: any) => {
        const company = companyById.get(row.employer_id) as any;
        return {
          id: row.id, employerId: row.employer_id, companyName: row.company_name || company?.company_name || 'Verified employer',
          companyLogo: company?.logo_url || undefined, postedBy: company?.contact_person || undefined,
          title: row.title, category: row.category, location: row.location, city: row.city || '', state: row.state || '',
          experienceRequired: row.experience_required || '', experienceMinYears: row.experience_min_years || 0,
          salaryMin: row.salary_min || 0, salaryMax: row.salary_max || 0, salaryType: row.salary_type || 'monthly',
          workingHours: row.working_hours || '', employmentType: row.employment_type || 'Full-time',
          description: row.description || '', requiredSkills: row.required_skills || [], requiredDocs: row.required_docs || [],
          routeType: row.route_type || undefined, vehicleType: row.vehicle_type || undefined,
          payType: row.pay_type || undefined, perks: row.perks || [], nightShift: Boolean(row.night_shift),
          workLocationType: row.work_location_type || undefined, joiningFeeRequired: Boolean(row.joining_fee_required),
          screeningQuestions: row.screening_questions || [],
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
            status: row.status, appliedDate: row.applied_date || '', updatedDate: row.updated_date || row.applied_date || '',
            employerNotes: row.employer_notes || undefined, interviewDate: row.interview_date || undefined,
            interviewMode: row.interview_mode || undefined, interviewLocation: row.interview_location || undefined
          };
        });
        dataStore.mergeRemoteApplications(apps);
        if (role === 'employer') {
          const applicationCounts = new Map<string, number>();
          for (const row of appRows || []) applicationCounts.set(row.job_id, (applicationCounts.get(row.job_id) || 0) + 1);
          dataStore.mergeRemoteJobs(jobs.map(job => ({
            ...job,
            applicationsCount: applicationCounts.get(job.id) || 0
          })));
        }
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
        const [{ data: unlockRows }, { data: savedSearchRows }] = await Promise.all([
          supabase.from('candidate_unlocks').select('*').eq('employer_id', authUser.id).order('unlocked_at', { ascending: false }),
          supabase.from('saved_searches').select('*').eq('employer_id', authUser.id).order('created_at', { ascending: false })
        ]);
        dataStore.mergeRemoteCandidateUnlocks(authUser.id, unlockRows || []);
        dataStore.mergeRemoteSavedSearches(authUser.id, savedSearchRows || []);
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
