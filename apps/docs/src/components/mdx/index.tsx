import { Accordion } from './Accordion'
import { Callout } from './Callout'
import { Card } from './Card'
import { CardGroup } from './CardGroup'
import { CodeBlock } from './CodeBlock'
import { PlatformOrbital } from './PlatformOrbital'
import { Step, Steps } from './Steps'
import { Tab, Tabs } from './Tabs'

function Table(props: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  )
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

function getTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) return children.map(getTextContent).join('')
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextContent((children as any).props.children)
  }
  return ''
}

function createHeading(level: number) {
  return function HeadingComponent({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) {
    const text = getTextContent(children)
    const id = slugify(text)
    const Tag = `h${level}` as 'h2' | 'h3' | 'h4'
    return (
      <Tag id={id} {...props}>
        {children}
      </Tag>
    )
  }
}

const H2 = createHeading(2)
const H3 = createHeading(3)
const H4 = createHeading(4)

export const mdxComponents: Record<string, React.ComponentType<any>> = {
  Callout,
  Card,
  CardGroup,
  Tabs,
  Tab,
  Steps,
  Step,
  Accordion,
  CodeBlock,
  PlatformOrbital,
  table: Table,
  h2: H2,
  h3: H3,
  h4: H4,
}

export { Callout, Card, CardGroup, Tabs, Tab, Steps, Step, Accordion, CodeBlock, PlatformOrbital }
