import { supabase } from './supabaseClient';
import { Job, Application, DriverProfile, EmployerProfile, User } from '../types';

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
  async syncJob(job: Job, employer?: EmployerProfile) {
    try {
      const employerUUID = toUUID(job.employerId || 'usr-employer-1');
      const companyUUID = toUUID(employer?.id || job.employerId || 'company-1');

      // 1. Ensure Employer Profile & Company exist in Supabase
      await supabase.from('profiles').upsert({
        id: employerUUID,
        role: 'employer',
        full_name: employer?.contactPerson || 'Fleet Manager',
        email: employer?.email || 'deepa@bharatlogistics.in',
        phone: employer?.phone || '+91 80 2200 0001',
        city: employer?.city || 'Bengaluru',
        state: employer?.state || 'Karnataka',
        status: 'active'
      }, { onConflict: 'id' });

      await supabase.from('companies').upsert({
        id: companyUUID,
        user_id: employerUUID,
        company_name: job.companyName || employer?.companyName || 'Bharat Logistics & Freight',
        industry: employer?.industry || 'Logistics & Interstate Freight',
        location: job.location || 'Bengaluru',
        city: job.city || 'Bengaluru',
        state: job.state || 'Karnataka',
        verified: true,
        status: 'active'
      }, { onConflict: 'id' });

      // 2. Insert or update Job in Supabase
      const { data, error } = await supabase.from('jobs').upsert({
        id: toUUID(job.id),
        employer_id: employerUUID,
        company_id: companyUUID,
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
        vacancies: job.vacancies || 1,
        status: job.status || 'pending'
      }, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase syncJob error:', error.message);
      } else {
        console.log('Successfully synced job to Supabase:', job.title);
      }
    } catch (e) {
      console.warn('Failed to sync job to Supabase:', e);
    }
  },

  // Sync an application to Supabase
  async syncApplication(app: Application) {
    try {
      const driverUUID = toUUID(app.driverId);
      const jobUUID = toUUID(app.jobId);

      // Ensure driver profile exists
      await supabase.from('profiles').upsert({
        id: driverUUID,
        role: 'driver',
        full_name: app.driverName || 'Driver Candidate',
        email: app.driverEmail || 'driver@driverhub.in',
        phone: app.driverPhone || '+91 98765 00000',
        city: app.driverLocation || 'Bengaluru',
        status: 'active'
      }, { onConflict: 'id' });

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
      } else {
        console.log('Successfully synced application to Supabase:', app.id);
      }
    } catch (e) {
      console.warn('Failed to sync application to Supabase:', e);
    }
  },

  // Sync entire mock dataset to Supabase for immediate preview
  async syncAllData(jobs: Job[], employers: EmployerProfile[], drivers: DriverProfile[], applications: Application[]) {
    try {
      console.log('Starting full database seed sync to Supabase...');

      // 1. Sync Employers & Companies
      for (const emp of employers) {
        const empUUID = toUUID(emp.id);
        await supabase.from('profiles').upsert({
          id: empUUID,
          role: 'employer',
          full_name: emp.contactPerson,
          email: emp.email,
          phone: emp.phone,
          city: emp.city,
          state: emp.state,
          status: 'active'
        }, { onConflict: 'id' });

        await supabase.from('companies').upsert({
          id: empUUID,
          user_id: empUUID,
          company_name: emp.companyName,
          contact_person: emp.contactPerson,
          email: emp.email,
          phone: emp.phone,
          industry: emp.industry,
          location: emp.location,
          city: emp.city,
          state: emp.state,
          address: emp.address,
          verified: emp.verified,
          status: 'active'
        }, { onConflict: 'id' });
      }

      // 2. Sync Drivers & Driver Profiles
      for (const drv of drivers) {
        const drvUUID = toUUID(drv.id);
        await supabase.from('profiles').upsert({
          id: drvUUID,
          role: 'driver',
          full_name: drv.fullName,
          email: drv.email,
          phone: drv.phone,
          city: drv.city,
          state: drv.state,
          status: drv.status || 'active'
        }, { onConflict: 'id' });

        await supabase.from('driver_profiles').upsert({
          id: drvUUID,
          user_id: drvUUID,
          driver_category: drv.driverCategory,
          years_experience: drv.experienceYears,
          license_number: drv.licenseNumber,
          license_type: drv.licenseType,
          license_expiry: drv.licenseExpiry,
          skills: drv.skills || [],
          preferred_location: drv.preferredLocation,
          expected_salary: drv.expectedSalary,
          availability: drv.availability,
          bio: drv.bio
        }, { onConflict: 'id' });
      }

      // 3. Sync Jobs
      for (const j of jobs) {
        await this.syncJob(j);
      }

      // 4. Sync Applications
      for (const app of applications) {
        await this.syncApplication(app);
      }

      console.log('✅ Supabase database full sync complete!');
    } catch (e) {
      console.warn('Sync all data error:', e);
    }
  },

  // Store password reset verification code in Supabase
  async createPasswordReset(email: string, otpCode: string) {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // 1. Send native Supabase recovery email
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + '/forgot-password',
      }).catch(err => console.log('Supabase auth reset mail attempt:', err));

      // 2. Try RPC function first (Bypasses any table restrictions)
      const { data: rpcData, error: rpcError } = await supabase.rpc('request_password_reset', {
        user_email: cleanEmail,
        reset_code: otpCode
      });

      if (!rpcError) {
        console.log('Successfully saved OTP via Supabase RPC for', cleanEmail);
        return true;
      }

      // 3. Fallback direct table upsert
      const resetUUID = toUUID('reset-' + cleanEmail);
      const { error: tableError } = await supabase.from('password_resets').upsert({
        id: resetUUID,
        email: cleanEmail,
        otp_code: otpCode,
        created_at: new Date().toISOString()
      }, { onConflict: 'email' });

      if (tableError) {
        console.warn('Supabase password_resets direct write error:', tableError.message);
      } else {
        console.log('Successfully saved OTP via direct upsert for', cleanEmail);
      }

      return true;
    } catch (e) {
      console.warn('createPasswordReset error:', e);
      return false;
    }
  },

  // Verify entered code with Supabase
  async verifyPasswordReset(email: string, enteredCode: string): Promise<boolean> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      
      // Check in Supabase table
      const { data } = await supabase
        .from('password_resets')
        .select('otp_code')
        .eq('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0 && data[0].otp_code === enteredCode.trim()) {
        return true;
      }

      // Also try Supabase Auth OTP verification
      const { data: authData, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: enteredCode.trim(),
        type: 'recovery'
      });

      if (!error && authData?.session) {
        return true;
      }

      return false;
    } catch (e) {
      console.warn('verifyPasswordReset error:', e);
      return false;
    }
  }
};

