(() => {
    const STORAGE_KEY = 'ecofine_attendance_logs';
    const params = new URLSearchParams(window.location.search);
    const OFFICE_LAT = Number.parseFloat(params.get('lat')) || 30.0444;
    const OFFICE_LNG = Number.parseFloat(params.get('lng')) || 31.2357;
    const MAX_DISTANCE_METERS = Number.parseInt(params.get('radius'), 10) || 200;

    const form = document.getElementById('attendanceForm');
    const nameSelect = document.getElementById('name');
    const typeSelect = document.getElementById('type');
    const submitBtn = document.getElementById('submitBtn');
    const statusBox = document.getElementById('statusBox');
    const logsList = document.getElementById('logsList');

    let currentPosition = null;
    let employeeOptions = [];

    function updateStatus(message, tone = 'info') {
        let background = '#eff6ff';
        let borderColor = '#bfdbfe';
        let textColor = '#1d4ed8';

        if (tone === 'success') {
            background = '#ecfdf3';
            borderColor = '#a7f3d0';
            textColor = '#166534';
        } else if (tone === 'warning') {
            background = '#fffbeb';
            borderColor = '#fde68a';
            textColor = '#92400e';
        }

        statusBox.textContent = message;
        statusBox.style.background = background;
        statusBox.style.borderColor = borderColor;
        statusBox.style.color = textColor;
    }

    function getLogs() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveLogs(logs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    }

    async function ensureDbReady() {
        if (!window.db || typeof window.db.getAll !== 'function') {
            return false;
        }

        if (!window.db.localDb && typeof window.db.init === 'function') {
            try {
                await window.db.init();
            } catch {
                return false;
            }
        }

        return true;
    }

    async function renderEmployeeOptions() {
        try {
            const ready = await ensureDbReady();
            if (!ready) {
                employeeOptions = [];
                nameSelect.innerHTML = '<option value="">لا توجد بيانات موظفين متاحة</option>';
                return;
            }

            const items = await window.db.getAll('employees');
            const employees = (items || [])
                .filter((employee) => employee && (employee.name || employee.full_name || employee.username))
                .map((employee) => ({
                    id: employee.id || employee.name || employee.username,
                    name: employee.name || employee.full_name || employee.username
                }));

            employeeOptions = employees;

            if (!employeeOptions.length) {
                nameSelect.innerHTML = '<option value="">لا توجد موظفين مسجلين بعد</option>';
                return;
            }

            const fragment = document.createDocumentFragment();
            employeeOptions.forEach((employee) => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = employee.name;
                fragment.appendChild(option);
            });

            nameSelect.innerHTML = '';
            nameSelect.appendChild(fragment);
        } catch {
            employeeOptions = [];
            nameSelect.innerHTML = '<option value="">تعذر تحميل قائمة الموظفين</option>';
        }
    }

    function renderLogs() {
        const logs = getLogs();
        if (!logs.length) {
            logsList.innerHTML = '<div class="log-item">لا توجد سجلات حتى الآن.</div>';
            return;
        }

        logsList.innerHTML = logs.map((log) => {
            const tone = log.status === 'approved' ? 'success' : 'warning';
            return `
                <div class="log-item">
                    <strong>${log.name}</strong> — ${log.type}
                    <div class="pill ${tone}">${log.status === 'approved' ? 'تم التسجيل بنجاح' : 'خارج النطاق'}</div>
                    <div style="margin-top:6px;color:#64748b;">${new Date(log.timestamp).toLocaleString('ar-EG')} • ${log.distanceMeters} متر</div>
                </div>
            `;
        }).join('');
    }

    function toRadians(value) {
        return value * (Math.PI / 180);
    }

    function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
        const earthRadius = 6371000;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadius * c;
    }

    function requestLocation() {
        if (!navigator.geolocation) {
            updateStatus('الموقع غير مدعوم في هذا المتصفح.', 'warning');
            submitBtn.disabled = true;
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPosition = position.coords;
                updateStatus(`تم تحديد الموقع بنجاح: ${currentPosition.latitude.toFixed(4)}, ${currentPosition.longitude.toFixed(4)}`, 'success');
                submitBtn.disabled = false;
            },
            (error) => {
                let message = 'تعذر الوصول إلى الموقع. يرجى السماح بالإذن.';
                if (error.code === 1) message = 'تم رفض إذن الموقع. يرجى تفعيله من إعدادات المتصفح.';
                if (error.code === 2) message = 'تعذر تحديد الموقع حاليًا. حاول مرة أخرى.';
                updateStatus(message, 'warning');
                submitBtn.disabled = true;
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const selectedEmployee = employeeOptions.find((employee) => employee.id === nameSelect.value) || null;
        const name = (selectedEmployee?.name || nameSelect.value || '').trim();
        const type = typeSelect.value;
        if (!name) {
            updateStatus('يرجى اختيار موظف من القائمة.', 'warning');
            return;
        }

        if (!currentPosition) {
            updateStatus('يرجى انتظار التحقق من الموقع أولًا.', 'warning');
            return;
        }

        const distance = calculateDistanceMeters(OFFICE_LAT, OFFICE_LNG, currentPosition.latitude, currentPosition.longitude);
        const isApproved = distance <= MAX_DISTANCE_METERS;

        const newLog = {
            name,
            type,
            timestamp: new Date().toISOString(),
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            distanceMeters: Math.round(distance),
            status: isApproved ? 'approved' : 'outside_range'
        };

        const logs = [newLog, ...getLogs()].slice(0, 20);
        saveLogs(logs);
        renderLogs();

        form.reset();
        if (isApproved) {
            updateStatus(`تم تسجيل ${type} بنجاح داخل النطاق المسموح (${Math.round(distance)} متر).`, 'success');
        } else {
            updateStatus(`تم تسجيل ${type} لكن الموقع خارج النطاق المسموح (${Math.round(distance)} متر).`, 'warning');
        }
    });

    renderLogs();
    renderEmployeeOptions();
    updateStatus(`يتم التحقق من الموقع داخل نطاق ${MAX_DISTANCE_METERS} متر. يمكنك ضبط الإحداثيات عبر ?lat=..&lng=..&radius=..`, 'info');
    requestLocation();
})();
