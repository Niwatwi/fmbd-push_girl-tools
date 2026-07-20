/** @type {import('next').NextConfig} */
const nextConfig = {
    // ✅ สำหรับ Next.js 14.2.15 ต้องซ้อนไว้ใน experimental แบบนี้เท่านั้นครับ
    experimental: {
        serverActions: {
            bodySizeLimit: '20mb', // เพิ่มลิมิตการรับข้อมูลรูปภาพเป็น 20MB
        },
    },
};

module.exports = nextConfig;