'use client'

import type { ReactNode } from 'react'
import {
  CallBookingFunnelTypeMockup,
  CustomFunnelTypeMockup,
  LeadMagnetFunnelTypeMockup,
  VslFunnelTypeMockup,
  WebinarFunnelTypeMockup,
} from './FunnelTypeMockups'

export const FUNNEL_TYPE_PICKER_VISUALS: Record<string, ReactNode> = {
  'lead-magnet': <LeadMagnetFunnelTypeMockup />,
  'call-booking': <CallBookingFunnelTypeMockup />,
  webinar: <WebinarFunnelTypeMockup />,
  vsl: <VslFunnelTypeMockup />,
  custom: <CustomFunnelTypeMockup />,
}
