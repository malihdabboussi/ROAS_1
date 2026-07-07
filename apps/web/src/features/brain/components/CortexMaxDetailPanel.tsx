'use client'

import {
  CustomerUnitDetail,
  UnlinkedSignalDetail,
} from './CortexMaxCustomerDetails'
import { AvatarDetail } from './CortexMaxAvatarDetail'
import {
  BeliefDetail,
  CompanyObjectDetail,
  NarrativePageDetail,
  PerspectiveDetail,
  TimelineDetail,
} from './CortexMaxCoreDetails'
import type { CortexItem } from './cortex-max-view-model'

export function CortexMaxDetailPanel({ item }: { item: CortexItem }) {
  if (item.kind === 'companyObject') return <CompanyObjectDetail item={item} />
  if (item.kind === 'page') return <NarrativePageDetail item={item} />
  if (item.kind === 'belief') return <BeliefDetail item={item} />
  if (item.kind === 'avatar') {
    return <AvatarDetail avatar={item.avatar} customerView={item.customerView} />
  }
  if (item.kind === 'customerUnit') return <CustomerUnitDetail item={item} />
  if (item.kind === 'unlinkedSignal') return <UnlinkedSignalDetail item={item} />
  if (item.kind === 'timeline') return <TimelineDetail item={item} />
  if (item.kind === 'perspective') return <PerspectiveDetail item={item} />
  return null
}
