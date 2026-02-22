import { useState, useEffect, useRef } from 'react'

export function useScrollAnimations(deps: unknown[]) {
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementId = entry.target.getAttribute('data-animate-id')
          if (elementId) {
            setVisibleElements(prev => {
              const newSet = new Set(prev)
              if (entry.isIntersecting) {
                newSet.add(elementId)
              } else {
                newSet.delete(elementId)
              }
              return newSet
            })
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    return () => observerRef.current?.disconnect()
  }, [])

  useEffect(() => {
    if (observerRef.current) {
      const elements = document.querySelectorAll('[data-animate-id]')
      elements.forEach(el => observerRef.current?.observe(el))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { visibleElements }
}