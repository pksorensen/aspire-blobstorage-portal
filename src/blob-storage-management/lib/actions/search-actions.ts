'use server'

import { redirect } from 'next/navigation'

/**
 * Server Action for handling search queries
 */
export async function handleSearch(formData: FormData) {
  const query = formData.get('q')?.toString()?.trim()
  
  if (query) {
    redirect(`/search?q=${encodeURIComponent(query)}`)
  } else {
    redirect('/search')
  }
}

/**
 * Server Action for clearing search queries
 */
export async function clearSearch() {
  redirect('/search')
}