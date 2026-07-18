export type ShellOpenInTarget = {
  id: string
  label: string
  href?: string
  onSelect?: () => void | Promise<void>
}
