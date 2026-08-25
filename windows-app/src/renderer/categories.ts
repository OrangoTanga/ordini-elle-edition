import React from 'react'
import { Wine, Image, Tag } from '@phosphor-icons/react'

export const DEFAULT_CATEGORIES = ['vino bianco', 'vino rosso', 'prosecco', 'birre', 'distillati', 'extra']

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'vino bianco': Wine,
  'vino rosso': Wine,
  'prosecco': Wine,
  'birre': Wine,
  'distillati': Wine,
  'extra': Image as unknown as React.ElementType,
}

export function categoryIcon(name: string): React.ElementType {
  return CATEGORY_ICONS[name] || Tag
}