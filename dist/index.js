// Спонсор показу: клятий CORS
// клятий CORS: піднімай свій сервер навіть для 100% локальної проги.
const nauGroupScheduleURL = "/proxy/schedule/group"
const nauElectiveScheduleURL = "/proxy/schedule/elective"

// Табличка часу розкладу
const timeToIndex = {
    "08:00": 1,
    "09:50": 2,
    "11:40": 3,
    "13:30": 4,
    "15:20": 5,
    "17:10": 6
};

// Мапинг днів тижня до індексів
const dayToIndex = {
    "Понеділок": 0,
    "Вівторок": 1,
    "Середа": 2,
    "Четвер": 3,
    "П`ятниця": 4,
    "Субота": 5,
    "Неділя": 6
};

const timetable = [
    ["08:00", "09:35"],
    ["09:50", "11:25"],
    ["11:40", "13:15"],
    ["13:30", "15:05"],
    ["15:20", "16:55"],
    ["17:10", "18:45"]
];

// Мапинг індексів у дні тижня
const daysOfWeek = [
    { name: 'Понеділок', shortName: 'Пн' },
    { name: 'Вівторок', shortName: 'Вт' },
    { name: 'Середа', shortName: 'Ср' },
    { name: 'Четвер', shortName: 'Чт' },
    { name: "П'ятниця", shortName: 'Пт' },
    { name: 'Субота', shortName: 'Сб' },
    { name: 'Неділя', shortName: 'Нд' }
];

// Хелпер щоб парсити пари розкладу групи
function parsePair(pair) {
    const event = pair.querySelector(".subject")?.textContent.trim() ?? "";
    const place = (pair.querySelector(".room")?.textContent.trim() ?? "").replace("ауд. ", "");
    const note = pair.querySelector(".teacher")?.textContent.trim() ?? "";
    const timetable = parseInt(
        pair.closest("tr").querySelector("th .name")?.textContent.trim() ?? "0"
    );
    const eventType = pair.querySelector(".activity-tag")?.textContent.trim() ?? "";
    return { event, place, note, timetable, type: eventType };
}

async function extractGroupScheduleHTML(groupID) {
    //debugger;
    const response = await fetch(nauGroupScheduleURL + "?id=" + groupID, {
        headers: {
            //"x-requested-with": "https://cors-anywhere.herokuapp.com/"
        }
    });
    const htmlText = await response.text();

    // DOM парсинг
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Структура тижнів
    const scheduleWeek1 = Array.from({ length: 7 }, () => []);
    const scheduleWeek2 = Array.from({ length: 7 }, () => []);

    // Парсинг табличок з сайту КАІ
    const tables = doc.querySelectorAll("table.schedule");
    tables.forEach((table, weekIndex) => {
        const weekSchedule = weekIndex === 0 ? scheduleWeek1 : scheduleWeek2;

        table.querySelectorAll("tr").forEach((row, rowIdx) => {
            if (rowIdx === 0) return; // skip header

            const hour = row.querySelector("th.hour-name");
            if (!hour) return;

            // Each <td> is a day column
            row.querySelectorAll("td").forEach((cell, dayIdx) => {
                cell.querySelectorAll("div.pair").forEach((pair) => {
                    if (pair.querySelector(".subject")) {
                        const entry = parsePair(pair);
                        weekSchedule[dayIdx].push(entry);
                    }
                });
            });
        });
    });

    // Дебаг виведення
    console.log("Груповий розклад тижня 1:", scheduleWeek1);
    console.log("Груповий розклад тижня 2:", scheduleWeek2);

    return [scheduleWeek1, scheduleWeek2]
}


function normalize(str) {
  return str
    // decode HTML entities
    .replace(/&[#A-Za-z0-9]+;/g, entity => {
      const txt = document.createElement("textarea");
      txt.innerHTML = entity;
      return txt.value;
    })
    // keep only English + Ukrainian letters and spaces
    .replace(/[^a-zA-Zа-щА-ЩЬьЮюЯяЇїІіЄєҐґ ]/g, "")
    // collapse extra spaces
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
// Отримати інфу з індивід. дисциплін (як завжди її засунули у саму дупу)
async function getScheduleInfo(day_id, hour_id, discipline) {

    try {
        // Fetch the page
        const response = await fetch(nauElectiveScheduleURL + `?day_id=${day_id}&hour_id=${hour_id}`, { mode: "cors" });
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        // Get HTML text
        const html = await response.text();

        // Parse it into a DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Find all table rows that might contain schedule info
        const rows = Array.from(doc.querySelectorAll("tr"));

        // Look for discipline in rows
        const match = rows.find(row => {
            return normalize(row.textContent).includes(normalize(discipline));
        });

        if (!match) {
            debugger;
            return null; // Not found
        }

        // Extract cells for structured data
        const cells = Array.from(match.querySelectorAll("td")).map(td => td.textContent.trim());

        return {
            discipline: discipline,
            rawText: match.textContent.trim(),
            cells: cells
        };
    } catch (err) {
        console.error("Error:", err);
        return null;
    }
}



// Засунути індивідуальні предмети у груповий розклад
async function enhanceSchedule(groupSchedule, individualData, weekNumber) {

    // Вирізаємо Вибіркові дисципліни
    const enhanced = groupSchedule.map(day =>
        day.filter(event => !event.event.startsWith("Вибіркові дисципліни"))
    );

    // Фільтр індивідуальних по цьому тижню
    const weekLessons = individualData.filter(item => item.week.startsWith(weekNumber));

    for (const lesson of weekLessons) {
        const dayIdx = dayToIndex[lesson.day];
        const timetable = timeToIndex[lesson.startTime];
        if (dayIdx === undefined || timetable === undefined) return;

        const dayEvents = enhanced[dayIdx];

        const electiveInfo = await getScheduleInfo(dayIdx + (weekNumber[0] == "1" ? 1 : 8), timetable, lesson.discipline);
        debugger;
        // Push new individual lesson
        dayEvents.push({
            event: lesson.discipline,
            place: electiveInfo?.cells[3],         // classroom info
            note: electiveInfo?.cells[2],          // teacher info
            timetable: timetable,
            type: lesson.type.includes("Лекц") ? "Лекція" : lesson.type // use type from individualData
        });
    }

    //Сортуємо події по timetable
    enhanced.forEach(dayEvents => dayEvents.sort((a, b) => a.timetable - b.timetable));

    return enhanced;
}



// Генератор HTML
function generateSchedule(week1Data, week2Data) {
    const weeks = daysOfWeek.map((day, dayIdx) => ({
        ...day,
        week1Events: week1Data[dayIdx],
        week2Events: week2Data[dayIdx]
    }));
    const daysTotal = Math.max(5,
        ...[...week1Data, ...week2Data].flat().map(e => e.timetable)
    );

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<title>Навчальний розклад</title>
<style>
@page { size: A4; margin: 1cm; }
body { font-family: Arial, sans-serif; margin: 0; font-size: 10pt; }
.page { page-break-after: always; padding: 1cm; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
h3 { margin-left:5mm; }
th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
.day-header { background: #f8f9fa; font-weight: bold; width: 10mm; text-align: center; }
.rotated-text { transform: rotate(-90deg); transform-origin: left top; white-space: nowrap; display: inline-block; white-space: nowrap; text-align: center; padding-top: 1mm; text-align: right; width: 25mm; position: relative; top: 26mm; }
.time-slot { width: 5mm; text-align: center; }
.room { width: 20mm; border-right: 2px solid; }
.lecture { background-color: #eaeaea !important; }
@media print {
    body { background: white; }
    .page { padding: 0; }
    .lecture { background-color: #eaeaea !important; }
}
</style>
</head>
<body>
<div class="page">
<h3>Навчальний розклад (тиждень 1 / тиждень 2)</h3>
<table>
<colgroup>
<col class="day-header">
<col class="time-slot">
<col class="subgroup">
<col class="room">
<col class="subgroup">
<col class="room">
</colgroup>
<thead>
<tr>
<th></th><th></th><th>1 тиждень</th><th>Ауд.</th><th>2 тиждень</th><th>Ауд.</th>
</tr>
</thead>
<tbody>
${weeks.map(day => {
        return Array.from({ length: daysTotal }, (_, timeIdx) => {
            const time = timeIdx + 1;
            const w1Event = day.week1Events.find(e => e.timetable === time);
            const w2Event = day.week2Events.find(e => e.timetable === time);

            const lectureClass1 = w1Event && w1Event.type === "Лекція" ? "lecture" : "";
            const lectureClass2 = w2Event && w2Event.type === "Лекція" ? "lecture" : "";

            // Only render day header on first row
            const dayHeaderHtml = timeIdx === 0
                ? `<td class="day-header" rowspan="${daysTotal}"><div class="rotated-text">${day.name}</div></td>`
                : "";

            return `
<tr${timeIdx === 0 ? ' style="border-top:2px solid;"' : ''}>
${dayHeaderHtml}
<td>${time}</td>
<td class="${lectureClass1}">${w1Event ? `<strong>${w1Event.event}</strong><br>${w1Event.note || ''}` : ''}</td>
<td class="${lectureClass1}">${w1Event ? w1Event.place : ''}</td>
<td class="${lectureClass2}">${w2Event ? `<strong>${w2Event.event}</strong><br>${w2Event.note || ''}` : ''}</td>
<td class="${lectureClass2}">${w2Event ? w2Event.place : ''}</td>
</tr>`;
        }).join('');
    }).join('')}
</tbody>
</table>
</div>
</body>
</html>
`;

    return html;
}


function downloadHTML(html) {
    // Trigger download
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schedule.html";
    a.click();
}


// -------------------- ICS generation/export --------------------
function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function formatDateTimeLocal(dt) {
    // Format as YYYYMMDDTHHMMSS (floating local time)
    return `${dt.getFullYear()}${pad(dt.getMonth()+1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcsText(s) {
    if (!s) return '';
    return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function generateIcsContent(week1Data, week2Data, rangeStart, rangeEnd) {
    const msDay = 24*60*60*1000;
    const msWeek = 7*msDay;

    // compute Monday of start week
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const startDayOfWeek = (start.getDay() + 6) % 7; // 0=Mon
    const startWeekMonday = new Date(start);
    startWeekMonday.setDate(startWeekMonday.getDate() - startDayOfWeek);

    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Kaifix//Schedule//EN');
    const dtstamp = formatDateTimeLocal(new Date());

    let uidCounter = 0;

    // iterate each date in range inclusive
    for (let d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        const dayIndex = (d.getDay() + 6) % 7; // Monday=0

        const diffWeeks = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(startWeekMonday.getFullYear(), startWeekMonday.getMonth(), startWeekMonday.getDate())) / msWeek);
        const isWeek1 = (diffWeeks % 2 === 0);

        const eventsForDay = isWeek1 ? week1Data[dayIndex] || [] : week2Data[dayIndex] || [];

        for (const ev of eventsForDay) {
            // timetable index to get times
            const slot = timetable[ev.timetable - 1];
            if (!slot) continue;
            const [startTimeStr, endTimeStr] = slot; // e.g. '08:00'
            const [sh, sm] = startTimeStr.split(':').map(Number);
            const [eh, em] = endTimeStr.split(':').map(Number);

            const startDt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0);
            const endDt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0);

            lines.push('BEGIN:VEVENT');
            lines.push('UID:' + `kaifix-${Date.now()}-${uidCounter++}@local`);
            lines.push('DTSTAMP:' + dtstamp);
            lines.push('DTSTART:' + formatDateTimeLocal(startDt));
            lines.push('DTEND:' + formatDateTimeLocal(endDt));
            lines.push('SUMMARY:' + escapeIcsText(ev.event || ''));
            const descParts = [];
            if (ev.type) descParts.push(ev.type);
            if (ev.note) descParts.push(ev.note);
            if (ev.place) descParts.push('Ауд.: ' + ev.place);
            lines.push('DESCRIPTION:' + escapeIcsText(descParts.join(' | ')));
            if (ev.place) lines.push('LOCATION:' + escapeIcsText(ev.place));

            // Determine color: blue for practices (labs/practice), green for lectures
            const typeText = (ev.type || '').toLowerCase();
            const titleText = (ev.event || '').toLowerCase();
            let colorHex = '#3B82F6'; // default blue (practice)
            if (typeText.includes('лек') || titleText.includes('лек')) {
                colorHex = '#10B981'; // green for lectures
            } else if (typeText.includes('лаб') || typeText.includes('практ') || titleText.includes('лаб') || titleText.includes('практ')) {
                colorHex = '#3B82F6'; // blue for labs/practices
            }

            // Add color hints for Apple/Google and generic COLOR
            lines.push('COLOR:' + colorHex);
            lines.push('X-APPLE-CALENDAR-COLOR:' + colorHex);
            lines.push('X-GOOGLE-CALENDAR-COLOR:' + colorHex);

            // Add 30-minute display alarm
            lines.push('BEGIN:VALARM');
            lines.push('TRIGGER:-PT30M');
            lines.push('ACTION:DISPLAY');
            lines.push('DESCRIPTION:Нагадування про заняття');
            lines.push('END:VALARM');

            lines.push('END:VEVENT');
        }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

async function exportIcsFromInputs(startStr, endStr, selectedGroupID, individualJsonText) {
    // Parse inputs and fetch group schedule, then enhance and generate ICS
    const startVal = startStr;
    const endVal = endStr;
    if (!startVal || !endVal) throw new Error('Start or end date missing');

    const startDate = new Date(startVal);
    const endDate = new Date(endVal);
    if (endDate < startDate) throw new Error('End date before start date');

    // Parse individual JSON (may be empty array)
    let individual = [];
    try {
        individual = individualJsonText && individualJsonText.trim().length ? JSON.parse(individualJsonText) : [];
    } catch (e) {
        throw new Error('Invalid individual JSON: ' + e.message);
    }

    // Fetch group schedules
    const [group1, group2] = await extractGroupScheduleHTML(selectedGroupID || '');

    // Enhance schedules with individual data
    const enhanced1 = await enhanceSchedule(group1, individual, '1 тиждень');
    const enhanced2 = await enhanceSchedule(group2, individual, '2 тиждень');

    // Generate ICS content
    const ics = generateIcsContent(enhanced1, enhanced2, startDate, endDate);

    // Trigger download
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schedule_${startVal}_to_${endVal}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);

    return true;
}

// Expose helper to global so HTML can call it
window.exportIcsFromInputs = exportIcsFromInputs;
