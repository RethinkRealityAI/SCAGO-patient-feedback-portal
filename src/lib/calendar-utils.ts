/**
 * Calendar utilities for generating ICS files
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  meetingLink?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
  }>;
}

/**
 * Generate ICS file content for calendar events
 */
export function generateICSContent(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const description = event.description || '';
  const location = event.location || event.meetingLink || '';
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCAGO YEP//Meeting Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@scago-yep`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.start)}`,
    `DTEND:${formatDate(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
  ];

  if (location) {
    ics.push(`LOCATION:${escapeText(location)}`);
  }

  if (event.meetingLink && !location.includes(event.meetingLink)) {
    ics.push(`DESCRIPTION:${escapeText(description + (description ? '\\n\\n' : '') + 'Meeting Link: ' + event.meetingLink)}`);
  }

  if (event.organizer) {
    ics.push(`ORGANIZER;CN="${escapeText(event.organizer.name)}":MAILTO:${event.organizer.email}`);
  }

  if (event.attendees && event.attendees.length > 0) {
    event.attendees.forEach((attendee) => {
      ics.push(`ATTENDEE;CN="${escapeText(attendee.name)}":MAILTO:${attendee.email}`);
    });
  }

  ics.push('END:VEVENT');
  ics.push('END:VCALENDAR');

  return ics.join('\r\n');
}

/**
 * Download ICS file to user's device
 */
export function downloadICS(icsContent: string, filename: string = 'meeting.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL
 */
export function generateGoogleCalendarURL(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatDate(event.start)}/${formatDate(event.end)}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location || event.meetingLink) {
    params.append('location', event.location || event.meetingLink || '');
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 */
export function generateOutlookCalendarURL(event: CalendarEvent): string {
  const formatDate = (date: Date): string => {
    return date.toISOString();
  };

  const params = new URLSearchParams({
    subject: event.title,
    startdt: formatDate(event.start),
    enddt: formatDate(event.end),
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location || event.meetingLink) {
    params.append('location', event.location || event.meetingLink || '');
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Apple Calendar URL (uses ICS file)
 */
export function generateAppleCalendarURL(event: CalendarEvent): string {
  // Apple Calendar doesn't support URL parameters, so we use data URI
  const icsContent = generateICSContent(event);
  const dataUri = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  return dataUri;
}

