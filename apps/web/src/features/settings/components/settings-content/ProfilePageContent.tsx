'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { backendGet, backendPatch, backendUpload } from '@/lib/api/backend-client'
import { createClient } from '@/lib/supabase/client'
import { SETTINGS_TOAST_ERRORS } from '../../config/settings-toast-errors.config'

export default function ProfilePageContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [copiedUserId, setCopiedUserId] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    loadProfile()
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setEmail(user.email ?? '')
      setUserId(user.id)

      const profile = await backendGet<{
        full_name?: string
        avatar_url?: string | null
        company_name?: string
      }>('/api/profile')

      if (profile) {
        setFullName(profile.full_name ?? '')
        setAvatarUrl(profile.avatar_url ?? null)
        setCompanyName(profile.company_name ?? '')
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : SETTINGS_TOAST_ERRORS.PROFILE_LOAD_FAILED.userMessage,
      )
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      await backendPatch('/api/profile', {
        full_name: fullName.trim(),
        company_name: companyName.trim(),
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : SETTINGS_TOAST_ERRORS.PROFILE_SAVE_FAILED.userMessage,
      )
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return
      const formData = new FormData()
      formData.append('file', file)
      const response = await backendUpload<{ url: string }>('/api/profile/avatar', formData)
      setAvatarUrl(response.url)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : SETTINGS_TOAST_ERRORS.AVATAR_UPLOAD_FAILED.userMessage,
      )
    } finally {
      setUploading(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const supabase = createClient()

      // Verify current password by attempting sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('Current password is incorrect')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setPasswordSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Failed to change password:', error)
      setPasswordError('Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleCopyUserId = async () => {
    if (!userId) return
    await navigator.clipboard.writeText(userId)
    setCopiedUserId(true)
    if (copyResetTimeoutRef.current) {
      window.clearTimeout(copyResetTimeoutRef.current)
    }
    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopiedUserId(false)
    }, 1500)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading Profile..." state="processing" size="sm" />
      </div>
    )
  }

  const initials =
    fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || email.charAt(0).toUpperCase()

  return (
    <div className="p-spacing-4 md:p-spacing-8">
      <div className="space-y-spacing-6 max-w-2xl">
        {/* Profile Card — Avatar + Personal Info */}
        <div className="section-card p-spacing-6">
          {/* Avatar row */}
          <div className="gap-spacing-4 mb-spacing-6 flex items-center">
            <div className="bg-primary flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary-foreground text-xl font-medium">{initials}</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="button-glass-neutral rounded-spacing-2 px-spacing-4 body-2 gap-spacing-2 flex items-center font-medium"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Photo
              </button>
              <p className="body-3 text-muted-foreground mt-spacing-2">JPG, PNG or GIF. Max 2MB.</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-spacing-4">
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </div>
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border bg-secondary text-muted-foreground w-full cursor-not-allowed border"
              />
              <p className="body-3 text-muted-foreground mt-spacing-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">User ID</label>
              <div className="gap-spacing-2 flex items-center">
                <input
                  type="text"
                  value={userId}
                  disabled
                  className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border bg-secondary text-muted-foreground w-full cursor-not-allowed border"
                />
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  disabled={!userId}
                  className="button-glass-neutral rounded-spacing-2 px-spacing-4 body-2 h-spacing-10 font-medium disabled:opacity-50"
                >
                  {copiedUserId ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </div>
          </div>

          {/* Save Button — bottom right of card */}
          <div className="mt-spacing-6 flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="button-glass-accent rounded-spacing-2 px-spacing-6 py-spacing-2 body-2 gap-spacing-2 flex items-center font-medium disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="section-card p-spacing-6">
          <h3 className="body-1 mb-spacing-4 font-medium">Change Password</h3>
          <div className="space-y-spacing-4">
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </div>
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </div>
            <div>
              <label className="body-3 text-muted-foreground mb-spacing-1 block">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="h-spacing-10 px-spacing-3 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
              />
            </div>

            {passwordError && (
              <p className="body-3 text-[var(--color-destructive)]">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="body-3 text-[var(--color-success)]">{passwordSuccess}</p>
            )}
          </div>

          {/* Change Password Button — bottom right of card */}
          <div className="mt-spacing-6 flex justify-end">
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="button-glass-accent rounded-spacing-2 px-spacing-6 py-spacing-2 body-2 gap-spacing-2 flex items-center font-medium disabled:opacity-50"
            >
              {changingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
