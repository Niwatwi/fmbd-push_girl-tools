"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { handleLogin } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      Swal.fire({
        icon: "warning",
        title: "กรุณากรอกข้อมูล",
        text: "โปรดกรอกชื่อผู้ใช้งานและรหัสผ่าน",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await handleLogin(username, password);

      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "เข้าสู่ระบบสำเร็จ",
          text: `ยินดีต้อนรับคุณ ${result.user?.display_name}`,
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          router.push("/");
          router.refresh();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "เข้าสู่ระบบล้มเหลว",
          text: result.message || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถเชื่อมต่อกับระบบได้ในขณะนี้",
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        {/* เปลี่ยนมาใช้โลโก้บริษัทจาก public/rvp.png */}
        <img
          src="/rvp.png"
          alt="RVP Logo"
          className="mx-auto h-20 w-auto object-contain"
        />

        <h2 className="mt-6 text-2xl font-bold leading-9 tracking-tight text-gray-900">
          ระบบลงบันทึกเวลาทำงาน
        </h2>
        <p className="mt-1 text-sm text-gray-500">RVI PUSH GIRLS</p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="mt-2">
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="ระบุชื่อผู้ใช้งาน เช่น ADMIN"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium leading-6 text-gray-900"
            >
              รหัสผ่าน (Password)
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-blue-400 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  กำลังตรวจสอบข้อมูล...
                </span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
