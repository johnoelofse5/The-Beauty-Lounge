'use client'
import { useEffect, useRef } from 'react'

export default function OAuthHandler() {
  const hasHandled = useRef(false)

  useEffect(() => {
    if (hasHandled.current) return
    
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      hasHandled.current = true
      window.history.replaceState({}, '', window.location.pathname)
      
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }, [])

  return null
}