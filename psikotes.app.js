"use strict";
const { useState, useEffect, useRef } = React;
const WORKER_BASE = (/(^|\.)somandiritarobun\.my\.id$/.test(location.hostname) ? 'https://api.somandiritarobun.my.id' : 'https://tarobun-api.tepangbkj8.workers.dev');
let _lucideScheduled = false;
const scheduleLucideIcons = () => {
    if (_lucideScheduled)
        return;
    _lucideScheduled = true;
    requestAnimationFrame(() => {
        _lucideScheduled = false;
        if (window.lucide)
            window.lucide.createIcons();
    });
};
function Shell({ children }) {
    return (React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4" },
        React.createElement("div", { className: "w-full max-w-md" }, children)));
}
const NativeGuard = (() => {
    const get = () => {
        try {
            const C = window.Capacitor;
            if (!C || !C.isNativePlatform || !C.isNativePlatform())
                return null;
            if (C.isPluginAvailable && !C.isPluginAvailable('PsikotesGuard'))
                return null;
            return (C.Plugins && C.Plugins.PsikotesGuard) || null;
        }
        catch (e) {
            return null;
        }
    };
    return { plugin: get, available: () => !!get() };
})();
const natCall = (method, args) => {
    try {
        const p = NativeGuard.plugin();
        if (!p || typeof p[method] !== 'function')
            return Promise.resolve(null);
        return Promise.resolve(p[method](args || {})).catch(() => null);
    }
    catch (e) {
        return Promise.resolve(null);
    }
};
const PsikotesGuard = (() => {
    let siren = null, ringing = false, armed = false, fsEntered = false;
    let enforceTimer = null, vibTimer = null, titleTimer = null, wakeLock = null;
    const baseTitle = document.title;
    function buildSirenUrl() {
        const rate = 16000, secs = 2, n = rate * secs;
        const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
        const w = (o, str) => { for (let i = 0; i < str.length; i++)
            v.setUint8(o + i, str.charCodeAt(i)); };
        w(0, 'RIFF');
        v.setUint32(4, 36 + n * 2, true);
        w(8, 'WAVE');
        w(12, 'fmt ');
        v.setUint32(16, 16, true);
        v.setUint16(20, 1, true);
        v.setUint16(22, 1, true);
        v.setUint32(24, rate, true);
        v.setUint32(28, rate * 2, true);
        v.setUint16(32, 2, true);
        v.setUint16(34, 16, true);
        w(36, 'data');
        v.setUint32(40, n * 2, true);
        let ph = 0;
        for (let i = 0; i < n; i++) {
            const t = i / rate;
            const f = 1100 + 500 * Math.sin(2 * Math.PI * 2 * t);
            ph += 2 * Math.PI * f / rate;
            const x = Math.max(-1, Math.min(1, Math.sin(ph) * 1.8));
            v.setInt16(44 + i * 2, Math.round(x * 32000), true);
        }
        return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    }
    async function acquireWakeLock() {
        try {
            if (navigator.wakeLock && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        }
        catch (e) { }
    }
    function arm() {
        if (NativeGuard.available()) {
            armed = true;
            return;
        }
        try {
            if (!siren) {
                siren = new Audio(buildSirenUrl());
                siren.loop = true;
                siren.preload = 'auto';
                siren.setAttribute('playsinline', '');
                siren.addEventListener('volumechange', () => { if (ringing && (siren.volume < 1 || siren.muted)) {
                    siren.muted = false;
                    siren.volume = 1;
                } });
            }
            siren.muted = true;
            const pr = siren.play();
            if (pr && pr.then)
                pr.then(() => { siren.pause(); siren.currentTime = 0; siren.muted = false; }).catch(() => { siren.muted = false; });
        }
        catch (e) { }
        try {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req) {
                const r = req.call(el, { navigationUI: 'hide' });
                if (r && r.then)
                    r.then(() => { fsEntered = true; }).catch(() => { });
            }
        }
        catch (e) { }
        acquireWakeLock();
        document.addEventListener('visibilitychange', () => { if (!document.hidden && armed)
            acquireWakeLock(); });
        armed = true;
    }
    function startAlarm() {
        if (ringing || !siren)
            return;
        ringing = true;
        const tick = () => {
            if (!ringing)
                return;
            try {
                siren.muted = false;
                siren.volume = 1;
                if (siren.paused)
                    siren.play().catch(() => { });
            }
            catch (e) { }
        };
        try {
            siren.currentTime = 0;
        }
        catch (e) { }
        tick();
        enforceTimer = setInterval(tick, 400);
        const buzz = () => { try {
            navigator.vibrate && navigator.vibrate([700, 150, 700, 150, 700]);
        }
        catch (e) { } };
        buzz();
        vibTimer = setInterval(buzz, 2600);
        let on = false;
        titleTimer = setInterval(() => { on = !on; document.title = on ? '⚠️ KEMBALI KE PSIKOTES!' : baseTitle; }, 800);
    }
    function stopAlarm() {
        if (!ringing)
            return;
        ringing = false;
        clearInterval(enforceTimer);
        clearInterval(vibTimer);
        clearInterval(titleTimer);
        try {
            siren.pause();
            siren.currentTime = 0;
        }
        catch (e) { }
        try {
            navigator.vibrate && navigator.vibrate(0);
        }
        catch (e) { }
        document.title = baseTitle;
    }
    function reenterFullscreen() {
        try {
            const el = document.documentElement;
            const req = el.requestFullscreen || el.webkitRequestFullscreen;
            if (req)
                req.call(el, { navigationUI: 'hide' });
        }
        catch (e) { }
    }
    function release() {
        natCall('end');
        stopAlarm();
        try {
            if (wakeLock)
                wakeLock.release();
        }
        catch (e) { }
        wakeLock = null;
        try {
            if (document.fullscreenElement && document.exitFullscreen)
                document.exitFullscreen();
        }
        catch (e) { }
        fsEntered = false;
    }
    return { arm, startAlarm, stopAlarm, release, reenterFullscreen, isArmed: () => armed, isRinging: () => ringing, fullscreenWasEntered: () => fsEntered };
})();
function PsikotesOjtPublicPage({ linkToken, assigned }) {
    const storageKey = `tarobun_psikotes_attempt_${linkToken}`;
    const infoUrl = assigned ? `${WORKER_BASE}/api/psikotes/public/ojt/${linkToken}` : `${WORKER_BASE}/api/psikotes/public/${linkToken}`;
    const startUrl = assigned ? `${WORKER_BASE}/api/psikotes/public/ojt/${linkToken}/start` : `${WORKER_BASE}/api/psikotes/public/${linkToken}/start`;
    const [phase, setPhase] = useState('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [test, setTest] = useState(null);
    const [name, setName] = useState('');
    const [penempatan, setPenempatan] = useState('');
    const [storeDirectory, setStoreDirectory] = useState([]);
    const [dirLoading, setDirLoading] = useState(true);
    const [dirError, setDirError] = useState(false);
    const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
    const [storeSearchQuery, setStoreSearchQuery] = useState('');
    const storeDropdownRef = useRef(null);
    const [assignedInfo, setAssignedInfo] = useState(null);
    const [submittingStart, setSubmittingStart] = useState(false);
    const [attempt, setAttempt] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [qIndex, setQIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(null);
    const [timerExpired, setTimerExpired] = useState(false);
    const [armedUi, setArmedUi] = useState(false);
    const [allowFloating, setAllowFloating] = useState(false);
    const [floatingRequested, setFloatingRequested] = useState(false);
    const [requestingFloating, setRequestingFloating] = useState(false);
    const [ackFloating, setAckFloating] = useState(false);
    const [ackNotif, setAckNotif] = useState(false);
    const [ackAlarm, setAckAlarm] = useState(false);
    const [blockReason, setBlockReason] = useState('leave');
    const [fsLost, setFsLost] = useState(false);
    const [visited, setVisited] = useState({});
    const [navOpen, setNavOpen] = useState(false);
    const answersRef = useRef({});
    const syncedRef = useRef({});
    const pendingRef = useRef({});
    const native = NativeGuard.available();
    const [nativeSt, setNativeSt] = useState(null);
    const armedRef = useRef(false);
    const checklistOk = (allowFloating || ackFloating) && (native ? !!(nativeSt && nativeSt.dndGranted) : (ackNotif && ackAlarm));
    useEffect(() => { scheduleLucideIcons(); });
    useEffect(() => {
        if (assigned) {
            setDirLoading(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${WORKER_BASE}/api/psikotes/public/stores`);
                const data = await res.json();
                if (cancelled)
                    return;
                const dir = data.value || {};
                const list = Object.keys(dir).map(id => ({ id, name: dir[id] })).sort((a, b) => a.name.localeCompare(b.name));
                setStoreDirectory(list);
            }
            catch (e) {
                if (!cancelled)
                    setDirError(true);
            }
            finally {
                if (!cancelled)
                    setDirLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [assigned]);
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target)) {
                setStoreDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);
    const filteredStoreDirectory = storeDirectory.filter(s => !storeSearchQuery.trim() || s.name.toLowerCase().includes(storeSearchQuery.trim().toLowerCase()));
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(infoUrl);
                const data = await res.json();
                if (!res.ok) {
                    setErrorMsg(data.error || 'Link tidak valid');
                    setPhase('error');
                    return;
                }
                setTest(data.test);
                if (assigned)
                    setAssignedInfo({ ojtName: data.ojtName, storeName: data.storeName });
                if (assigned) {
                    setAllowFloating(!!data.allowFloating);
                    setFloatingRequested(!!data.floatingRequested);
                }
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        const statusRes = await fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${parsed.attemptId}/status`, { headers: { 'X-Attempt-Secret': parsed.attemptSecret } });
                        const statusData = await statusRes.json();
                        if (statusRes.ok) {
                            if (statusData.status === 'blocked') {
                                setAttempt(parsed);
                                setPhase('blocked');
                                return;
                            }
                            if (statusData.status === 'completed') {
                                setPhase('done');
                                return;
                            }
                            if (statusData.status === 'in_progress') {
                                if (await restoreSession(parsed)) {
                                    setPhase('taking');
                                    return;
                                }
                            }
                        }
                    }
                    catch (e) { }
                }
                if (assigned && data.alreadyUsed) {
                    setErrorMsg('Link ini sudah pernah dipakai untuk memulai psikotes. Kalau ini bukan kamu, hubungi admin/toko.');
                    setPhase('error');
                    return;
                }
                if (data.test.locked) {
                    setPhase('locked');
                    return;
                }
                setPhase(assigned ? 'confirm' : 'form');
            }
            catch (e) {
                setErrorMsg('Gagal memuat halaman psikotes. Periksa koneksi internet.');
                setPhase('error');
            }
        })();
    }, [linkToken]);
    const progressKey = `${storageKey}_progress`;
    const readLocalProgress = () => {
        try {
            return JSON.parse(localStorage.getItem(progressKey) || '{}') || {};
        }
        catch (e) {
            return {};
        }
    };
    const writeLocalProgress = (patch) => {
        try {
            localStorage.setItem(progressKey, JSON.stringify({ ...readLocalProgress(), ...patch }));
        }
        catch (e) { }
    };
    const restoreSession = async (att) => {
        try {
            const res = await fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${att.attemptId}/resume`, { headers: { 'X-Attempt-Secret': att.attemptSecret } });
            const data = await res.json();
            if (!res.ok || data.status !== 'in_progress' || !Array.isArray(data.questions) || data.questions.length === 0)
                return false;
            const local = readLocalProgress();
            const localAnswers = local.answers || {};
            const merged = { ...localAnswers, ...(data.answers || {}) };
            for (const q of data.questions) {
                if (localAnswers[q.id] !== undefined && localAnswers[q.id] !== '' && (data.answers || {})[q.id] === undefined) {
                    merged[q.id] = localAnswers[q.id];
                    fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${att.attemptId}/answer`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ attemptSecret: att.attemptSecret, questionId: q.id, answer: localAnswers[q.id] }),
                    }).catch(() => { });
                }
            }
            let idx = Number.isInteger(local.qIndex) ? local.qIndex : -1;
            if (idx < 0 || idx >= data.questions.length) {
                idx = data.questions.findIndex(q => merged[q.id] === undefined || merged[q.id] === '');
                if (idx < 0)
                    idx = data.questions.length - 1;
            }
            syncedRef.current = { ...(data.answers || {}) };
            setVisited(local.visited || {});
            setQuestions(data.questions);
            setAnswers(merged);
            setQIndex(idx);
            if (data.remainingSeconds !== null && data.remainingSeconds !== undefined) {
                setTimerSeconds(prev => (prev !== null ? prev : data.remainingSeconds));
            }
            if (data.allowFloating)
                setAllowFloating(true);
            if (armedRef.current && NativeGuard.available())
                await nativeBegin(att, data.allowFloating);
            setAttempt(att);
            return true;
        }
        catch (e) {
            return false;
        }
    };
    const requestFloating = async () => {
        setRequestingFloating(true);
        try {
            const res = await fetch(`${WORKER_BASE}/api/psikotes/public/ojt/${linkToken}/request-floating`, { method: 'POST' });
            if (res.ok)
                setFloatingRequested(true);
        }
        catch (e) { }
        setRequestingFloating(false);
    };
    useEffect(() => {
        if (!assigned || !floatingRequested || allowFloating || (phase !== 'confirm'))
            return;
        const iv = setInterval(async () => {
            try {
                const res = await fetch(infoUrl);
                const data = await res.json();
                if (res.ok) {
                    if (data.allowFloating)
                        setAllowFloating(true);
                    if (!data.floatingRequested)
                        setFloatingRequested(false);
                }
            }
            catch (e) { }
        }, 4000);
        return () => clearInterval(iv);
    }, [assigned, floatingRequested, allowFloating, phase]);
    useEffect(() => {
        if (!native)
            return;
        if (!(phase === 'confirm' || phase === 'form' || (phase === 'taking' && !armedUi)))
            return;
        let stop = false;
        const tick = async () => { const st = await natCall('precheck'); if (!stop && st)
            setNativeSt(st); };
        tick();
        const iv = setInterval(tick, 1500);
        return () => { stop = true; clearInterval(iv); };
    }, [native, phase, armedUi]);
    const nativeBegin = (att, allow) => natCall('begin', {
        flagUrl: `${WORKER_BASE}/api/psikotes/public/attempt/${att.attemptId}/flag-leave`,
        attemptSecret: att.attemptSecret,
        allowFloating: !!allow,
    });
    const handleStart = async () => {
        if (!assigned && (!name.trim() || !penempatan.trim()))
            return;
        if (!checklistOk)
            return;
        if (native) {
            const st = await natCall('precheck');
            if (st && st.overlay && !allowFloating) {
                setErrorMsg('Terdeteksi aplikasi ngambang di atas layar. Tutup dulu semuanya, atau minta izin Store Leader.');
                return;
            }
            if (st && !st.dndGranted) {
                setErrorMsg('Izin "Jangan Ganggu" belum diberikan, notifikasi belum bisa diblokir.');
                return;
            }
            setErrorMsg('');
        }
        PsikotesGuard.arm();
        armedRef.current = true;
        setArmedUi(true);
        setSubmittingStart(true);
        try {
            const res = await fetch(startUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assigned ? {} : { name: name.trim(), penempatan: penempatan.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'Gagal memulai psikotes');
                setSubmittingStart(false);
                return;
            }
            const attemptInfo = { attemptId: data.attemptId, attemptSecret: data.attemptSecret };
            localStorage.setItem(storageKey, JSON.stringify(attemptInfo));
            setAttempt(attemptInfo);
            if (data.allowFloating)
                setAllowFloating(true);
            if (native)
                await nativeBegin(attemptInfo, data.allowFloating || allowFloating);
            setQuestions(data.questions);
            if (data.timer_minutes) {
                setTimerSeconds(data.timer_minutes * 60);
            }
            setPhase('taking');
        }
        catch (e) {
            setErrorMsg('Gagal memulai psikotes. Periksa koneksi internet.');
        }
        finally {
            setSubmittingStart(false);
        }
    };
    useEffect(() => { if (phase === 'taking')
        writeLocalProgress({ qIndex }); }, [qIndex, phase]);
    answersRef.current = answers;
    useEffect(() => {
        if (phase !== 'taking' || !questions[qIndex])
            return;
        const id = questions[qIndex].id;
        setVisited(v => { if (v[id])
            return v; const nv = { ...v, [id]: 1 }; writeLocalProgress({ visited: nv }); return nv; });
    }, [qIndex, phase, questions]);
    useEffect(() => {
        if (phase !== 'taking')
            return;
        const el = document.querySelector('.qnav-strip .qnav-cur');
        if (el && el.parentNode)
            el.parentNode.scrollLeft = el.offsetLeft - el.parentNode.clientWidth / 2 + el.clientWidth / 2;
    }, [qIndex, phase, questions]);
    useEffect(() => {
        if (phase !== 'taking')
            return;
        const onOnline = () => { syncAll(); };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [phase, attempt, questions]);
    useEffect(() => {
        if (phase !== 'taking' || timerSeconds === null)
            return;
        if (timerSeconds <= 0) {
            setTimerExpired(true);
            handleFinish();
            return;
        }
        const interval = setInterval(() => {
            setTimerSeconds(s => {
                if (s <= 1) {
                    clearInterval(interval);
                    setTimerExpired(true);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [phase, timerSeconds]);
    useEffect(() => {
        if (phase !== 'taking' || !attempt || !armedUi)
            return;
        let blurTimer = null, resizeTimer = null, done = false;
        const isTouch = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia && window.matchMedia('(pointer:coarse)').matches;
        const flag = (reason, fromNative) => {
            if (done)
                return;
            done = true;
            if (!fromNative) {
                const payload = JSON.stringify({ attemptSecret: attempt.attemptSecret, reason });
                try {
                    navigator.sendBeacon
                        ? navigator.sendBeacon(`${WORKER_BASE}/api/psikotes/public/attempt/${attempt.attemptId}/flag-leave`, new Blob([payload], { type: 'application/json' }))
                        : fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${attempt.attemptId}/flag-leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => { });
                }
                catch (e) { }
                if (native)
                    natCall('reportViolation', { reason });
                else
                    PsikotesGuard.startAlarm();
            }
            setBlockReason(reason);
            setPhase('blocked');
        };
        const onVisibility = () => { if (document.hidden)
            flag('leave'); };
        const onPageHide = () => flag('leave');
        const onBlur = () => {
            if (allowFloating || native)
                return;
            clearTimeout(blurTimer);
            blurTimer = setTimeout(() => { if (!document.hidden && !document.hasFocus())
                flag('focus'); }, 700);
        };
        const onFocus = () => clearTimeout(blurTimer);
        const onResize = () => {
            if (allowFloating || !isTouch || native)
                return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { if (window.innerWidth < window.screen.width * 0.85)
                flag('resize'); }, 600);
        };
        const onFs = () => { if (PsikotesGuard.fullscreenWasEntered() && !document.fullscreenElement)
            setFsLost(true);
        else
            setFsLost(false); };
        document.addEventListener('visibilitychange', onVisibility);
        document.addEventListener('fullscreenchange', onFs);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        window.addEventListener('resize', onResize);
        let natIv = null;
        const onFocusIn = (e) => { if (e.target && /^(TEXTAREA|INPUT)$/.test(e.target.tagName))
            natCall('setImeActive', { active: true }); };
        const onFocusOut = () => { natCall('setImeActive', { active: false }); };
        if (native) {
            document.addEventListener('focusin', onFocusIn);
            document.addEventListener('focusout', onFocusOut);
            natIv = setInterval(async () => {
                const st = await natCall('getStatus');
                if (st && st.violation)
                    flag(st.violation, true);
            }, 700);
        }
        return () => {
            clearInterval(natIv);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
            clearTimeout(blurTimer);
            clearTimeout(resizeTimer);
            document.removeEventListener('visibilitychange', onVisibility);
            document.removeEventListener('fullscreenchange', onFs);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('resize', onResize);
        };
    }, [phase, attempt, armedUi, allowFloating, native]);
    useEffect(() => {
        if (phase !== 'blocked')
            return;
        const check = () => { if (!document.hidden && document.hasFocus())
            PsikotesGuard.stopAlarm(); };
        document.addEventListener('visibilitychange', check);
        window.addEventListener('focus', check);
        const iv = setInterval(check, 500);
        check();
        return () => { document.removeEventListener('visibilitychange', check); window.removeEventListener('focus', check); clearInterval(iv); };
    }, [phase]);
    useEffect(() => { if (phase === 'done')
        PsikotesGuard.release(); }, [phase]);
    useEffect(() => {
        if (phase !== 'blocked' || !attempt)
            return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${attempt.attemptId}/status`, { headers: { 'X-Attempt-Secret': attempt.attemptSecret } });
                const data = await res.json();
                if (res.ok && data.status === 'in_progress') {
                    if (await restoreSession(attempt))
                        setPhase('taking');
                }
            }
            catch (e) { }
        }, 5000);
        return () => clearInterval(interval);
    }, [phase, attempt]);
    const sendAnswer = async (questionId, value) => {
        if (!attempt)
            return false;
        try {
            const res = await fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${attempt.attemptId}/answer`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attemptSecret: attempt.attemptSecret, questionId, answer: value }),
            });
            if (res.ok) {
                syncedRef.current[questionId] = value;
                return true;
            }
            if (res.status === 409) {
                const d = await res.json().catch(() => ({}));
                if (d && d.expired)
                    setTimerSeconds(0);
            }
        }
        catch (e) { }
        return false;
    };
    const syncAll = async () => {
        const cur = answersRef.current || {};
        for (const qq of questions) {
            const v = cur[qq.id];
            if (v !== undefined && String(v).trim() !== '' && syncedRef.current[qq.id] !== v)
                await sendAnswer(qq.id, v);
        }
    };
    const flushPending = () => {
        const p = pendingRef.current;
        pendingRef.current = {};
        Object.keys(p).forEach(qid => { clearTimeout(p[qid].t); sendAnswer(qid, p[qid].v); });
    };
    const saveAnswer = (questionId, value, opts) => {
        setAnswers(prev => {
            const next = { ...prev, [questionId]: value };
            writeLocalProgress({ answers: next });
            return next;
        });
        if (opts && opts.debounce) {
            const old = pendingRef.current[questionId];
            if (old)
                clearTimeout(old.t);
            pendingRef.current[questionId] = { v: value, t: setTimeout(() => {
                    const cur = pendingRef.current[questionId];
                    if (cur) {
                        delete pendingRef.current[questionId];
                        sendAnswer(questionId, cur.v);
                    }
                }, 900) };
        }
        else {
            sendAnswer(questionId, value);
        }
    };
    const handleFinish = async () => {
        setSaving(true);
        try {
            flushPending();
            await syncAll();
            const res = await fetch(`${WORKER_BASE}/api/psikotes/public/attempt/${attempt.attemptId}/finish`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attemptSecret: attempt.attemptSecret }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.removeItem(storageKey);
                localStorage.removeItem(progressKey);
                setNavOpen(false);
                setPhase('done');
            }
            else {
                setErrorMsg(data.error || 'Gagal mengumpulkan jawaban');
            }
        }
        catch (e) {
            setErrorMsg('Gagal mengumpulkan jawaban. Periksa koneksi internet lalu coba lagi.');
        }
        finally {
            setSaving(false);
        }
    };
    const NativeStatusBox = () => {
        const dndOk = !!(nativeSt && nativeSt.dndGranted);
        const ovl = !!(nativeSt && nativeSt.overlay) && !allowFloating;
        return (React.createElement("div", { className: "space-y-1.5" },
            React.createElement("div", { className: `text-[11px] rounded-lg px-2.5 py-2 border font-semibold ${dndOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}` }, dndOk ? '✅ Notifikasi akan diblokir otomatis selama tes (mode Jangan Ganggu).' : (React.createElement(React.Fragment, null,
                "\u26A0\uFE0F Izin \"Jangan Ganggu\" belum diberikan (wajib agar notifikasi diblokir). ",
                React.createElement("button", { onClick: () => natCall('openDndSettings'), className: "underline font-bold" }, "Beri Izin"),
                ", lalu aktifkan \"SO Mandiri Tarobun\" dan kembali ke sini."))),
            ovl && React.createElement("div", { className: "text-[11px] rounded-lg px-2.5 py-2 border bg-rose-100 border-rose-300 text-rose-800 font-bold" }, "\uD83D\uDEAB Terdeteksi aplikasi ngambang di atas layar. Tutup semuanya dulu, lalu ketuk layar sekali untuk memeriksa ulang."),
            React.createElement("div", { className: "text-[11px] text-slate-500" }, "Volume alarm otomatis dimaksimalkan dan dikunci saat melanggar.")));
    };
    const isAndroidBrowser = !native && /Android/i.test(navigator.userAgent) && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const appIntentUrl = `intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.tarobun.app;S.browser_fallback_url=${encodeURIComponent(location.origin + '/apk/tarobun.apk')};end`;
    const SecurityChecklist = () => (React.createElement("div", { className: "bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2.5" },
        React.createElement("p", { className: "text-xs font-bold text-rose-800" }, "\uD83D\uDD12 Aturan Keamanan Psikotes"),
        React.createElement("p", { className: "text-[11px] text-rose-700" },
            "Jika kamu keluar dari halaman ini (pindah aplikasi, membuka aplikasi ngambang, panel notifikasi, layar mati), HP akan ",
            React.createElement("strong", null, "berbunyi sirene keras + bergetar"),
            " sampai kamu kembali, dan akses langsung ",
            React.createElement("strong", null, "diblokir"),
            "."),
        allowFloating ? (React.createElement("div", { className: "text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-2 font-semibold" }, "\u2705 Store Leader mengizinkan aplikasi ngambang untuk kamu.")) : (React.createElement("label", { className: "flex items-start gap-2 text-[11px] text-slate-700" },
            React.createElement("input", { type: "checkbox", checked: ackFloating, onChange: e => setAckFloating(e.target.checked), className: "mt-0.5" }),
            React.createElement("span", null,
                "Saya sudah ",
                React.createElement("strong", null, "menutup/mematikan semua aplikasi ngambang"),
                " (bubble chat, jendela melayang, pop-up video, overlay lain)."))),
        native ? NativeStatusBox() : (React.createElement(React.Fragment, null,
            React.createElement("label", { className: "flex items-start gap-2 text-[11px] text-slate-700" },
                React.createElement("input", { type: "checkbox", checked: ackNotif, onChange: e => setAckNotif(e.target.checked), className: "mt-0.5" }),
                React.createElement("span", null,
                    "Saya sudah mengaktifkan ",
                    React.createElement("strong", null, "Jangan Ganggu"),
                    " / mematikan notifikasi HP selama tes (geser layar atas \u2192 ikon Jangan Ganggu).")),
            React.createElement("label", { className: "flex items-start gap-2 text-[11px] text-slate-700" },
                React.createElement("input", { type: "checkbox", checked: ackAlarm, onChange: e => setAckAlarm(e.target.checked), className: "mt-0.5" }),
                React.createElement("span", null, "Saya paham alarm akan berbunyi keras jika melanggar. Volume media HP saya sudah dinaikkan.")),
            isAndroidBrowser && (React.createElement("a", { href: appIntentUrl, className: "block text-center text-[11px] font-bold bg-purple-800 text-white rounded-lg py-2" }, "\uD83D\uDCF2 Buka di Aplikasi Tarobun (lebih aman: notifikasi diblokir otomatis)")))),
        assigned && !allowFloating && (React.createElement("div", { className: "pt-1" }, floatingRequested ? (React.createElement("p", { className: "text-[11px] text-amber-700 font-semibold" }, "\u23F3 Permintaan izin terkirim. Menunggu persetujuan Store Leader\u2026")) : (React.createElement("button", { onClick: requestFloating, disabled: requestingFloating, className: "text-[11px] font-bold text-purple-800 underline disabled:opacity-50" }, requestingFloating ? 'Mengirim…' : 'Aplikasi ngambang saya memang penting? Minta izin Store Leader'))))));
    if (phase === 'loading') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "text-center text-slate-500" },
                React.createElement("i", { "data-lucide": "loader", className: "w-8 h-8 animate-spin mx-auto mb-2" }),
                "Memuat..."));
    }
    if (phase === 'error') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-2" },
                React.createElement("i", { "data-lucide": "alert-triangle", className: "w-10 h-10 text-rose-500 mx-auto" }),
                React.createElement("h2", { className: "font-bold text-slate-800" }, "Tidak Bisa Membuka Psikotes"),
                React.createElement("p", { className: "text-sm text-slate-500" }, errorMsg)));
    }
    if (phase === 'locked') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-2" },
                React.createElement("i", { "data-lucide": "lock", className: "w-10 h-10 text-amber-500 mx-auto" }),
                React.createElement("h2", { className: "font-bold text-slate-800" }, "Psikotes Dikunci"),
                React.createElement("p", { className: "text-sm text-slate-500" }, "Psikotes ini sedang dikunci oleh admin. Hubungi admin/toko untuk info lebih lanjut.")));
    }
    if (phase === 'blocked') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-rose-200 shadow-sm p-6 text-center space-y-2" },
                React.createElement("i", { "data-lucide": "shield-alert", className: "w-10 h-10 text-rose-500 mx-auto" }),
                React.createElement("h2", { className: "font-bold text-slate-800" }, "Akses Diblokir"),
                React.createElement("p", { className: "text-sm text-slate-500" },
                    blockReason === 'overlay' ? 'Terdeteksi aplikasi ngambang di atas layar psikotes.'
                        : blockReason === 'focus' ? 'Layar psikotes kehilangan fokus (terindikasi aplikasi ngambang, jendela lain, atau panel notifikasi dibuka).'
                            : blockReason === 'resize' ? 'Ukuran layar berubah (terindikasi split-screen atau jendela melayang).'
                                : 'Kamu terdeteksi keluar dari halaman psikotes saat sedang mengerjakan.',
                    ' ',
                    "Alarm berhenti setelah kamu kembali ke halaman ini. Hubungi Store Leader/admin untuk membuka blokir. Halaman ini akan otomatis lanjut begitu diizinkan.")));
    }
    if (phase === 'done') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 text-center space-y-2" },
                React.createElement("i", { "data-lucide": "check-circle-2", className: "w-10 h-10 text-emerald-500 mx-auto" }),
                React.createElement("h2", { className: "font-bold text-slate-800" }, "Psikotes Selesai"),
                React.createElement("p", { className: "text-sm text-slate-500" }, "Terima kasih, jawabanmu sudah tersimpan. Hasilnya akan direview oleh admin/toko.")));
    }
    if (phase === 'confirm') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" },
                React.createElement("div", { className: "text-center space-y-1" },
                    React.createElement("i", { "data-lucide": "clipboard-list", className: "w-9 h-9 text-purple-700 mx-auto" }),
                    React.createElement("h2", { className: "font-bold text-slate-800 text-lg" }, test === null || test === void 0 ? void 0 : test.title),
                    (test === null || test === void 0 ? void 0 : test.description) && React.createElement("p", { className: "text-xs text-slate-500" }, test.description)),
                React.createElement("div", { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5" },
                    React.createElement("div", { className: "flex justify-between text-xs" },
                        React.createElement("span", { className: "text-slate-500" }, "Nama"),
                        React.createElement("span", { className: "font-semibold text-slate-800" }, assignedInfo === null || assignedInfo === void 0 ? void 0 : assignedInfo.ojtName)),
                    React.createElement("div", { className: "flex justify-between text-xs" },
                        React.createElement("span", { className: "text-slate-500" }, "Penempatan Toko"),
                        React.createElement("span", { className: "font-semibold text-slate-800" }, assignedInfo === null || assignedInfo === void 0 ? void 0 : assignedInfo.storeName))),
                SecurityChecklist(),
                React.createElement("div", { className: "bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800" }, "Link ini hanya bisa dipakai satu kali. Halaman akan masuk layar penuh saat tes dimulai."),
                errorMsg && React.createElement("p", { className: "text-xs text-rose-600" }, errorMsg),
                React.createElement("button", { onClick: handleStart, disabled: submittingStart || !checklistOk, className: "w-full bg-purple-800 hover:bg-purple-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm" }, submittingStart ? 'Memulai...' : 'Mulai Psikotes')));
    }
    if (phase === 'form') {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4" },
                React.createElement("div", { className: "text-center space-y-1" },
                    React.createElement("i", { "data-lucide": "clipboard-list", className: "w-9 h-9 text-purple-700 mx-auto" }),
                    React.createElement("h2", { className: "font-bold text-slate-800 text-lg" }, test === null || test === void 0 ? void 0 : test.title),
                    (test === null || test === void 0 ? void 0 : test.description) && React.createElement("p", { className: "text-xs text-slate-500" }, test.description)),
                SecurityChecklist(),
                React.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800" },
                    "Isi ",
                    React.createElement("strong", null, "Nama Lengkap"),
                    " dan pilih ",
                    React.createElement("strong", null, "Lokasi Penempatan"),
                    " sesuai data sebenarnya. Data ini dipakai admin/toko untuk merekap hasil psikotes kamu \u2014 kalau nama atau toko yang dipilih salah, hasilnya bisa tertukar dengan OJT lain."),
                React.createElement("div", null,
                    React.createElement("label", { className: "text-xs font-semibold text-slate-600" }, "Nama Lengkap"),
                    React.createElement("input", { value: name, onChange: e => setName(e.target.value), className: "mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm", placeholder: "Nama kamu" })),
                React.createElement("div", { ref: storeDropdownRef, className: "relative" },
                    React.createElement("label", { className: "text-xs font-semibold text-slate-600" }, "Lokasi Penempatan"),
                    React.createElement("button", { type: "button", disabled: dirLoading, onClick: () => setStoreDropdownOpen(o => !o), className: "mt-1 w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white flex items-center justify-between gap-2 disabled:opacity-60 text-left" },
                        React.createElement("span", { className: `truncate ${penempatan ? 'text-slate-800' : 'text-slate-400'}` }, dirLoading ? 'Memuat daftar toko...' : (penempatan || (storeDirectory.length === 0 ? 'Pilih toko/outlet' : '-- Pilih Toko/Outlet --'))),
                        React.createElement("i", { "data-lucide": "chevron-down", className: `w-4 h-4 text-slate-400 shrink-0 transition-transform ${storeDropdownOpen ? 'rotate-180' : ''}` })),
                    storeDropdownOpen && !dirLoading && storeDirectory.length > 0 && (React.createElement("div", { className: "absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg animate-fadeIn overflow-hidden" },
                        storeDirectory.length > 4 && (React.createElement("div", { className: "p-2 border-b border-slate-100" },
                            React.createElement("div", { className: "relative" },
                                React.createElement("i", { "data-lucide": "search", className: "w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" }),
                                React.createElement("input", { type: "text", autoFocus: true, value: storeSearchQuery, onChange: e => setStoreSearchQuery(e.target.value), placeholder: "Cari nama toko/outlet...", className: "w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded-lg text-xs" })))),
                        React.createElement("ul", { className: "max-h-[168px] overflow-y-auto py-1 overscroll-contain" },
                            filteredStoreDirectory.length === 0 && (React.createElement("li", { className: "px-3 py-2.5 text-xs text-slate-400 text-center" },
                                "Tidak ada toko yang cocok dengan \"",
                                storeSearchQuery,
                                "\".")),
                            filteredStoreDirectory.map(s => (React.createElement("li", { key: s.id },
                                React.createElement("button", { type: "button", onClick: () => { setPenempatan(s.name); setStoreDropdownOpen(false); setStoreSearchQuery(''); }, className: `w-full text-left px-3 py-2 text-sm truncate ${penempatan === s.name ? 'bg-purple-50 text-purple-800 font-semibold' : 'text-slate-700 hover:bg-slate-50'}` }, s.name))))))),
                    !dirLoading && storeDirectory.length === 0 && (React.createElement("input", { value: penempatan, onChange: e => setPenempatan(e.target.value), className: "mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm", placeholder: "Contoh: Toko Cabang A" })),
                    dirError && React.createElement("p", { className: "text-[11px] text-amber-600 mt-1" }, "Gagal memuat daftar toko dari server. Kamu masih bisa ketik nama toko secara manual di atas.")),
                errorMsg && React.createElement("p", { className: "text-xs text-rose-600" }, errorMsg),
                React.createElement("button", { onClick: handleStart, disabled: submittingStart || !name.trim() || !penempatan.trim() || !checklistOk, className: "w-full bg-purple-800 hover:bg-purple-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm" }, submittingStart ? 'Memulai...' : 'Mulai Psikotes')));
    }
    if (phase === 'taking' && questions.length === 0) {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-3" },
                React.createElement("p", { className: "text-sm text-slate-500" }, "Memuat soal..."),
                React.createElement("button", { onClick: async () => { if (!(await restoreSession(attempt)))
                        setPhase('blocked'); }, className: "bg-purple-800 text-white font-semibold px-4 py-2 rounded-xl text-sm" }, "Muat Ulang Soal")));
    }
    if (phase === 'taking' && !armedUi) {
        return React.createElement(Shell, null,
            React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 text-center" },
                React.createElement("i", { "data-lucide": "shield-check", className: "w-10 h-10 text-purple-700 mx-auto" }),
                React.createElement("h2", { className: "font-bold text-slate-800" }, "Lanjutkan Psikotes"),
                React.createElement("p", { className: "text-xs text-slate-500" }, "Pastikan aplikasi ngambang sudah ditutup dan notifikasi dimatikan. Jika keluar halaman, alarm akan berbunyi dan akses diblokir."),
                native && NativeStatusBox(),
                errorMsg && React.createElement("p", { className: "text-xs text-rose-600" }, errorMsg),
                React.createElement("button", { disabled: native && !(nativeSt && nativeSt.dndGranted), onClick: async () => {
                        if (native) {
                            const st = await natCall('precheck');
                            if (st && st.overlay && !allowFloating) {
                                setErrorMsg('Terdeteksi aplikasi ngambang di atas layar. Tutup dulu, atau minta izin Store Leader.');
                                return;
                            }
                            if (st && !st.dndGranted) {
                                setErrorMsg('Izin "Jangan Ganggu" belum diberikan.');
                                return;
                            }
                            setErrorMsg('');
                        }
                        PsikotesGuard.arm();
                        armedRef.current = true;
                        setArmedUi(true);
                        if (native && attempt)
                            await nativeBegin(attempt, allowFloating);
                    }, className: "w-full bg-purple-800 hover:bg-purple-900 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm" }, "Lanjutkan Mengerjakan")));
    }
    if (phase === 'taking') {
        const q = questions[qIndex];
        const isAns = (qq) => { const v = answers[qq.id]; return v !== undefined && v !== null && String(v).trim() !== ''; };
        const answeredCount = questions.filter(isAns).length;
        const allAnswered = answeredCount === questions.length;
        const missing = questions.map((qq, i) => (isAns(qq) ? 0 : i + 1)).filter(Boolean);
        const stateOf = (qq, i) => (i === qIndex ? 'cur' : isAns(qq) ? 'ans' : visited[qq.id] ? 'skip' : 'todo');
        const preview = (qq) => {
            if (!isAns(qq))
                return null;
            const v = answers[qq.id];
            if (qq.type === 'pilihan_ganda') {
                const idx = Number(v);
                return { tag: String.fromCharCode(65 + idx), text: (qq.options || [])[idx] || '' };
            }
            const t = String(v).replace(/\s+/g, ' ').trim();
            return { tag: '✎', text: t.length > 80 ? t.slice(0, 80) + '…' : t };
        };
        const goTo = (i) => { flushPending(); setQIndex(i); setNavOpen(false); try {
            window.scrollTo(0, 0);
        }
        catch (e) { } };
        const shortText = (t) => { const x = String(t || '').replace(/\s+/g, ' ').trim(); return x.length > 60 ? x.slice(0, 60) + '…' : x; };
        return (React.createElement("div", { className: "min-h-screen bg-slate-50 p-4" },
            fsLost && (React.createElement("div", { className: "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" },
                React.createElement("div", { className: "bg-white rounded-2xl p-5 text-center space-y-3 max-w-xs" },
                    React.createElement("p", { className: "font-bold text-slate-800 text-sm" }, "Layar penuh terlepas"),
                    React.createElement("p", { className: "text-xs text-slate-500" }, "Kembali ke layar penuh untuk melanjutkan psikotes."),
                    React.createElement("button", { onClick: () => { PsikotesGuard.reenterFullscreen(); setFsLost(false); }, className: "w-full bg-purple-800 text-white font-bold py-2.5 rounded-xl text-sm" }, "Kembali ke Layar Penuh")))),
            navOpen && (React.createElement("div", { className: "qnav-overlay", onClick: () => setNavOpen(false) },
                React.createElement("div", { className: "qnav-sheet", onClick: e => e.stopPropagation() },
                    React.createElement("div", { className: "qnav-head" },
                        React.createElement("div", null,
                            React.createElement("p", { className: "font-bold text-slate-800 text-sm" }, "Daftar Soal"),
                            React.createElement("p", { className: "text-xs text-slate-500" },
                                answeredCount,
                                " terjawab \u2022 ",
                                questions.length - answeredCount,
                                " belum dijawab")),
                        React.createElement("button", { className: "qnav-close", onClick: () => setNavOpen(false) }, "Tutup")),
                    React.createElement("div", { className: "qnav-legend" },
                        React.createElement("span", null,
                            React.createElement("i", { className: "qnav-dot qnav-ans" }),
                            "Terjawab"),
                        React.createElement("span", null,
                            React.createElement("i", { className: "qnav-dot qnav-skip" }),
                            "Dilewati"),
                        React.createElement("span", null,
                            React.createElement("i", { className: "qnav-dot qnav-todo" }),
                            "Belum dibuka"),
                        React.createElement("span", null,
                            React.createElement("i", { className: "qnav-dot qnav-cur" }),
                            "Sedang dibuka")),
                    React.createElement("div", { className: "qnav-grid" }, questions.map((qq, i) => (React.createElement("button", { key: qq.id, className: `qnav-n qnav-${stateOf(qq, i)}`, onClick: () => goTo(i) }, i + 1)))),
                    React.createElement("ul", { className: "qnav-list" }, questions.map((qq, i) => {
                        const pv = preview(qq);
                        return (React.createElement("li", { key: qq.id },
                            React.createElement("button", { className: "qnav-row", onClick: () => goTo(i) },
                                React.createElement("span", { className: `qnav-n qnav-${stateOf(qq, i)}` }, i + 1),
                                React.createElement("span", { className: "qnav-txt" },
                                    React.createElement("span", { className: "qnav-q" }, shortText(qq.text)),
                                    pv
                                        ? React.createElement("span", { className: "qnav-a" },
                                            React.createElement("b", null, pv.tag),
                                            " ",
                                            pv.text)
                                        : React.createElement("span", { className: "qnav-a qnav-none" }, visited[qq.id] ? 'Dilewati — belum dijawab' : 'Belum dijawab')))));
                    })),
                    allAnswered ? (React.createElement("button", { onClick: handleFinish, disabled: saving, className: "w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm" }, saving ? 'Mengirim...' : 'Kumpulkan Jawaban')) : (React.createElement("p", { className: "qnav-warn" },
                        "Belum dijawab: no. ",
                        missing.join(', ')))))),
            React.createElement("div", { className: "max-w-md mx-auto space-y-4" },
                React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-4 z-10" },
                    React.createElement("div", { className: "flex items-center justify-between text-xs text-slate-500 mb-2" },
                        React.createElement("span", null,
                            "Soal ",
                            qIndex + 1,
                            " dari ",
                            questions.length),
                        React.createElement("div", { className: "flex items-center gap-3" },
                            timerSeconds !== null && (React.createElement("span", { className: `font-bold tabular-nums ${timerSeconds <= 60 ? 'text-rose-600' : timerSeconds <= 300 ? 'text-amber-600' : 'text-slate-600'}` },
                                "\u23F1 ",
                                String(Math.floor(timerSeconds / 60)).padStart(2, '0'),
                                ":",
                                String(timerSeconds % 60).padStart(2, '0'))),
                            React.createElement("button", { onClick: () => { flushPending(); setNavOpen(true); }, className: "qnav-open" },
                                "Daftar Soal \u00B7 ",
                                answeredCount,
                                "/",
                                questions.length))),
                    React.createElement("div", { className: "h-1.5 bg-slate-100 rounded-full overflow-hidden" },
                        React.createElement("div", { className: "h-full bg-purple-700 rounded-full transition-all", style: { width: `${(answeredCount / questions.length) * 100}%` } })),
                    React.createElement("div", { className: "qnav-strip" }, questions.map((qq, i) => (React.createElement("button", { key: qq.id, className: `qnav-n qnav-${stateOf(qq, i)}`, onClick: () => goTo(i), "aria-label": `Soal ${i + 1}` }, i + 1))))),
                q && (React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4" },
                    React.createElement("p", { className: "font-semibold text-slate-800 text-sm whitespace-pre-wrap" }, q.text),
                    q.image_url && (React.createElement("img", { src: `${WORKER_BASE}/api/media/file/${q.image_url}`, alt: "Gambar soal", className: "w-full rounded-xl border border-slate-200 object-contain max-h-64" })),
                    q.type === 'pilihan_ganda' ? (React.createElement("div", { className: "space-y-2" },
                        q.options.map((opt, i) => (React.createElement("button", { key: i, onClick: () => saveAnswer(q.id, String(i)), className: `w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${String(answers[q.id]) === String(i) ? 'bg-purple-800 text-white border-purple-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}` },
                            React.createElement("b", { className: "mr-2" },
                                String.fromCharCode(65 + i),
                                "."),
                            opt))),
                        isAns(q) && (React.createElement("button", { onClick: () => saveAnswer(q.id, ''), className: "qnav-clear" }, "Hapus jawaban nomor ini")))) : (React.createElement("textarea", { value: answers[q.id] || '', onChange: e => saveAnswer(q.id, e.target.value, { debounce: true }), onBlur: flushPending, rows: 4, className: "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm", placeholder: "Tulis jawabanmu di sini..." })))),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => goTo(Math.max(0, qIndex - 1)), disabled: qIndex === 0, className: "flex-1 bg-white border border-slate-200 disabled:opacity-40 text-slate-700 font-semibold py-2.5 rounded-xl text-sm" }, "Sebelumnya"),
                    qIndex < questions.length - 1 ? (React.createElement("button", { onClick: () => goTo(Math.min(questions.length - 1, qIndex + 1)), className: "flex-1 bg-purple-800 hover:bg-purple-900 text-white font-semibold py-2.5 rounded-xl text-sm" }, "Selanjutnya")) : (React.createElement("button", { onClick: handleFinish, disabled: saving || !allAnswered, className: "flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm" }, saving ? 'Mengirim...' : 'Kumpulkan Jawaban'))),
                errorMsg && React.createElement("p", { className: "text-xs text-center text-rose-600" }, errorMsg),
                !allAnswered && qIndex === questions.length - 1 && (React.createElement("div", { className: "qnav-missing" },
                    React.createElement("p", null,
                        "Masih ada ",
                        missing.length,
                        " soal belum dijawab. Ketuk nomornya untuk kembali ke soal itu:"),
                    React.createElement("div", null, missing.map(n => (React.createElement("button", { key: n, className: "qnav-n qnav-skip", onClick: () => goTo(n - 1) }, n)))))))));
    }
}
function App() {
    const params = new URLSearchParams(window.location.search);
    const ojtToken = params.get('ojt');
    const psikotesToken = params.get('psikotes');
    if (ojtToken)
        return React.createElement(PsikotesOjtPublicPage, { linkToken: ojtToken, assigned: true });
    if (psikotesToken)
        return React.createElement(PsikotesOjtPublicPage, { linkToken: psikotesToken, assigned: false });
    return (React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4" },
        React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-2 max-w-md" },
            React.createElement("i", { "data-lucide": "link-2-off", className: "w-10 h-10 text-slate-400 mx-auto" }),
            React.createElement("h2", { className: "font-bold text-slate-800" }, "Link Tidak Lengkap"),
            React.createElement("p", { className: "text-sm text-slate-500" }, "Buka halaman ini menggunakan link psikotes yang dibagikan admin/toko."))));
}
class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.handleReload = () => {
            this.setState({ hasError: false, errorInfo: '', errorStack: '', showDetail: false });
            window.location.reload();
        };
        this.state = { hasError: false, errorInfo: '', errorStack: '', showDetail: false };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            errorInfo: (error && error.message) ? error.message : String(error),
            errorStack: (error && error.stack) ? error.stack : '',
        };
    }
    componentDidCatch(error, info) {
        console.error('Psikotes App Error (ditangkap ErrorBoundary):', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (React.createElement("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4" },
                React.createElement("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-sm w-full text-center space-y-3" },
                    React.createElement("div", { className: "w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto" },
                        React.createElement("i", { "data-lucide": "alert-triangle", className: "w-7 h-7 text-rose-500" })),
                    React.createElement("h2", { className: "font-bold text-slate-800 text-lg" }, "Ups, terjadi kendala tampilan"),
                    React.createElement("p", { className: "text-xs text-slate-500" }, "Silakan muat ulang halaman untuk melanjutkan."),
                    React.createElement("button", { onClick: this.handleReload, className: "w-full bg-purple-800 hover:bg-purple-900 text-white font-bold py-2.5 rounded-xl text-sm" }, "Muat Ulang Halaman"),
                    React.createElement("button", { type: "button", onClick: () => this.setState(s => ({ showDetail: !s.showDetail })), className: "text-[10px] text-slate-400 underline" }, this.state.showDetail ? 'Sembunyikan detail teknis' : 'Lihat detail teknis'),
                    this.state.showDetail && (React.createElement("pre", { className: "text-left text-[9px] text-rose-600 bg-rose-50 rounded-lg p-2 max-h-32 overflow-auto whitespace-pre-wrap break-words" },
                        this.state.errorInfo,
                        this.state.errorStack ? '\n' + this.state.errorStack : '')))));
        }
        return this.props.children;
    }
}
window.addEventListener('unhandledrejection', (event) => {
    console.error('Psikotes App - Promise ditolak tanpa ditangani:', event.reason);
});
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(AppErrorBoundary, null,
    React.createElement(App, null)));
window.addEventListener('load', () => { if (window.lucide)
    window.lucide.createIcons(); });
