/**
 * RVP System Authentication & Shared UI Components
 * Author: Niwat Wiyasing
 * Updated: 2026 (Strict Isolated Mode - Anti-Collision)
 */

// ป้องกันกรณีสคริปต์โหลดซ้ำ (Double Loading Guard)
if (typeof window.RVP_AUTH_LOADED === 'undefined') {
    window.RVP_AUTH_LOADED = true;

    // 1. ฟังก์ชันตรวจสอบสิทธิ์การเข้าใช้งานระบบ
    const checkAuth = function () {
        const currentFile = window.location.pathname.split("/").pop();

        if (localStorage.getItem('isLoggedIn') !== 'true') {
            if (currentFile !== 'login.html' && currentFile !== '') {
                window.location.href = 'login.html';
            }
        } else {
            if (currentFile === 'login.html') {
                window.location.href = 'index.html';
                return;
            }
            // เรียกแสดงกล่องต้อนรับหลังจากหน้าจอพร้อมทำงานจริงเท่านั้น
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', showWelcomeMessage);
            } else {
                showWelcomeMessage();
            }
        }
    };

    // 2. ฟังก์ชันกล่องป๊อปอัปต้อนรับพนักงาน
    const showWelcomeMessage = function () {
        if (!localStorage.getItem('welcomeShown')) {
            const currentUserName = localStorage.getItem('userName') || 'พนักงานผู้ใช้งาน';
            const currentUserCode = localStorage.getItem('userCode') || '';

            const isAdmin = (currentUserCode === 'FMBD03' || currentUserCode === 'admin');
            const roleBadge = isAdmin
                ? '<span class="badge bg-danger mt-2">โหมดผู้ดูแลระบบ (Admin)</span>'
                : '<span class="badge bg-primary mt-2">พนักงานภาคสนาม (Field Operations)</span>';

            if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
                try {
                    Swal.fire({
                        title: 'ยินดีต้อนรับกลับมาครับ',
                        html: `สวัสดีครับคุณ <b>${currentUserName}</b> <br> ${roleBadge}`,
                        icon: 'success',
                        timer: 2500,
                        timerProgressBar: true,
                        showConfirmButton: false,
                        didOpen: () => {
                            const popup = Swal.getPopup();
                            if (popup && popup.style) {
                                popup.style.fontFamily = "'Kanit', sans-serif";
                            }
                        }
                    });
                    localStorage.setItem('welcomeShown', 'true');
                } catch (err) {
                    console.log("SweetAlert รอการเรนเดอร์โครงสร้างหน้าเว็บให้เสร็จสิ้น");
                }
            }
        }
    };

    // 3. ฟังก์ชันล้างค่าตัวแปรในเครื่องและดีดกลับหน้า Login
    const processLogout = function () {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userCode');
        localStorage.removeItem('userName');
        localStorage.removeItem('welcomeShown');
        window.location.href = 'login.html';
    };

    // 🎯 4. ฟังก์ชันหลักสำหรับปุ่มออกระบบ (ผูกลง Window ล็อกสิทธิ์ขาด)
    window.handleLogout = function () {
        if (typeof Swal !== 'undefined' && typeof Swal.fire === 'function') {
            try {
                Swal.fire({
                    title: 'ยืนยันการออกจากระบบ?',
                    text: "คุณต้องการออกจากระบบการสำรวจใช่หรือไม่",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: 'ใช่, ออกจากระบบ',
                    cancelButtonText: 'ยกเลิก',
                    didOpen: () => {
                        const popup = Swal.getPopup();
                        if (popup && popup.style) {
                            popup.style.fontFamily = "'Kanit', sans-serif";
                        }
                    }
                }).then((result) => {
                    if (result && result.isConfirmed) {
                        processLogout();
                    }
                });
            } catch (e) {
                if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) { processLogout(); }
            }
        } else {
            if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) { processLogout(); }
        }
    };

    // รันระบบตรวจสอบความปลอดภัยทันที
    checkAuth();
}