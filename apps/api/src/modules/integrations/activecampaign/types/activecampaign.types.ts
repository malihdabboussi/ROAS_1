export interface AcContact {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  orgid: string
  orgname: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcContactTag {
  id: string
  contact: string
  tag: string
  cdate: string
  links: Record<string, string>
}

export interface AcTag {
  id: string
  tag: string
  tagType: string
  description: string
  cdate: string
  links: Record<string, string>
}

export interface AcList {
  id: string
  name: string
  stringid: string
  sender_url: string
  sender_reminder: string
  cdate: string
  links: Record<string, string>
}

export interface AcDeal {
  id: string
  contact: string
  account: string
  title: string
  description: string
  value: string
  currency: string
  group: string
  stage: string
  owner: string
  status: number
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcDealNote {
  id: string
  deal: string
  note: string
  cdate: string
  links: Record<string, string>
}

export interface AcDealStage {
  id: string
  title: string
  group: string
  order: number
  dealOrder: string
  cardRegion1: string
  cardRegion2: string
  cardRegion3: string
  cardRegion4: string
  cardRegion5: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcDealGroup {
  id: string
  title: string
  currency: string
  autoassign: number
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcDealCustomFieldMeta {
  id: string
  fieldLabel: string
  fieldType: string
  fieldOptions: string | string[] | null
  fieldDefault: string | number | null
  fieldDefaultCurrency: string | null
  isFormVisible: number
  displayOrder: number
  createdTimestamp: string
  updatedTimestamp: string
  links: Record<string, string>
}

export interface AcAccount {
  id: string
  name: string
  accountUrl: string
  owner: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcNote {
  id: string
  relid: string
  reltype: string
  note: string
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcAutomation {
  id: string
  name: string
  cdate: string
  mdate: string
  status: number
  links: Record<string, string>
}

export interface AcContactAutomation {
  id: string
  contact: string
  automation: string
  status: number
  adddate: string
  links: Record<string, string>
}

export interface AcCampaign {
  id: string
  type: string
  name: string
  sdate: string
  status: number
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcMessage {
  id: string
  ed: string | null
  userid: string
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcCustomField {
  id: string
  title: string
  descript: string
  type: string
  isrequired: number
  perstag: string
  defval: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcWebhook {
  id: string
  name: string
  url: string
  events: string[]
  sources: string[]
  listid: string
  cdate: string
  links: Record<string, string>
}

export interface AcDealTask {
  id: string
  title: string
  ownerType: string
  relid: string
  reltype: string
  status: number
  note: string
  duedate: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcUser {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone: string
  links: Record<string, string>
}

export interface AcForm {
  id: string
  name: string
  action: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcSegment {
  id: string
  name: string
  logic: string
  hidden: number
  links: Record<string, string>
}

export interface AcScore {
  id: string
  name: string
  descript: string
  status: number
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcSavedResponse {
  id: string
  title: string
  subject: string
  body: string
  ldate: string
  last_sent_user_id: string
  cdate: string
  mdate: string
  links: Record<string, string>
}

export interface AcEcomOrder {
  id: string
  externalid: string
  source: number
  email: string
  orderNumber: string
  orderUrl: string
  orderDate: string
  shippingMethod: string
  totalPrice: number
  currency: string
  connectionid: string
  customerid: string
  links: Record<string, string>
}

export interface AcEcomCustomer {
  id: string
  connectionid: string
  externalid: string
  email: string
  totalRevenue: string
  totalOrders: string
  totalProducts: string
  cdate: string
  links: Record<string, string>
}

export interface AcAddress {
  id: string
  companyName: string
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  country: string
  allgroup: number
  isDefault: number
  links: Record<string, string>
}

export interface AcFieldValue {
  contact: string
  field: string
  value: string
  cdate: string
  udate: string
  links: Record<string, string>
}

export interface AcVariable {
  id: string
  name: string
  description: string
  default_value: string
  group: string
  links: Record<string, string>
}

export interface AcPaginatedResponse<T> {
  meta?: { total?: string }
  [key: string]: T[] | unknown
}
