const nauGroupScheduleURL = "https://cors-anywhere.herokuapp.com/https://portal.nau.edu.ua/schedule/group"

// Fixed timetable lookup: startTime => timetable index
const timeToIndex = {
    "08:00": 1,
    "09:50": 2,
    "11:40": 3,
    "13:30": 4,
    "15:20": 5,
    "17:10": 6
};

// Map day names to indexes (0 = Monday)
const dayToIndex = {
    "Понеділок": 0,
    "Вівторок": 1,
    "Середа": 2,
    "Четвер": 3,
    "П`ятниця": 4,
    "Субота": 5,
    "Неділя": 6
};

// Helper to parse a "pair"
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

async function extractGroupScheduleHTML(groupID = 334) {
    debugger;
    const response = await fetch(nauGroupScheduleURL + "?id=" + groupID, {
        headers: {
            "x-requested-with": "https://cors-anywhere.herokuapp.com/"
        }
    });
    console.log(response)
    const htmlText = await response.text();
    console.log(htmlText)

    // Parse into DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // Initialize week structures
    const scheduleWeek1 = Array.from({ length: 7 }, () => []);
    const scheduleWeek2 = Array.from({ length: 7 }, () => []);

    // Parse week tables
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

    // Output result
    console.log("Week 1 Schedule:", scheduleWeek1);
    console.log("Week 2 Schedule:", scheduleWeek2);

    return [scheduleWeek1, scheduleWeek2]
}




//extractGroupScheduleHTML(334)


var mocksched1 = [
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Теорія прийняття рішень",
            "place": "6.203",
            "note": "Воронін Альберт Миколайович",
            "timetable": 3,
            "type": "Лекція"
        },
        {
            "event": "Технології захисту інформації",
            "place": "1.403",
            "note": "Сидоренко Вікторія Миколаївна",
            "timetable": 4,
            "type": "Лекція"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Технологія створення програмних продуктів",
            "place": "6.206-1",
            "note": "Райчев Ігор Едуардович",
            "timetable": 4,
            "type": "Лабораторна"
        },
        {
            "event": "Управління ІТ проєктами",
            "place": "6.202",
            "note": "Толстікова Олена Володимирівна",
            "timetable": 5,
            "type": "Лекція"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Методи та системи штучного інтелекту",
            "place": "11.215",
            "note": "Савченко Аліна Станіславівна",
            "timetable": 3,
            "type": "Лекція"
        },
        {
            "event": "Технологія створення програмних продуктів",
            "place": "8.104",
            "note": "Райчев Ігор Едуардович",
            "timetable": 4,
            "type": "Лекція"
        },
        {
            "event": "Технології захисту інформації",
            "place": "6.302-2",
            "note": "Сидоренко Вікторія Миколаївна",
            "timetable": 5,
            "type": "Лабораторна"
        },
        {
            "event": "Методи та системи штучного інтелекту",
            "place": "6.204",
            "note": "Мельниченко Поліна Ігорівна",
            "timetable": 6,
            "type": "Лабораторна"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        }
    ],
    [],
    []
]

var mocksched2 = [
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Управління ІТ проєктами",
            "place": "8.103",
            "note": "Толстікова Олена Володимирівна",
            "timetable": 3,
            "type": "Лекція"
        },
        {
            "event": "Теорія прийняття рішень",
            "place": "6.201",
            "note": "Воронін Альберт Миколайович",
            "timetable": 4,
            "type": "Лекція"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Методи та системи штучного інтелекту",
            "place": "6.206-1",
            "note": "Мельниченко Поліна Ігорівна",
            "timetable": 3,
            "type": "Лабораторна"
        },
        {
            "event": "Управління ІТ проєктами",
            "place": "6.206-1",
            "note": "Водоп`янов Сергій В`ячеславович",
            "timetable": 4,
            "type": "Лабораторна"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Методи та системи штучного інтелекту",
            "place": "6.302-2",
            "note": "Савченко Аліна Станіславівна",
            "timetable": 3,
            "type": "Лекція"
        },
        {
            "event": "Технологія створення програмних продуктів",
            "place": "3.201",
            "note": "Райчев Ігор Едуардович",
            "timetable": 4,
            "type": "Лекція"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        },
        {
            "event": "Теорія прийняття рішень",
            "place": "6.206-1",
            "note": "Мельниченко Поліна Ігорівна",
            "timetable": 3,
            "type": "Лабораторна"
        },
        {
            "event": "Технології захисту інформації",
            "place": "6.206-2",
            "note": "Сидоренко Вікторія Миколаївна",
            "timetable": 4,
            "type": "Лабораторна"
        }
    ],
    [
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 1,
            "type": ""
        },
        {
            "event": "Вибіркові дисципліни(з ІІ тижня, 08.09.2025)",
            "place": "",
            "note": "Розклад буде в електронному кабінеті здобувача",
            "timetable": 2,
            "type": ""
        }
    ],
    [],
    []
]



var individualData = [
    {
        "discipline": "Розумне споживання та сталий розвиток",
        "startTime": "08:00",
        "endTime": "09:35",
        "type": "Практ.",
        "day": "Понеділок",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Проєктна робота в лабораторії Ajax (аеронавігація, електроніка та телекомунікації)",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Лаб.",
        "day": "Понеділок",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Адміністрування комп'ютерних мереж",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Практ.",
        "day": "Середа",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Розумне споживання та сталий розвиток",
        "startTime": "08:00",
        "endTime": "09:35",
        "type": "Лекц.",
        "day": "Четвер",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Проєктна робота в лабораторії Ajax (аеронавігація, електроніка та телекомунікації)",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Лаб.",
        "day": "Четвер",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Адміністрування комп'ютерних мереж",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Лекц.",
        "day": "П`ятниця",
        "week": "1 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Проєктна робота в лабораторії Ajax (аеронавігація, електроніка та телекомунікації)",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Лаб.",
        "day": "Понеділок",
        "week": "2 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Адміністрування комп'ютерних мереж",
        "startTime": "09:50",
        "endTime": "11:25",
        "type": "Практ.",
        "day": "Середа",
        "week": "2 тиждень (вибіркові розпочинаються з 08.09.2025)"
    },
    {
        "discipline": "Розумне споживання та сталий розвиток",
        "startTime": "08:00",
        "endTime": "09:35",
        "type": "Лекц.",
        "day": "Четвер",
        "week": "2 тиждень (вибіркові розпочинаються з 08.09.2025)"
    }
];


debugger;

function enhanceSchedule(groupSchedule, individualData, weekNumber) {
    // Clone original schedule
    const enhanced2 = groupSchedule.map(dayEvents => dayEvents.slice());

    const enhanced = enhanced2.map(day =>
        day.filter(event => !event.event.startsWith("Вибіркові дисципліни"))
    );

    // Filter individual lessons for this week
    const weekLessons = individualData.filter(item => item.week.startsWith(weekNumber));

    debugger;

    weekLessons.forEach(lesson => {
        const dayIdx = dayToIndex[lesson.day];
        const timetable = timeToIndex[lesson.startTime];
        if (dayIdx === undefined || timetable === undefined) return;

        // Replace any "Вибіркові дисципліни" entry at this time
        const dayEvents = enhanced[dayIdx];
        debugger;
        // Remove any existing "Вибіркові дисципліни" at this timetable
        for (let i = dayEvents.length - 1; i >= 0; i--) {
            if (dayEvents[i].event.includes("Вибіркові дисципліни")) {
                dayEvents.splice(i, 1);
            }
        }

        // Push new individual lesson
        dayEvents.push({
            event: lesson.discipline,
            place: "",         // no classroom info
            note: "",          // no teacher info
            timetable: timetable,
            type: lesson.type  // use type from individualData
        });
    });

    // Sort each day's events by timetable
    enhanced.forEach(dayEvents => dayEvents.sort((a, b) => a.timetable - b.timetable));

    return enhanced;
}


const enhancedSchedule1 = enhanceSchedule(mocksched1, individualData, "1 тиждень");
const enhancedSchedule2 = enhanceSchedule(mocksched2, individualData, "2 тиждень");


console.log(enhancedSchedule1);
console.log(enhancedSchedule2);

//////



// Regex helper
function regexMatch(s, pattern) {
    const match = s.match(pattern);
    return match ? match[1] : "";
}

// Generate schedule HTML
async function generateSchedule(week1File, week2File) {
    const week1Data = enhancedSchedule1;//await loadJSON(week1File);
    const week2Data = enhancedSchedule2;// await loadJSON(week2File);

    const daysOfWeek = [
        { name: 'Понеділок', shortName: 'Пн' },
        { name: 'Вівторок', shortName: 'Вт' },
        { name: 'Середа', shortName: 'Ср' },
        { name: 'Четвер', shortName: 'Чт' },
        { name: "П'ятниця", shortName: 'Пт' },
        { name: 'Субота', shortName: 'Сб' },
        { name: 'Неділя', shortName: 'Нд' }
    ];

    const weeks = [
        { weekNumber: 1, days: daysOfWeek.map((d, i) => ({ ...d, events: week1Data[i] })) },
        { weekNumber: 2, days: daysOfWeek.map((d, i) => ({ ...d, events: week2Data[i] })) }
    ];

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
.rotated-text { writing-mode: sideways-lr; display: inline-block; white-space: nowrap; text-align: center; padding-top: 2mm; }
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
${weeks.map(week => `
<div class="page">
<h3>Тиждень ${week.weekNumber}</h3>
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
<th></th><th>Пара</th><th>I підгрупа</th><th>Ауд.</th><th>II підгрупа</th><th>Ауд.</th>
</tr>
</thead>
<tbody>
${week.days.map(day => {
        return Array.from({ length: 6 }, (_, time) => {
            const timeIndex = time + 1;
            const events = day.events.filter(e => e.timetable === timeIndex);
            let rowHtml = `<tr${time === 0 ? ' style="border-top:2px solid;"' : ''}>`;
            if (time === 0) {
                rowHtml += `<td class="day-header" rowspan="6"><div class="rotated-text">${day.name}</div></td>`;
            }
            rowHtml += `<td>${timeIndex}</td>`;

            for (let subgroup = 1; subgroup <= 2; subgroup++) {
                let subgroupEvent = events.find(e => e.grouptype === `Підгрупа ${subgroup}`);
                if (!subgroupEvent && events.length && (events[0].type === "Лекція" || !events[0].grouptype)) {
                    subgroupEvent = events[0];
                }
                const lectureClass = subgroupEvent && subgroupEvent.type === "Лекція" ? "lecture" : "";
                rowHtml += `<td class="${lectureClass}">${subgroupEvent ? `<strong>${subgroupEvent.event}</strong><br>${subgroupEvent.note || ''}` : ''}</td>`;
                rowHtml += `<td class="${lectureClass}">${subgroupEvent ? regexMatch(subgroupEvent.place || '', /\.([\d\.-]+)/) : ''}</td>`;
            }

            rowHtml += `</tr>`;
            return rowHtml;
        }).join('');
    }).join('')}
</tbody>
</table>
<br>
</div>
`).join('')}
</body>
</html>
`;


    // Or trigger download
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schedule.html";
    a.click();
}

// Example usage
generateSchedule();
