'use client'

import { useCallback, useEffect, useState } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchPosition?: boolean
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10_000,
    maximumAge = 30_000,
    watchPosition = false,
  } = options

  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    loading: false,
  })

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    })
  }, [])

  const onError = useCallback((error: GeolocationPositionError) => {
    const messages: Record<number, string> = {
      1: 'Vui lòng cho phép truy cập vị trí',
      2: 'Không thể xác định vị trí',
      3: 'Hết thời gian chờ xác định vị trí',
    }
    setState((prev) => ({
      ...prev,
      error: messages[error.code] ?? 'Lỗi không xác định',
      loading: false,
    }))
  }, [])

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Trình duyệt không hỗ trợ định vị' }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })
  }, [enableHighAccuracy, maximumAge, onError, onSuccess, timeout])

  useEffect(() => {
    if (!watchPosition) return

    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Trình duyệt không hỗ trợ định vị' }))
      return
    }

    setState((prev) => ({ ...prev, loading: true }))

    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [watchPosition, enableHighAccuracy, timeout, maximumAge, onSuccess, onError])

  return { ...state, getCurrentPosition }
}
