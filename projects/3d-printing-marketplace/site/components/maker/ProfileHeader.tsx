'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { MapPin, Calendar, Package, Edit2 } from 'lucide-react'
import RatingStars from './RatingStars'
import EditProfileModal from './EditProfileModal'
import { createClient } from '@/lib/supabase/client'

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
  avgQ: number
  avgD: number
  reviewCount: number
  totalOrders: number | null
}

export default function ProfileHeader({ profile, avgQ, avgD, reviewCount, totalOrders }: Props) {
  const [isOwner, setIsOwner] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentProfile, setCurrentProfile] = useState(profile)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === profile.id)
    })
  }, [profile.id])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div className="w-20 h-20 rounded-full bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[var(--border)]">
          {currentProfile.avatar_url ? (
            <Image src={currentProfile.avatar_url} alt={currentProfile.display_name} width={80} height={80} className="object-cover" />
          ) : (
            <span className="text-2xl font-bold text-[var(--accent)]">{currentProfile.display_name[0]}</span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{currentProfile.display_name}</h1>
            {isOwner && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-[var(--muted)] hover:bg-[var(--accent-light)] rounded-[var(--radius)] transition-colors"
                title="Edit profile"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)] mb-3">
            {currentProfile.location_city && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {currentProfile.location_city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              Member since {new Date(currentProfile.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Package size={13} />
              {totalOrders ?? 0} completed
            </span>
          </div>
          {reviewCount > 0 && (
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Quality</p>
                <RatingStars rating={avgQ} count={reviewCount} />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Delivery</p>
                <RatingStars rating={avgD} />
              </div>
            </div>
          )}
          {currentProfile.bio && <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{currentProfile.bio}</p>}
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={currentProfile}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updated) => setCurrentProfile(updated)}
        />
      )}
    </>
  )
}
