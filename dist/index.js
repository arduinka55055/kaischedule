// Спонсор показу: клятий CORS
// клятий CORS: піднімай свій сервер навіть для 100% локальної проги.

// Порада дня: немає нічого соромного у вайб кодингу
// особливо якщо цей код ніхто окрім мене не відкриватиме
const nauGroupListURL = "/proxy/schedule/group/list"
const nauGroupScheduleURL = "/proxy/schedule/group"
const nauElectiveScheduleURL = "/proxy/schedule/elective"

const nauTeacherListURL = "/proxy/schedule/staff/list"
const nauTeacherScheduleURL = "/proxy/schedule/staff/"

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


/**
 * Коротше кажучи, це офігенний алгоритм який шукає схожі слова
 * 
 * Calculates the Levenshtein distance between two strings.
 * This is the minimum number of single-character edits 
 * (insertions, deletions, or substitutions) required to change one word into the other.
 * * @param {string} a The first string.
 * @param {string} b The second string.
 * @returns {number} The Levenshtein distance.
 */
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment along the first row of each column
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}


function normalizeName(name) {
    return name.toLowerCase().replace(/ё/g, "е").split(/\s+/).filter(Boolean);
}

// Generate all permutations of an array
function permutations(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    arr.forEach((item, i) => {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        permutations(rest).forEach(p => result.push([item, ...p]));
    });
    return result;
}

function nameDistance(query, candidate) {
    const qTokens = normalizeName(query);
    const cTokens = normalizeName(candidate);

    // Pad shorter with empty string to compare fairly
    while (qTokens.length < cTokens.length) qTokens.push("");
    while (cTokens.length < qTokens.length) cTokens.push("");

    let bestScore = Infinity;
    for (const perm of permutations(cTokens)) {
        let total = 0;
        for (let i = 0; i < qTokens.length; i++) {
            total += levenshteinDistance(qTokens[i], perm[i]);
        }
        bestScore = Math.min(bestScore, total);
    }

    // Normalize by average length
    const avgLen = (qTokens.join("").length + cTokens.join("").length) / 2;
    return bestScore / avgLen;
}

/**
 * Finds the top 10 group names from an object that are the closest Levenshtein matches 
 * to a given search query.
 * * @param {Object<string, string>} groupObject The lookup object (groupName -> id).
 * @param {string} query The search string (e.g., 'Б-G11').
 * @param {number} [limit=10] The maximum number of results to return.
 * @returns {Array<Object>} An array of the top matches, sorted by lowest distance.
 */
function findTopMatches(groupObject, query, limit = 10) {

    const results = [];
    const normalizedQuery = query.toUpperCase().trim();

    for (const groupName in groupObject) {
        if (Object.prototype.hasOwnProperty.call(groupObject, groupName)) {
            const normalizedGroupName = groupName.toUpperCase().trim();
            
            // 1. Calculate Levenshtein Distance
            const distance = nameDistance(normalizedGroupName, normalizedQuery);
            
            // 2. Determine "Starts With" Match
            // A flag that is TRUE if the group name starts with the query.
            const startsWithMatch = normalizedGroupName.startsWith(normalizedQuery);

            results.push({
                groupName: groupName,
                id: groupObject[groupName],
                distance: distance,
                // Add the new scoring factor
                startsWithMatch: startsWithMatch 
            });
        }
    }

    // Sort logic now prioritizes 'startsWithMatch' first, then 'distance'.
    results.sort((a, b) => {
        // Step 1: Prioritize startsWithMatch.
        // True (1) should come before False (0).
        // Since we want TRUE to be a better score (closer to 0), we use b.startsWithMatch - a.startsWithMatch.
        const startsWithScore = (b.startsWithMatch ? 1 : 0) - (a.startsWithMatch ? 1 : 0);
        if (startsWithScore !== 0) {
            return startsWithScore;
        }

        // Step 2: If startsWithMatch is the same (both true or both false), sort by Levenshtein distance.
        // Lower distance is better (a - b).
        if (a.distance !== b.distance) {
            return a.distance - b.distance;
        }

        // Step 3: Tie-break by groupName (ascending: for consistent sorting).
        return a.groupName.localeCompare(b.groupName);
    });

    // Return only the top 'limit' results
    return results.slice(0, limit);
}

// Парсинг списку груп і посилань на розклади
async function scrapeGroupData() {

    const response = await fetch(nauGroupListURL);
    const htmlText = await response.text();

    // DOM парсинг
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Вибираємо посилання у .groups-list (сподіваюся що digital university не мінятиме його)
    const groupLinks = doc.querySelectorAll('.groups-list > div > a');

    const groupLookup = {};

    groupLinks.forEach(link => {

        // Видаляємо пробіли
        const groupName = link.textContent.trim();

        // Отримуємо посилання (відносне)
        const relativeUrl = link.getAttribute('href');

        // Темна магія regex
        if (groupName && relativeUrl) {
            const match = relativeUrl.match(/[?&]id=(\d+)/);
            const id = match ? match[1] : null;
            groupLookup[groupName] = id;
        }
    });

    return groupLookup;
}

// Типу lazy load. 
if (!window._groupDataPromise) {
    window._groupDataPromise = scrapeGroupData();
}

async function LazyGroupData() {
    window.GroupData = await window._groupDataPromise;
    return window.GroupData;
}



// Парсинг списку викладачів і посилань на викладацькі розклади
async function scrapeTeacherData() {
    const response = await fetch(nauTeacherListURL);
    const htmlText = await response.text();

    // DOM парсинг
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Вибираємо посилання у .teachers-list (сподіваюся що digital university не мінятиме його)
    const teacherLinks = doc.querySelectorAll('.teachers-list li > a');

    const teacherLookup = {};

    teacherLinks.forEach(link => {

        // Видаляємо пробіли
        const teacherName = link.textContent.trim();

        // Отримуємо посилання (відносне)
        const relativeUrl = link.getAttribute('href');

        // Темна магія regex
        if (teacherName && relativeUrl) {
            const match = relativeUrl.match(/[?&]id=(\d+)/);
            const id = match ? match[1] : null;

            if (id) {
                teacherLookup[teacherName] = id;
            }
        }
    });

    return teacherLookup;
}

// Типу lazy load. 
if (!window._teacherDataPromise) {
    window._teacherDataPromise = scrapeTeacherData();
}

async function LazyTeacherData() {
    window.TeacherData = await window._teacherDataPromise;
    return window.TeacherData;
}


// Хелпер щоб парсити пари розкладу групи
function parsePair(pair, isTeacher = false) {
    const event = pair.querySelector(".subject")?.textContent.trim() ?? "";
    const place = (pair.querySelector(".room")?.textContent.trim() ?? "").replace("ауд. ", "");

    let note;
    if(isTeacher){
        note = pair.querySelector(".flow-groups")?.textContent.trim() ?? "";
    }
    else
    {
        note = pair.querySelector(".teacher")?.textContent.trim() ?? "";
    }

    const timetable = parseInt(
        pair.closest("tr").querySelector("th .name")?.textContent.trim() ?? "0"
    );
    const eventType = pair.querySelector(".activity-tag")?.textContent.trim() ?? "";
    return { event, place, note, timetable, type: eventType };
}

async function extractGroupScheduleHTML(groupID) {
    const response = await fetch(nauGroupScheduleURL + "?id=" + groupID);
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

async function extractTeacherScheduleHTML(teacherID) {

    const response = await fetch(nauTeacherScheduleURL + "?id=" + teacherID);
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
                        const entry = parsePair(pair, true);
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



function normalize2(str) {
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

async function idToTeacher(id) {
    const object = await LazyTeacherData();
    return Object.keys(object).find(key => object[key] === id);
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
            return normalize2(row.textContent).includes(normalize2(discipline));
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
function generateSchedule(week1Data, week2Data, teacher = 0, expandedFields=false, useWeekends=true, minPairs = 5) {
    let daysOfWeekChoice = useWeekends ? daysOfWeek : daysOfWeek.slice(0,5);
    const weeks = daysOfWeekChoice.map((day, dayIdx) => ({
        ...day,
        week1Events: week1Data[dayIdx],
        week2Events: week2Data[dayIdx]
    }));
    const daysTotal = Math.max(minPairs,
        ...[...week1Data, ...week2Data].flat().map(e => e.timetable)
    );

    expandedFields = expandedFields?.checked ? "height: 0.72cm;" : "";
    const date = new Date().toLocaleDateString('en-CA')
    const caption = (teacher?.length) ? teacher : "тиждень 1 / тиждень 2";
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
th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top;}
td { ${expandedFields} }
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
<h3>Навчальний розклад (${caption}) <span style="float:right">${date}</span></h3>
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
    var date = new Date().toLocaleDateString('en-CA')
    a.download = `kai-schedule-${date}.html`;
    a.click();
}


// -------------------- ICS generation/export --------------------
function pad(n, len = 2) { return String(n).padStart(len, '0'); }

function formatDateTimeLocal(dt) {
    // Format as YYYYMMDDTHHMMSS (floating local time)
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcsText(s) {
    if (!s) return '';
    return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function generateIcsContent(week1Data, week2Data, rangeStart, rangeEnd) {
    const msDay = 24 * 60 * 60 * 1000;
    const msWeek = 7 * msDay;

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
