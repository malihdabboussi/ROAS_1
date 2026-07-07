import { VibeyLoadingOrb } from './VibeyLoadingOrb'

type Props = {
  text?: string
  className?: string
}

export function VibeyOrbLoader({ text, className = '' }: Props) {
  return (
    <div className={`vibey-orb-loader ${className}`.trim()}>
      <VibeyLoadingOrb text={text} state="processing" size="md" />
    </div>
  )
}
