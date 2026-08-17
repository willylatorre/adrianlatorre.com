const FRONTMATTER_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/

export function parseBlogDateMs(date?: string) {
  if (!date) return 0

  const frontmatterDate = FRONTMATTER_DATE_PATTERN.exec(date)
  if (frontmatterDate) {
    const [, year, month, day] = frontmatterDate
    const yearNumber = Number(year)
    const monthIndex = Number(month) - 1
    const dayNumber = Number(day)
    const parsed = new Date(yearNumber, monthIndex, dayNumber)

    if (
      parsed.getFullYear() !== yearNumber
      || parsed.getMonth() !== monthIndex
      || parsed.getDate() !== dayNumber
    ) {
      return 0
    }

    return parsed.getTime()
  }

  const parsed = Date.parse(date)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatBlogDate(date: string, month: 'short' | 'long') {
  const parsed = parseBlogDateMs(date)
  if (!parsed) return date

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month,
    day: '2-digit',
  }).format(parsed)
}
