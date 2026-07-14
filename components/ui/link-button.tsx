'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ButtonProps } from './button'

interface LinkButtonProps extends Omit<ButtonProps, 'asChild'> {
  href: string
}

export function LinkButton({ href, children, onClick, ...props }: LinkButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (onClick) onClick(e)

    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <Button {...props} isLoading={isPending || props.isLoading} onClick={handleClick}>
      {children}
    </Button>
  )
}
