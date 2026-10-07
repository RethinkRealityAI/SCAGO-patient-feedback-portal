'use client'

import { useEffect, useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { KeyRound, Loader } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { completeRequiredPasswordChange } from '@/app/account/actions'

const MIN_LENGTH = 10

/**
 * Blocks the portal until a user flagged with `mustChangePassword` (e.g. a new
 * staff account created with a temporary password) chooses their own password.
 */
export function ForcePasswordChange() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [required, setRequired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setRequired(false)
      return
    }
    user
      .getIdTokenResult()
      .then(result => {
        if (!cancelled) setRequired(result.claims.mustChangePassword === true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user || !required) return null

  const problem =
    password.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters.`
      : !/[A-Za-z]/.test(password) || !/\d/.test(password)
        ? 'Include at least one letter and one number.'
        : password !== confirm
          ? 'The two passwords do not match.'
          : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updatePassword(user, password)
      const token = await user.getIdToken(true)
      const result = await completeRequiredPasswordChange(token)
      if (!result.success) throw new Error(result.error)
      await user.getIdToken(true) // pick up the cleared claim
      setRequired(false)
      toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' })
    } catch (err: any) {
      setError(
        err?.code === 'auth/requires-recent-login'
          ? 'For security, please sign out and sign back in with your temporary password, then try again.'
          : err?.message || 'Could not update your password. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={e => e.preventDefault()}
        onPointerDownOutside={e => e.preventDefault()}
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[#C8262A]/10">
            <KeyRound className="h-5 w-5 text-[#C8262A]" aria-hidden="true" />
          </div>
          <DialogTitle>Choose your own password</DialogTitle>
          <DialogDescription>
            You signed in with a temporary password. Set a new one to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">At least {MIN_LENGTH} characters, with a letter and a number.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? <Loader className="h-4 w-4 animate-spin" /> : 'Save password and continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ForcePasswordChange
