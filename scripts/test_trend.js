// Quick test script to reproduce buildDailyTrend output for tickets
const sampleTickets = [
  { id: 'TKT-001', createdAt: new Date('2026-06-01T09:15:00.000Z') },
  { id: 'TKT-002', createdAt: new Date('2026-06-01T08:42:00.000Z') },
  { id: 'TKT-003', createdAt: new Date('2026-06-01T08:10:00.000Z') },
  { id: 'TKT-004', createdAt: new Date('2026-05-31T14:35:00.000Z') },
  { id: 'TKT-005', createdAt: new Date('2026-05-31T12:15:00.000Z') },
  { id: 'TKT-006', createdAt: new Date('2026-06-01T07:40:00.000Z') },
  { id: 'TKT-007', createdAt: new Date('2026-05-31T18:00:00.000Z') },
  { id: 'TKT-008', createdAt: new Date('2026-06-01T06:25:00.000Z') },
  { id: 'TKT-009', createdAt: new Date('2026-05-30T13:40:00.000Z') },
  { id: 'TKT-010', createdAt: new Date('2026-06-01T05:55:00.000Z') },
  { id: 'TKT-011', createdAt: new Date('2026-05-31T16:20:00.000Z') },
  { id: 'TKT-012', createdAt: new Date('2026-05-30T11:45:00.000Z') },
]

function buildDailyTrend(queries, days, skipWeekends = false, tickets){
  const out = []
  let offset = 0
  while (out.length < days){
    const date = new Date()
    date.setHours(0,0,0,0)
    date.setDate(date.getDate() - offset)
    const jsDay = date.getDay()
    if (skipWeekends && (jsDay === 0 || jsDay === 6)) { offset += 1; continue }
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    const inDayQ = queries.filter(q => q.askedAt >= date && q.askedAt < next)
    const ticketsCount = tickets ? tickets.filter(t => t.createdAt >= date && t.createdAt < next).length : undefined
    out.push({ day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), asked: inDayQ.length, resolved: inDayQ.filter(q => q.wasResolved).length, tickets: ticketsCount })
    offset += 1
  }
  return out.reverse()
}

// For test, no queries provided; only tickets
const queries = []
const trend = buildDailyTrend(queries, 14, true, sampleTickets)
console.log(trend.map(r => ({ day: r.day, tickets: r.tickets })))
