/* eslint-disable @next/next/no-img-element */
"use client";

// cspell:ignore Cellox
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  FileSpreadsheet,
  Store,
  Users,
  Tag,
  Package,
  MessageSquare,
  Save,
  Trash2,
  Plus,
  Barcode,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  Scan,
  X,
} from "lucide-react";
import {
  getTodayActiveAttendance,
  submitFullDailyActivityReportAction,
  getProductByBarcode,
} from "./actions";

interface ProductFormState {
  barcode: string;
  descriptions: string;
  imageurl: string;
  segment: string;
  price_our: string;
  stock_before: string;
  sales_qty: string;
  img_product_base64: string;
  img_shelf_base64: string;
  img_stock_scanner_base64: string;
}

interface ActivityPhotoState {
  type: string;
  label: string;
  description: string;
  base64: string;
  accept: string;
}

export default function DailyReportPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [user, setUser] = useState<{ id: number; display_name: string } | null>(
    null,
  );
  const [attendanceLog, setAttendanceLog] = useState<{
    id: number;
    store_code: string;
    store_name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // ระบบบาร์โค้ดและการสแกนผ่านกล้อง
  const [searchBarcode, setSearchBarcode] = useState("");
  const [searching, setSearching] = useState(false);
  const [productsForm, setProductsForm] = useState<ProductFormState[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. ฟอร์มข้อมูลกิจกรรม (Funnel)
  const [traffic, setTraffic] = useState("");
  const [approach, setApproach] = useState("");
  const [closedSales, setClosedSales] = useState("");

  // สถานะการบันทึกคลังของแถมสำหรับห้าง Tops แยกต่างหาก
  const [giftOrangeBefore, setGiftOrangeBefore] = useState("");
  const [giftNourishBefore, setGiftNourishBefore] = useState("");
  const [giftNourishGiven, setGiftNourishGiven] = useState("");

  // 2. ฟอร์มราคาคู่แข่ง
  const [priceCompCellox, setPriceCompCellox] = useState("");
  const [priceCompKleenex, setPriceCompKleenex] = useState("");
  const [priceCompPaseo, setPriceCompPaseo] = useState("");

  // 3. รูปภาพรวมกิจกรรม 6 รูป
  const [activityPhotos, setActivityPhotos] = useState<ActivityPhotoState[]>([
    {
      type: "staff_holding",
      label: "พนักงานถือสินค้าหน้าชั้นวาง",
      description: "รูปตัวคุณคู่กับสินค้าหน้าร้าน",
      base64: "",
      accept: "image/*",
    },
    {
      type: "cheer_sales",
      label: "ภาพการเชียร์ขายหน้าร้าน",
      description: "ถ่ายรูปภาพหรือคลิปขณะเชียร์แคมเปญ",
      base64: "",
      accept: "image/*,video/*",
    },
    {
      type: "customer_basket_1",
      label: "รูปถ่ายกับลูกค้า / ตะกร้าสินค้า (ใบที่ 1)",
      description: "หลักฐานการปิดขายใบที่ 1",
      base64: "",
      accept: "image/*",
    },
    {
      type: "customer_basket_2",
      label: "รูปถ่ายกับลูกค้า / ตะกร้าสินค้า (ใบที่ 2)",
      description: "หลักฐานการปิดขายใบที่ 2",
      base64: "",
      accept: "image/*",
    },
    {
      type: "atmosphere_1",
      label: "บรรยากาศการจับจ่าย (มุมกว้าง)",
      description: "ภาพรวมทางเดินและตู้แช่",
      base64: "",
      accept: "image/*",
    },
    {
      type: "atmosphere_2",
      label: "บรรยากาศการจับจ่าย (หน้าเชลฟ์)",
      description: "ภาพใกล้ชั้นวางสินค้า",
      base64: "",
      accept: "image/*",
    },
  ]);

  // 4. บันทึกเพิ่มเติม
  const [feedback, setFeedback] = useState("");
  const [compPromo, setCompPromo] = useState("");

  // 🏪 [แก้ไขจุดบั๊กภาษาไทย] ตรวจสอบชื่อห้างแบบยืดหยุ่นสูง เพื่อป้องกันปัญหาสระซ้อน/วรรณยุกต์เพี้ยน
  const storeName = attendanceLog?.store_name || "";
  const isTops =
    storeName.toLowerCase().includes("top") ||
    storeName.includes("ท็อป") ||
    storeName.includes("ทอป");
  const isBigC =
    storeName.toLowerCase().includes("big") ||
    storeName.includes("บิ๊ก") ||
    storeName.includes("บิ๊กซี");

  // 🔍 เปลี่ยนชุด useEffect เป็นระบบซูเปอร์สแกนหาตัวตนผู้ใช้จริงตัวนี้ครับ
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      setLoading(true);

      let currentUserId = 101; // ค่าเริ่มต้นกรณีฉุกเฉินจริงๆ
      let foundName = "นางสาวพิชญา สระทองลี"; // ชื่อแสดงผลเริ่มต้น

      // 🔗 ขั้นตอนที่ 1: ช่องทางที่ชัวร์ที่สุด ดักจับพารามิเตอร์ผ่าน URL (?userId=xxx หรือ ?id=xxx)
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId =
          urlParams.get("userId") ||
          urlParams.get("id") ||
          urlParams.get("user_id");
        if (urlId && !isNaN(Number(urlId))) {
          currentUserId = Number(urlId);
          console.log(
            "🔗 https://play.google.com/store/apps/details?id=com.gamma.scan&hl=en เจอ User ID จาก Parameter:",
            currentUserId,
          );
        }
      }

      // 🛰️ ขั้นตอนที่ 2: สแกนแบบละเอียดทั้ง localStorage และ sessionStorage พร้อมกัน
      if (currentUserId === 101 && typeof window !== "undefined") {
        const storageTargets = [
          { name: "localStorage", instance: localStorage },
          { name: "sessionStorage", instance: sessionStorage },
        ];

        for (const target of storageTargets) {
          try {
            for (let i = 0; i < target.instance.length; i++) {
              const key = target.instance.key(i);
              if (!key) continue;

              const item = target.instance.getItem(key);
              if (!item) continue;

              const lowerKey = key.toLowerCase();

              // กรณีที่ 2.1: เก็บเป็นค่าตัวเลขตรงๆ ไม่ได้แปลงเป็น JSON (เช่น key="userId", value="105")
              if (
                (lowerKey.includes("user") ||
                  lowerKey.includes("profile") ||
                  lowerKey === "id") &&
                !isNaN(Number(item))
              ) {
                currentUserId = Number(item);
                console.log(
                  `🎯 [Plain Scanner] เจอ ID ใน ${target.name} คีย์ [${key}]:`,
                  currentUserId,
                );
                break;
              }

              // กรณีที่ 2.2: เก็บในรูปแบบออบเจกต์ JSON (เช็คทั้ง Root ID และ Nest ID แบบ Supabase)
              if (item.startsWith("{") || item.startsWith("[")) {
                const parsed = JSON.parse(item);
                if (parsed) {
                  // เช็คโครงสร้างปกติ { id: 105, display_name: "..." }
                  if (parsed.id && !isNaN(Number(parsed.id))) {
                    currentUserId = Number(parsed.id);
                    if (parsed.display_name) foundName = parsed.display_name;
                    console.log(
                      `🎯 [JSON Scanner] เจอ ID ใน คีย์ [${key}]:`,
                      currentUserId,
                    );
                    break;
                  }
                  // เช็คโครงสร้างซ้อนแบบ Supabase Auth Token { user: { id: 105 } }
                  if (
                    parsed.user &&
                    parsed.user.id &&
                    !isNaN(Number(parsed.user.id))
                  ) {
                    currentUserId = Number(parsed.user.id);
                    if (parsed.user.user_metadata?.display_name) {
                      foundName = parsed.user.user_metadata.display_name;
                    }
                    console.log(
                      `🎯 [Supabase Scanner] เจอ ID ใน Token คีย์ [${key}]:`,
                      currentUserId,
                    );
                    break;
                  }
                  // เช็คคีย์ userId แฝง { userId: 105 }
                  if (parsed.userId && !isNaN(Number(parsed.userId))) {
                    currentUserId = Number(parsed.userId);
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Error scanning ${target.name}:`, e);
          }
          if (currentUserId !== 101) break; // ถ้าเจอแล้วให้หยุดลูปทันที
        }
      }

      // บันทึกสถานะผู้ใช้จริงเข้าสู่ State เพื่อส่งต่อไปยัง API ตอนกดเซฟฟอร์ม
      setUser({ id: currentUserId, display_name: foundName });

      // 📡 นำ ID ที่แกะได้จริงไปดึงประวัติการ Check-in ในระบบหลังบ้าน Supabase
      const res = await getTodayActiveAttendance(currentUserId);

      if (res.success && res.log) {
        setAttendanceLog(res.log);
      } else {
        // แจ้งเตือนปฏิเสธสิทธิ์พร้อมบอกประวัติ ID ที่ตรวจพบ
        Swal.fire({
          title: "ปฏิเสธการเข้าถึง",
          text: `กรุณาลงเวลาทำงาน Check-in ที่หน้าหลักเพื่อเปิดใช้งานระบบส่งรายงานกิจกรรมค่ะ (Debug ID: ${currentUserId})`,
          icon: "warning",
          confirmButtonColor: "#1e3a8a",
        }).then(() => router.push("/"));
      }
      setLoading(false);
    };

    fetchAttendanceStatus();
  }, [router]);

  useEffect(() => {
    return () => stopBarcodeScanner();
  }, []);

  const startBarcodeScanner = async () => {
    if (!("BarcodeDetector" in window)) {
      Swal.fire(
        "ระบบไม่รองรับ",
        "เบราว์เซอร์ของอุปกรณ์นี้ไม่รองรับระบบการสแกนผ่านกล้องด่วน โปรดใช้การพิมพ์รหัสบาร์โค้ดหรือปุ่มคีย์ลัดแทนค่ะ",
        "warning",
      );
      return;
    }
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const videoConstraints: any = {
          facingMode: "environment",
          focusMode: "continuous",
        };
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_128"],
          });
          scanIntervalRef.current = window.setInterval(async () => {
            if (
              videoRef.current &&
              videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
            ) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detectedCode = barcodes[0].rawValue;
                  stopBarcodeScanner();
                  await handleSearchAndAddProduct(detectedCode);
                }
              } catch (err) {
                console.error(err);
              }
            }
          }, 300);
        }
      } catch (err: any) {
        setIsScannerOpen(false);
        Swal.fire(
          "ไม่สามารถเปิดกล้องได้",
          "กรุณาอนุญาตสิทธิ์การเข้าถึงกล้องหลังของโทรศัพท์มือถือในเบราว์เซอร์ของคุณ",
          "error",
        );
      }
    }, 100);
  };

  const stopBarcodeScanner = () => {
    setIsScannerOpen(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 📸 ระบบย่อและบีบอัดรูปภาพอัตโนมัติก่อนแปลงเป็น Base64 เพื่อป้องกัน Server Action แตก
  const processFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1024; // จำกัดความกว้างสูงสุดที่ 1024px
          const MAX_HEIGHT = 1024; // จำกัดความสูงสูงสุดที่ 1024px
          let width = img.width;
          let height = img.height;

          // คำนวณสัดส่วนรูปภาพ (Aspect Ratio) เพื่อไม่ให้รูปเบี้ยว
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // 🌟 บีบอัดไฟล์เป็นฟอร์แมต JPEG คุณภาพ 0.7 (ช่วยลดขนาดไฟล์ลงได้ถึง 85-90%)
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          resolve(compressedBase64);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleProductPhotoChange = async (
    barcode: string,
    field:
      | "img_product_base64"
      | "img_shelf_base64"
      | "img_stock_scanner_base64",
    file: File | null,
  ) => {
    if (!file) {
      setProductsForm((prev) =>
        prev.map((p) => (p.barcode === barcode ? { ...p, [field]: "" } : p)),
      );
      return;
    }
    const base64Str = await processFileToBase64(file);
    setProductsForm((prev) =>
      prev.map((p) =>
        p.barcode === barcode ? { ...p, [field]: base64Str } : p,
      ),
    );
  };

  const handleActivityPhotoChange = async (type: string, file: File | null) => {
    if (!file) {
      setActivityPhotos((prev) =>
        prev.map((p) => (p.type === type ? { ...p, base64: "" } : p)),
      );
      return;
    }
    const base64Str = await processFileToBase64(file);
    setActivityPhotos((prev) =>
      prev.map((p) => (p.type === type ? { ...p, base64: base64Str } : p)),
    );
  };

  const handleSearchAndAddProduct = async (barcodeToSearch: string) => {
    if (!barcodeToSearch.trim()) return;
    const isExist = productsForm.some(
      (p) => p.barcode === barcodeToSearch.trim(),
    );
    if (isExist) {
      Swal.fire(
        "ข้อความระบบ",
        "เพิ่มสินค้าบาร์โค้ดนี้ในตารางลงข้อมูลเรียบร้อยแล้วค่ะ",
        "info",
      );
      setSearchBarcode("");
      return;
    }

    setSearching(true);
    const res = await getProductByBarcode(barcodeToSearch);
    setSearching(false);

    if (res.success && res.product) {
      const addedProduct: ProductFormState = {
        barcode: res.product.barcode,
        descriptions: res.product.descriptions,
        imageurl: res.product.imageurl || "",
        segment: res.product.segment || "",
        price_our: "0",
        stock_before: "",
        sales_qty: "",
        img_product_base64: "",
        img_shelf_base64: "",
        img_stock_scanner_base64: "",
      };
      setProductsForm((prev) => [...prev, addedProduct]);
      setSearchBarcode("");

      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(100);
      }
    } else {
      Swal.fire(
        "ไม่พบสินค้า",
        res.message || "ไม่มีสินค้าแบรนด์นี้ในตารางระบบ",
        "error",
      );
    }
  };

  const handleProductFieldChange = (
    barcode: string,
    field: "price_our" | "stock_before" | "sales_qty",
    value: string,
  ) => {
    setProductsForm((prev) =>
      prev.map((item) =>
        item.barcode === barcode ? { ...item, [field]: value } : item,
      ),
    );
  };

  // คำนวณยอดแถมสีส้มอัตโนมัติ (1:1 จากยอดขายเขียว, ฟ้า, ส้ม) เพื่อใช้ตัดสต๊อกของแถมฝั่ง Tops
  const salesQtyGreen =
    Number(
      productsForm.find((p) => p.barcode === "8858678423339")?.sales_qty,
    ) || 0;
  const salesQtyBlue =
    Number(
      productsForm.find((p) => p.barcode === "8858678423681")?.sales_qty,
    ) || 0;
  const salesQtyOrange =
    Number(
      productsForm.find((p) => p.barcode === "8858678422875")?.sales_qty,
    ) || 0;
  const autoOrangeGiftGiven = salesQtyGreen + salesQtyBlue + salesQtyOrange;

  const giftOrangeAfter = Math.max(
    0,
    (Number(giftOrangeBefore) || 0) - autoOrangeGiftGiven,
  );
  const giftNourishAfter = Math.max(
    0,
    (Number(giftNourishBefore) || 0) - (Number(giftNourishGiven) || 0),
  );

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceLog) return;

    if (productsForm.length === 0) {
      Swal.fire(
        "ข้อมูลยังไม่เสร็จสิ้น",
        "กรุณาสแกนรหัสบาร์โค้ดสินค้า RVI เพื่อลงสต๊อกขายอย่างน้อย 1 รายการค่ะ",
        "warning",
      );
      return;
    }

    Swal.fire({
      title: "ยืนยันการบันทึกรายงานกิจกรรม?",
      text: "ระบบจะทำการประมวลผลจัดเก็บพิกัด รูปภาพหน้างาน และยอดขายส่งลูกค้าทันที",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#1e3a8a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "นำส่งข้อมูล",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "กำลังจัดเก็บรายงานลงฐานข้อมูล...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const nourishGreen = productsForm.find(
          (p) => p.barcode === "8858678423339",
        );
        const babyBlue = productsForm.find(
          (p) => p.barcode === "8858678423681",
        );
        const pureSoftOrange = productsForm.find(
          (p) => p.barcode === "8858678422875",
        );

        const res = await submitFullDailyActivityReportAction({
          attendanceLogId: attendanceLog.id,
          userId: user?.id || 102,
          storeCode: attendanceLog.store_code,
          trafficCount: Number(traffic) || 0,
          approachCount: Number(approach) || 0,
          closedSalesCount: Number(closedSales) || 0,
          priceCompCellox: Number(priceCompCellox) || 0,
          priceCompKleenex: Number(priceCompKleenex) || 0,
          priceCompPaseo: Number(priceCompPaseo) || 0,
          feedbackStore: feedback,
          competitorPromotion: compPromo,
          activityPhotos: activityPhotos.filter((p) => p.base64 !== ""),
          products: productsForm.map((p) => ({
            barcode: p.barcode,
            descriptions: p.descriptions,
            price_our: Number(p.price_our) || 0,
            stock_before: Number(p.stock_before) || 0,
            sales_qty: Number(p.sales_qty) || 0,
            stock_after: Math.max(
              0,
              (Number(p.stock_before) || 0) - (Number(p.sales_qty) || 0),
            ),
            img_product_base64: p.img_product_base64,
            img_shelf_base64: p.img_shelf_base64,
            img_stock_scanner_base64: p.img_stock_scanner_base64,
          })),
          priceOurGreen90: nourishGreen
            ? Number(nourishGreen.price_our) || 0
            : 0,
          stockBeforeGreen90: nourishGreen
            ? Number(nourishGreen.stock_before) || 0
            : 0,
          salesQtyGreen90: nourishGreen
            ? Number(nourishGreen.sales_qty) || 0
            : 0,
          stockAfterGreen90: nourishGreen
            ? Math.max(
                0,
                (Number(nourishGreen.stock_before) || 0) -
                  (Number(nourishGreen.sales_qty) || 0),
              )
            : 0,

          priceOurBlue90: babyBlue ? Number(babyBlue.price_our) || 0 : 0,
          stockBeforeBlue90: babyBlue ? Number(babyBlue.stock_before) || 0 : 0,
          salesQtyBlue90: babyBlue ? Number(babyBlue.sales_qty) || 0 : 0,
          stockAfterBlue90: babyBlue
            ? Math.max(
                0,
                (Number(babyBlue.stock_before) || 0) -
                  (Number(babyBlue.sales_qty) || 0),
              )
            : 0,

          priceOurOrange100: pureSoftOrange
            ? Number(pureSoftOrange.price_our) || 0
            : 0,
          stockBeforeOrange100: pureSoftOrange
            ? Number(pureSoftOrange.stock_before) || 0
            : 0,
          salesQtyOrange100: pureSoftOrange
            ? Number(pureSoftOrange.sales_qty) || 0
            : 0,
          stockAfterOrange100: pureSoftOrange
            ? Math.max(
                0,
                (Number(pureSoftOrange.stock_before) || 0) -
                  (Number(pureSoftOrange.sales_qty) || 0),
              )
            : 0,

          // นำส่งข้อมูลตัดยอดคลังของแถมของ Tops เข้า API หลังบ้าน
          giftOrangeBefore: isTops ? Number(giftOrangeBefore) || 0 : 0,
          giftOrangeGiven: isTops ? autoOrangeGiftGiven : 0,
          giftOrangeAfter: isTops ? giftOrangeAfter : 0,
          giftNourishBefore: isTops ? Number(giftNourishBefore) || 0 : 0,
          giftNourishGiven: isTops ? Number(giftNourishGiven) || 0 : 0,
          giftNourishAfter: isTops ? giftNourishAfter : 0,
        } as any);

        Swal.close();
        if (res.success) {
          Swal.fire({
            icon: "success",
            title: "บันทึกรายงานกิจกรรมสำเร็จ",
            confirmButtonColor: "#10b981",
          }).then(() => router.push("/"));
        } else {
          Swal.fire("ส่งข้อมูลล้มเหลว", res.message, "error");
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-green-200 text-slate-950 font-sans antialiased pb-12 select-none">
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-1 hover:bg-blue-800 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-emerald-400" />{" "}
              บันทึกรายงานรวมภาพถ่าย
            </h1>
            <p className="text-[10px] text-blue-200 font-medium">
              Daily Report & Visual Verification
            </p>
          </div>
        </div>
      </header>

      {/* 📹 MODAL: LIVE CAMERA BARCODE SCANNER */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col justify-between items-center p-6">
          <div className="w-full max-w-md flex justify-between items-center text-white mt-4">
            <div className="text-left">
              <h3 className="text-sm font-black flex items-center gap-1.5 text-blue-400">
                <Scan size={16} /> โหมดสแกนบาร์โค้ดสด
              </h3>
              <p className="text-[10px] text-slate-400">
                หันกล้องไปที่บาร์โค้ด RVI บนห่อสินค้า
              </p>
            </div>
            <button
              type="button"
              onClick={stopBarcodeScanner}
              className="p-2 bg-slate-800 rounded-full text-slate-200 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative w-full max-w-xs aspect-square border-2 border-blue-500 rounded-2xl overflow-hidden bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
          </div>
          <div className="text-slate-400 text-[10px] text-center max-w-xs mb-8 font-medium">
            โปรดจัดตำแหน่งแถบบาร์โค้ดให้อยู่ในกรอบเล็งเป้า
            ระบบจะตรวจจับอัตโนมัติค่ะ
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* การ์ดข้อมูลสาขาปฏิบัติงานประจำวัน */}
        <div className="bg-slate-900 p-4 rounded-xl text-white flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-white/10 text-amber-300 rounded-lg">
            <Store size={16} />
          </div>
          <div className="text-left">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              สาขาเปิดงานประจำวัน
            </p>
            <h3 className="text-xs font-black">{attendanceLog?.store_name}</h3>
          </div>
        </div>

        {/* 🏪 การ์ดแสดงเงื่อนไขโปรโมชันประจำสาขา (Dynamic Promo Guide) */}
        {(isBigC || isTops) && (
          <div
            className={`p-4 rounded-xl border text-left text-xs ${isBigC ? "bg-lime-50 border-lime-200" : "bg-orange-50 border-orange-200"}`}
          >
            <div className="flex items-center gap-1.5 font-black text-slate-800 border-b border-black/5 pb-2 mb-2">
              <Tag
                size={14}
                className={isBigC ? "text-lime-600" : "text-orange-600"}
              />
              <span>
                คู่มือตรวจสอบโปรโมชันหน้าร้าน (
                {isBigC ? "Big C Campaign" : "Tops Campaign"})
              </span>
            </div>

            {isBigC && (
              <ul className="space-y-1.5 font-bold text-slate-700">
                <li className="flex items-start gap-1">
                  <span className="text-lime-600">•</span>
                  <span>สีเขียว 90 แผ่น: ราคา 150 บาท (ซื้อ 1 แถม 1)</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-lime-600">•</span>
                  <span>สีฟ้า 90 แผ่น: ราคา 142 บาท (ซื้อ 1 แถม 1)</span>
                </li>
              </ul>
            )}

            {isTops && (
              <div className="space-y-3">
                <ul className="space-y-1.5 font-bold text-slate-700">
                  <li className="flex items-start gap-1">
                    <span className="text-orange-600">•</span>
                    <span>
                      สีเขียว 90 แผ่น: ราคา 150 บ.{" "}
                      <span className="text-orange-700">
                        (ซื้อ 1 แพ็ค ฟรี! สีส้ม 100 แผ่น 1 แพ็ค)
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-orange-600">•</span>
                    <span>
                      สีฟ้า 90 แผ่น: ราคา 142 บ.{" "}
                      <span className="text-orange-700">
                        (ซื้อ 1 แพ็ค ฟรี! สีส้ม 100 แผ่น 1 แพ็ค)
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-orange-600">•</span>
                    <span>
                      สีส้ม 100 แผ่น: ราคา 100 บ.{" "}
                      <span className="text-orange-700">
                        (ซื้อ 1 แพ็ค ฟรี! สีส้ม 100 แผ่น 1 แพ็ค)
                      </span>
                    </span>
                  </li>
                </ul>
                <div className="bg-white/80 border border-orange-200 p-2 rounded-lg">
                  <p className="font-black text-rose-700 text-[10px] mb-0.5">
                    🔥 รายการพิเศษขั้นบันได:
                  </p>
                  <p className="text-[10px] text-slate-700 font-bold leading-normal">
                    ซื้อสินค้า Mild Luxury ครบ{" "}
                    <span className="text-slate-950 font-black underline">
                      339 บาท
                    </span>{" "}
                    ขึ้นไป/บิล
                    <span className="block text-emerald-700 font-black mt-0.5">
                      🎁 แจกฟรี! Nourish Soft 6 Ply 40's Pack 4 (มูลค่า 89.-)
                      จำนวน 1 แพ็ค
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={onFormSubmit} className="space-y-4">
          {/* Section 1: Funnel */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
              <Users size={14} className="text-blue-600" /> 1.
              ข้อมูลจำนวนผู้เข้าชมกิจกรรม
            </h4>
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Traffic (เดินผ่าน)
                </label>
                <input
                  type="number"
                  placeholder="คน"
                  value={traffic}
                  onChange={(e) => setTraffic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Approach (ทักทาย)
                </label>
                <input
                  type="number"
                  placeholder="คน"
                  value={approach}
                  onChange={(e) => setApproach(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Closed (ยอดขายได้)
                </label>
                <input
                  type="number"
                  placeholder="คน"
                  value={closedSales}
                  onChange={(e) => setClosedSales(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Product Scanner & shortcuts */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
              <Barcode size={14} className="text-blue-700" /> 2.
              บันทึกยอดขายและสแตมป์รูปรายสินค้า (3 รูป)
            </h4>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={startBarcodeScanner}
                className="bg-blue-600 text-white p-2.5 rounded-lg flex items-center justify-center hover:bg-blue-700 transition shadow-xs"
              >
                <Scan size={16} />
              </button>
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="พิมพ์บาร์โค้ดสินค้าแคมเปญ..."
                  value={searchBarcode}
                  onChange={(e) => setSearchBarcode(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(),
                    handleSearchAndAddProduct(searchBarcode))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-xs font-bold outline-none focus:bg-white focus:border-blue-500"
                />
                <Barcode
                  size={14}
                  className="absolute right-3 top-3 text-slate-400"
                />
              </div>
              <button
                type="button"
                disabled={searching}
                onClick={() => handleSearchAndAddProduct(searchBarcode)}
                className="bg-blue-900 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-blue-800 transition"
              >
                {searching ? "..." : "ค้นหา"}
              </button>
            </div>

            <div className="text-left pt-0.5">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                คีย์ลัดผลิตภัณฑ์ Mild Luxury:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423339")}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95"
                >
                  <Plus size={8} /> สีเขียว 90
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423681")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95"
                >
                  <Plus size={8} /> สีฟ้า 90
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678422875")}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95"
                >
                  <Plus size={8} /> สีส้ม 100
                </button>
              </div>
            </div>

            {/* รายการฟอร์มข้อมูลรายตัวสินค้า */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              {productsForm.length === 0 ? (
                <div className="py-6 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5">
                  <Barcode size={24} className="text-slate-300" />
                  <p className="text-[10px] font-bold">
                    กดสแกนด้วยกล้องหรือใช้คีย์ลัดเพื่อเริ่มคีย์ยอด
                  </p>
                </div>
              ) : (
                productsForm.map((prod) => {
                  const stockAfter = Math.max(
                    0,
                    (Number(prod.stock_before) || 0) -
                      (Number(prod.sales_qty) || 0),
                  );
                  return (
                    <div
                      key={prod.barcode}
                      className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col gap-2.5 text-left"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-white border border-slate-200 rounded-md overflow-hidden flex items-center justify-center">
                            {prod.imageurl ? (
                              <img
                                src={prod.imageurl}
                                alt="pic"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <ImageIcon size={14} className="text-slate-300" />
                            )}
                          </div>
                          <div className="leading-tight">
                            {(() => {
                              if (prod.barcode === "8858678423339")
                                return (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white bg-emerald-600">
                                    สีเขียว 90
                                  </span>
                                );
                              if (prod.barcode === "8858678423681")
                                return (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white bg-blue-600">
                                    สีฟ้า 90
                                  </span>
                                );
                              if (prod.barcode === "8858678422875")
                                return (
                                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white bg-orange-600">
                                    สีส้ม 100
                                  </span>
                                );
                              return (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded text-white bg-slate-600">
                                  สินค้าแคมเปญ
                                </span>
                              );
                            })()}
                            <h5 className="text-[11px] font-black text-slate-800 mt-0.5 line-clamp-1">
                              {prod.descriptions}
                            </h5>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setProductsForm((prev) =>
                              prev.filter((p) => p.barcode !== prod.barcode),
                            )
                          }
                          className="p-1 text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                            ราคาขาย
                          </label>
                          <input
                            type="number"
                            value={prod.price_our}
                            onChange={(e) =>
                              handleProductFieldChange(
                                prod.barcode,
                                "price_our",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                            Stock เช้า
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={prod.stock_before}
                            onChange={(e) =>
                              handleProductFieldChange(
                                prod.barcode,
                                "stock_before",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                            จำนวนขาย
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            value={prod.sales_qty}
                            onChange={(e) =>
                              handleProductFieldChange(
                                prod.barcode,
                                "sales_qty",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block mb-0.5">
                            Stock เย็น
                          </label>
                          <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-black text-center text-slate-700">
                            {stockAfter}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200 grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-500">
                            1. รูปตัวสินค้า
                          </p>
                          <label className="cursor-pointer relative flex flex-col items-center justify-center aspect-square border border-dashed border-slate-300 rounded-lg bg-white hover:bg-slate-50 overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleProductPhotoChange(
                                  prod.barcode,
                                  "img_product_base64",
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                            {prod.img_product_base64 ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={prod.img_product_base64}
                                  alt="p"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 right-0 p-0.5 bg-emerald-600 text-white rounded-bl-lg">
                                  <CheckCircle size={10} />
                                </div>
                              </div>
                            ) : (
                              <Camera size={14} className="text-slate-400" />
                            )}
                          </label>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-500">
                            2. รูปชั้นวาง (Shelf)
                          </p>
                          <label className="cursor-pointer relative flex flex-col items-center justify-center aspect-square border border-dashed border-slate-300 rounded-lg bg-white hover:bg-slate-50 overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleProductPhotoChange(
                                  prod.barcode,
                                  "img_shelf_base64",
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                            {prod.img_shelf_base64 ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={prod.img_shelf_base64}
                                  alt="s"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 right-0 p-0.5 bg-emerald-600 text-white rounded-bl-lg">
                                  <CheckCircle size={10} />
                                </div>
                              </div>
                            ) : (
                              <Camera size={14} className="text-slate-400" />
                            )}
                          </label>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] font-bold text-slate-500">
                            3. หน้าจอสแกนเนอร์
                          </p>
                          <label className="cursor-pointer relative flex flex-col items-center justify-center aspect-square border border-dashed border-slate-300 rounded-lg bg-white hover:bg-slate-50 overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleProductPhotoChange(
                                  prod.barcode,
                                  "img_stock_scanner_base64",
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                            {prod.img_stock_scanner_base64 ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={prod.img_stock_scanner_base64}
                                  alt="sc"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-0 right-0 p-0.5 bg-emerald-600 text-white rounded-bl-lg">
                                  <CheckCircle size={10} />
                                </div>
                              </div>
                            ) : (
                              <Camera size={14} className="text-slate-400" />
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 🎁 3. ระบบบันทึกและตัดยอดของแถมประจำวัน (เปิดการแสดงผลเฉพาะเครือห้าง Tops เท่านั้น) */}
          {isTops && (
            <div className="bg-white p-4 rounded-xl border border-orange-300 shadow-xs space-y-3 bg-gradient-to-br from-white to-orange-50/10">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-orange-100 pb-2 text-left">
                <Package size={14} className="text-orange-600" /> 3.
                บันทึกและตัดยอดคลังของแถมประจำวัน (เฉพาะ Tops)
              </h4>
              <p className="text-[9px] text-slate-400 font-bold -mt-1 text-left leading-normal">
                * ของแถมส่งเข้าแยกต่างหากจากบริษัท
                พนักงานเชียร์ต้องนับยอดสต๊อกเช้าเพื่อนำมาหักลบยอดแจกสรุปสต๊อกเหลือเย็นค่ะ
              </p>

              <div className="space-y-3">
                {/* 1. สต๊อกของแถมสีส้ม 100 แผ่น (ตัดยอด 1:1 อัตโนมัติ) */}
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 text-left space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-800">
                      🎁 [8858678422875] ของแถม Mild Luxury สีส้ม 100 แผ่น
                    </span>
                    <span className="text-[8px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      แถม 1:1
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        สต๊อกแถมเช้า
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={giftOrangeBefore}
                        onChange={(e) => setGiftOrangeBefore(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        ตัดยอดแจก (Auto)
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-black text-center text-slate-600">
                        {autoOrangeGiftGiven}
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        คงเหลือเย็น
                      </label>
                      <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-1 text-[11px] font-black text-center text-orange-700">
                        {giftOrangeAfter}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. สต๊อกของแถมพิเศษ 6 Ply (อิงยอดบิลคีย์มือ) */}
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 text-left space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-800">
                      🎁 [8858678423544] ของแถมพิเศษ Nourish Soft 6 Ply (ยอด
                      339.-)
                    </span>
                    <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
                      ตามใบเสร็จ
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        สต๊อกแถมเช้า
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={giftNourishBefore}
                        onChange={(e) => setGiftNourishBefore(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        คีย์จำนวนที่แจก
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={giftNourishGiven}
                        onChange={(e) => setGiftNourishGiven(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-bold text-center outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 block mb-0.5">
                        คงเหลือเย็น
                      </label>
                      <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-1 text-[11px] font-black text-center text-orange-700">
                        {giftNourishAfter}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: 6 Activity Photos */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
              <Camera size={14} className="text-rose-600" />{" "}
              {isTops ? "4" : "3"}. ภาพรวมการทำกิจกรรมประจำวัน (อัปโหลด 6 รูป)
            </h4>
            <div className="grid grid-cols-2 gap-3 text-left">
              {activityPhotos.map((photo) => (
                <div key={photo.type} className="flex flex-col gap-1">
                  <p className="text-[10px] font-bold text-slate-700 leading-tight">
                    {photo.label}
                  </p>
                  <label className="cursor-pointer relative flex flex-col items-center justify-center h-24 border border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100/60 transition overflow-hidden">
                    <input
                      type="file"
                      accept={photo.accept}
                      className="hidden"
                      onChange={async (e) =>
                        handleActivityPhotoChange(
                          photo.type,
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                    {photo.base64 ? (
                      <div className="relative w-full h-full">
                        <img
                          src={photo.base64}
                          alt="act"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleActivityPhotoChange(photo.type, null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full hover:bg-red-700 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 gap-1 p-2 text-center">
                        <Camera size={18} className="text-slate-300" />
                        <span className="text-[9px] font-bold leading-normal text-slate-400">
                          {photo.description}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Competitor Pricing */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
              <Tag size={14} className="text-indigo-600" /> {isTops ? "5" : "4"}
              . ตรวจสอบราคาคู่แข่งประจำวัน (บาท)
            </h4>
            <div className="grid grid-cols-3 gap-2 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Cellox satin
                </label>
                <input
                  type="number"
                  placeholder="ราคา"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  คลีเน็กซ์ แอคเน่
                </label>
                <input
                  type="number"
                  placeholder="ราคา"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  Paseo baby
                </label>
                <input
                  type="number"
                  placeholder="ราคา"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs text-center font-bold outline-none focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 6: Customer Feedback */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
              <MessageSquare size={14} className="text-amber-600" />{" "}
              {isTops ? "6" : "5"}. บันทึกเพิ่มเติมจากหน้าร้าน
            </h4>
            <div className="space-y-3 text-left">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Feedback จากลูกค้า
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ลูกค้าบ่นเรื่องราคาสินค้าคู่แข่ง..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  โปรโมชันของทางคู่แข่ง
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น Cellox จัดโปรโมชั่นแถมของแถมพรีเมี่ยม..."
                  value={compPromo}
                  onChange={(e) => setCompPromo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs outline-none focus:bg-white focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white p-3.5 rounded-xl transition font-black text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Save size={16} /> บันทึกและนำส่งรายงานฉบับสมบูรณ์
          </button>
        </form>
      </main>
    </div>
  );
}
