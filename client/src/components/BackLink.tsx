import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  to: string
  label: string
}

export function BackLink({ to, label }: Props) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={to}><ArrowLeft className="mr-2 h-4 w-4" />{label}</Link>
    </Button>
  )
}
