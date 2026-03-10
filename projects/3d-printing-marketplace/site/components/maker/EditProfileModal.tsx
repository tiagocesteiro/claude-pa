'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'

interface Profile {
  id: string
  display_name: string
  bio: string | null
  location_city: string | null
  location_lat: number | null
  location_lng: number | null
  avatar_url: string | null
  created_at: string
}

interface Props {
  profile: Profile
  onClose: () => void
  onUpdate: (updated: Profile) => void
}

export default function EditProfileModal({ profile, onClose, onUpdate }: Props) {
  const [form, setForm] = useState({
    display_name: profile.display_name,
    bio: profile.bio || '',
    location_city: profile.location_city || '',
    location_lat: profile.location_lat || '',
    location_lng: profile.location_lng || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name,
        bio: form.bio || null,
        location_city: form.location_city || null,
        location_lat: form.location_lat ? parseFloat(form.location_lat as any) : null,
        location_lng: form.location_lng ? parseFloat(form.location_lng as any) : null,
      })
      .eq('id', profile.id)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    const updated: Profile = {
      ...profile,
      display_name: form.display_name,
      bio: form.bio || null,
      location_city: form.location_city || null,
      location_lat: form.location_lat ? parseFloat(form.location_lat as any) : null,
      location_lng: form.location_lng ? parseFloat(form.location_lng as any) : null,
    }
    onUpdate(updated)

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[var(--radius)] max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Edit Profile</h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              required
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              rows={3}
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)] resize-none"
              placeholder="Tell buyers about your expertise..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">City</label>
            <input
              value={form.location_city}
              onChange={e => setForm(f => ({ ...f, location_city: e.target.value }))}
              className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
              placeholder="e.g., Lisbon"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.location_lat}
                onChange={e => setForm(f => ({ ...f, location_lat: e.target.value }))}
                className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
                placeholder="38.7223"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.location_lng}
                onChange={e => setForm(f => ({ ...f, location_lng: e.target.value }))}
                className="w-full border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--fg)]"
                placeholder="-9.1393"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            💡 Get coordinates: Search your city on <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">Google Maps</a>, right-click, copy coordinates.
          </p>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[var(--border)] text-[var(--fg)] font-semibold py-2 rounded-[var(--radius)] hover:bg-[var(--accent-light)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--fg)] text-white font-semibold py-2 rounded-[var(--radius)] hover:bg-[var(--accent)] transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
