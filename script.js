// Configuration
const SESSIONS = [
    { id: 'sydney', tz: 'Australia/Sydney', open: 21, close: 6, color: '#3b82f6' },
    { id: 'tokyo', tz: 'Asia/Tokyo', open: 0, close: 9, color: '#10b981' },
    { id: 'london', tz: 'Europe/London', open: 7, close: 16, color: '#f59e0b' },
    { id: 'ny', tz: 'America/New_York', open: 13, close: 22, color: '#ef4444' }
];

// Utilities
const pad = n => String(n).padStart(2, '0');

function getLocalTime(timeZone) {
    return new Date(new Date().toLocaleString('en-US', { timeZone }));
}

function formatTime(date) {
    return {
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
        seconds: pad(date.getSeconds()),
        date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })
    };
}

function getUtcHour() {
    return new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
}

function isMarketOpen(utcHour, start, end) {
    if (start > end) {
        // Crosses midnight (e.g., Sydney 21:00 - 06:00)
        return utcHour >= start || utcHour < end;
    }
    return utcHour >= start && utcHour < end;
}

function getSessionProgress(utcHour, start, end) {
    let duration = end - start;
    let elapsed = utcHour - start;

    if (start > end) {
        duration = (24 - start) + end;
        if (utcHour >= start) {
            elapsed = utcHour - start;
        } else {
            elapsed = (24 - start) + utcHour;
        }
    }

    const progress = (elapsed / duration) * 100;
    return Math.max(0, Math.min(100, progress));
}

function getTimeToNextEvent(utcHour, start, end) {
    const isOpen = isMarketOpen(utcHour, start, end);
    let target = isOpen ? end : start;
    
    let diff = target - utcHour;
    if (diff < 0) diff += 24;
    
    const hours = Math.floor(diff);
    const minutes = Math.floor((diff - hours) * 60);
    
    return {
        label: isOpen ? 'Closes in' : 'Opens in',
        text: `${hours}h ${minutes}m`,
        isOpen
    };
}

// UI Updates
function updateClock() {
    const now = new Date();
    const utcTime = formatTime(new Date(now.toISOString()));
    
    // Update UTC Header
    document.getElementById('utc-time').textContent = `${utcTime.time}:${utcTime.seconds}`;

    // Update Timeline Marker
    const utcHour = getUtcHour();
    const markerPos = (utcHour / 24) * 100;
    document.getElementById('timeline-marker').style.left = `${markerPos}%`;

    let openMarkets = 0;

    SESSIONS.forEach(session => {
        const card = document.getElementById(`card-${session.id}`);
        if (!card) return;

        // Local Time
        const localDate = getLocalTime(session.tz);
        const formatted = formatTime(localDate);
        
        card.querySelector('.main-time').textContent = formatted.time;
        card.querySelector('.seconds').textContent = formatted.seconds;
        card.querySelector('.date-display').textContent = formatted.date;

        // Status & Progress
        const { label, text, isOpen } = getTimeToNextEvent(utcHour, session.open, session.close);
        const progress = isOpen ? getSessionProgress(utcHour, session.open, session.close) : 0;

        // Update Badge
        const badge = card.querySelector('.status-badge');
        badge.className = `status-badge ${isOpen ? 'open' : 'closed'}`;
        badge.textContent = isOpen ? 'Open' : 'Closed';

        // Update Countdown
        card.querySelector('.countdown').textContent = text;
        card.querySelector('.info-row .label').textContent = label;

        // Update Progress Ring
        const circle = card.querySelector('.progress-ring__circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (progress / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        circle.style.stroke = isOpen ? session.color : 'rgba(255,255,255,0.1)';
        
        card.querySelector('.percentage').textContent = isOpen ? `${Math.round(progress)}%` : 'OFF';

        if (isOpen) openMarkets++;
    });

    // Global Status
    const globalStatus = document.getElementById('global-status');
    if (openMarkets === 0) {
        globalStatus.querySelector('.status-text').textContent = "All markets are closed";
        globalStatus.querySelector('.status-dot').style.color = "#ef4444";
    } else if (openMarkets >= 3) {
        globalStatus.querySelector('.status-text').textContent = "High market activity";
        globalStatus.querySelector('.status-dot').style.color = "#10b981";
    } else {
        globalStatus.querySelector('.status-text').textContent = `${openMarkets} market${openMarkets > 1 ? 's' : ''} open`;
        globalStatus.querySelector('.status-dot').style.color = "#3b82f6";
    }
}

function initTimeline() {
    const track = document.querySelector('.timeline-track');
    
    SESSIONS.forEach((session, index) => {
        const bar = document.createElement('div');
        bar.className = 'session-bar';
        bar.style.backgroundColor = session.color;
        bar.style.top = `${10 + (index * 20)}%`;
        bar.style.height = '15%';
        
        let start = session.open;
        let end = session.close;
        
        if (start > end) {
            // Split bar for cross-midnight sessions
            const bar1 = bar.cloneNode();
            bar1.style.left = `${(start / 24) * 100}%`;
            bar1.style.width = `${((24 - start) / 24) * 100}%`;
            track.appendChild(bar1);
            
            const bar2 = bar.cloneNode();
            bar2.style.left = '0%';
            bar2.style.width = `${(end / 24) * 100}%`;
            track.appendChild(bar2);
        } else {
            bar.style.left = `${(start / 24) * 100}%`;
            bar.style.width = `${((end - start) / 24) * 100}%`;
            track.appendChild(bar);
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initTimeline();
    updateClock();
    setInterval(updateClock, 1000);
});
