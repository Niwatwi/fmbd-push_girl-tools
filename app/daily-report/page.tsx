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
  Scan,
  X,
} from "lucide-react";
import {
  getTodayActiveAttendance,
  submitFullDailyActivityReportAction,
  getProductByBarcode,
  getStoreInitialGiftsAction,
} from "./actions";
import {
  getPromotionByStoreAction,
  type PromotionConfig,
} from "../admin/promotions/actions";

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
  const [promotionData, setPromotionData] = useState<PromotionConfig | null>(
    null,
  );

  // สถานะโปรโมชัน (ดึงแบบ Dynamic เมื่อมีการเปิดใช้งานแคมเปญ)
  const [activePromotion, setActivePromotion] =
    useState<PromotionConfig | null>(null);

  // ระบบบาร์โค้ดและการสแกนผ่านกล้อง
  const [searchBarcode, setSearchBarcode] = useState("");
  const [searching, setSearching] = useState(false);
  const [productsForm, setProductsForm] = useState<ProductFormState[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // 1. ฟอร์มข้อมูลกิจกรรม (Funnel)
  const [traffic, setTraffic] = useState("");
  const [approach, setApproach] = useState("");
  const [closedSales, setClosedSales] = useState("");

  // สถานะการบันทึกคลังของแถม
  const [giftOrangeBefore, setGiftOrangeBefore] = useState("0");
  const [giftNourishBefore, setGiftNourishBefore] = useState("0");
  const [giftNourishGiven, setGiftNourishGiven] = useState("");

  // 2. ฟอร์มราคาคู่แข่ง
  const [priceCompCellox, setPriceCompCellox] = useState("");
  const [priceCompKleenex, setPriceCompKleenex] = useState("");
  const [priceCompPaseo, setPriceCompPaseo] = useState("");

  const [remark, setRemark] = useState("");

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

  const storeCode = attendanceLog?.store_code || "";

  // 🔍 โหลดข้อมูลสถานะการลงเวลา + ดึงยอดยกมาของของแถม
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      setLoading(true);

      let currentUserId = 101;
      let foundName = "นางสาวพิชญา สระทองลี";

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlId =
          urlParams.get("userId") ||
          urlParams.get("id") ||
          urlParams.get("user_id");
        if (urlId && !isNaN(Number(urlId))) {
          currentUserId = Number(urlId);
        }
      }

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

              if (
                (lowerKey.includes("user") ||
                  lowerKey.includes("profile") ||
                  lowerKey === "id") &&
                !isNaN(Number(item))
              ) {
                currentUserId = Number(item);
                break;
              }

              if (item.startsWith("{") || item.startsWith("[")) {
                const parsed = JSON.parse(item);
                if (parsed) {
                  if (parsed.id && !isNaN(Number(parsed.id))) {
                    currentUserId = Number(parsed.id);
                    if (parsed.display_name) foundName = parsed.display_name;
                    break;
                  }
                  if (
                    parsed.user &&
                    parsed.user.id &&
                    !isNaN(Number(parsed.user.id))
                  ) {
                    currentUserId = Number(parsed.user.id);
                    if (parsed.user.user_metadata?.display_name) {
                      foundName = parsed.user.user_metadata.display_name;
                    }
                    break;
                  }
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
          if (currentUserId !== 101) break;
        }
      }

      setUser({ id: currentUserId, display_name: foundName });

      const res = await getTodayActiveAttendance(currentUserId);

      if (res.success && res.log) {
        setAttendanceLog(res.log);

        if (res.log.store_code) {
          const giftRes = await getStoreInitialGiftsAction(res.log.store_code);
          if (giftRes.success) {
            setGiftOrangeBefore(giftRes.giftOrangeBefore?.toString() || "0");
            setGiftNourishBefore(giftRes.giftNourishBefore?.toString() || "0");
          }
        }
      } else {
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

  // ดึงข้อมูลโปรโมชันประจำสาขา (หากมีการเซ็ตรายการไว้)
  useEffect(() => {
    const fetchPromotion = async () => {
      if (attendanceLog?.store_code) {
        const res = await getPromotionByStoreAction(storeCode);
        if (res.success && res.promotions && res.promotions.length > 0) {
          setPromotionData(res.promotions[0]);
        }
      }
    };

    fetchPromotion();
  }, [attendanceLog, storeCode]);

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

  const processFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

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

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.5);
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

        try {
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
            remark: remark,
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
            stockBeforeBlue90: babyBlue
              ? Number(babyBlue.stock_before) || 0
              : 0,
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

            // ส่งข้อมูลของแถม dynamic ตามรายการโปรโมชันที่มีการเปิดใช้งาน
            giftOrangeBefore: activePromotion
              ? Number(giftOrangeBefore) || 0
              : 0,
            giftOrangeGiven: activePromotion ? autoOrangeGiftGiven : 0,
            giftOrangeAfter: activePromotion ? giftOrangeAfter : 0,
            giftNourishBefore: activePromotion
              ? Number(giftNourishBefore) || 0
              : 0,
            giftNourishGiven: activePromotion
              ? Number(giftNourishGiven) || 0
              : 0,
            giftNourishAfter: activePromotion ? giftNourishAfter : 0,
          } as any);

          Swal.close();
          if (res?.success) {
            Swal.fire({
              icon: "success",
              title: "บันทึกรายงานกิจกรรมสำเร็จ",
              confirmButtonColor: "#10b981",
            }).then(() => router.push("/"));
          } else {
            Swal.fire(
              "ส่งข้อมูลล้มเหลว",
              res?.message || "เกิดข้อผิดพลาดในการบันทึก",
              "error",
            );
          }
        } catch (error: any) {
          console.error("Submission Exception:", error);
          Swal.close();
          Swal.fire(
            "การเชื่อมต่อขัดข้อง",
            "ขนาดไฟล์รูปภาพอาจใหญ่เกินไป หรือสัญญาณอินเทอร์เน็ตหลุด กรุณาลองใหม่อีกครั้ง",
            "error",
          );
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

        {/* 🏪 การ์ดแสดงเงื่อนไขโปรโมชันประจำสาขา (Dynamic เมื่อมีการตั้งค่าโปรโมชัน) */}
        {activePromotion && (
          <div
            className={`p-4 rounded-xl border text-left text-xs ${
              activePromotion.target_type === "COMPANY_TAG"
                ? "bg-amber-50 border-amber-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <div className="flex items-center gap-1.5 font-black text-slate-800 border-b border-black/5 pb-2 mb-2">
              <Tag
                size={14}
                className={
                  activePromotion.target_type === "COMPANY_TAG"
                    ? "text-amber-600"
                    : "text-orange-600"
                }
              />
              <span>
                คู่มือตรวจสอบโปรโมชันหน้าร้าน ({activePromotion.campaign_title})
              </span>
            </div>

            <ul className="space-y-1.5 font-bold text-slate-700">
              {activePromotion.items?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1">
                  <span
                    className={
                      activePromotion.target_type === "COMPANY_TAG"
                        ? "text-amber-600"
                        : "text-orange-600"
                    }
                  >
                    •
                  </span>
                  <span>
                    {item.label}: ราคา {item.price} บ.{" "}
                    <span
                      className={
                        activePromotion.target_type === "COMPANY_TAG"
                          ? "text-amber-700"
                          : "text-orange-700"
                      }
                    >
                      ({item.condition})
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {activePromotion.special_tier_text && (
              <div className="mt-3 bg-white/80 border border-orange-200 p-2 rounded-lg">
                <p className="font-black text-rose-700 text-[10px] mb-0.5">
                  🔥 รายการพิเศษขั้นบันได:
                </p>
                <p className="text-[10px] text-slate-700 font-bold leading-normal">
                  {activePromotion.special_tier_text}
                </p>
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
                className="bg-blue-600 text-white p-2.5 rounded-lg flex items-center justify-center hover:bg-blue-700 transition shadow-xs cursor-pointer"
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
                className="bg-blue-900 text-white px-3 py-2 rounded-lg text-xs font-black hover:bg-blue-800 transition cursor-pointer"
              >
                {searching ? "..." : "ค้นหา"}
              </button>
            </div>

            {/* คีย์ลัดผลิตภัณฑ์ Mild Luxury */}
            <div className="text-left pt-0.5">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                คีย์ลัดผลิตภัณฑ์ :
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423339")}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> มายด์ลักซูรี่ สีเขียว 90
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423681")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> มายด์ลักซูรี่ สีฟ้า 90
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678422875")}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> มายด์ลักซูรี่ สีส้ม 100
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423407")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> มายด์โดราเอมอน แพ็ค 5
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678423063")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ เช็ดหน้า 4+1
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8851020101213")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ ชำระ 6+2
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8851020101220")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ ชำระ 24+6
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678422769")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ อเนกประสงค์ 200
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678422752")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ อเนกประสงค์ 3+1
                </button>
                <button
                  type="button"
                  onClick={() => handleSearchAndAddProduct("8858678421304")}
                  className="bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
                >
                  <Plus size={8} /> เทนเดอร์ อเนกประสงค์ 6+2
                </button>
              </div>
            </div>

            {/* รายการสินค้าที่เลือก */}
            {productsForm.map((product) => (
              <div
                key={product.barcode}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {product.imageurl && (
                      <img
                        src={product.imageurl}
                        alt={product.descriptions}
                        className="w-10 h-10 object-cover rounded-lg border"
                      />
                    )}
                    <div>
                      <p className="text-xs font-black text-slate-800 line-clamp-1">
                        {product.descriptions}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        บาร์โค้ด: {product.barcode}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setProductsForm((prev) =>
                        prev.filter((p) => p.barcode !== product.barcode),
                      )
                    }
                    className="text-red-500 p-1 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                      ราคาขาย (บ.)
                    </label>
                    <input
                      type="number"
                      value={product.price_our}
                      onChange={(e) =>
                        handleProductFieldChange(
                          product.barcode,
                          "price_our",
                          e.target.value,
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                      สต๊อกยกมา
                    </label>
                    <input
                      type="number"
                      value={product.stock_before}
                      onChange={(e) =>
                        handleProductFieldChange(
                          product.barcode,
                          "stock_before",
                          e.target.value,
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                      จำนวนขาย
                    </label>
                    <input
                      type="number"
                      value={product.sales_qty}
                      onChange={(e) =>
                        handleProductFieldChange(
                          product.barcode,
                          "sales_qty",
                          e.target.value,
                        )
                      }
                      className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* ส่วนการอัปโหลดรูปภาพ 3 รูปของสินค้า */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      1. รูปสินค้า
                    </label>
                    <label className="border border-dashed border-slate-300 bg-white rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer h-16">
                      {product.img_product_base64 ? (
                        <img
                          src={product.img_product_base64}
                          alt="preview"
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : (
                        <Camera size={14} className="text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleProductPhotoChange(
                            product.barcode,
                            "img_product_base64",
                            e.target.files?.[0] || null,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      2. รูปเชลฟ์
                    </label>
                    <label className="border border-dashed border-slate-300 bg-white rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer h-16">
                      {product.img_shelf_base64 ? (
                        <img
                          src={product.img_shelf_base64}
                          alt="preview"
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : (
                        <Camera size={14} className="text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleProductPhotoChange(
                            product.barcode,
                            "img_shelf_base64",
                            e.target.files?.[0] || null,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      3. สแกนสต๊อก
                    </label>
                    <label className="border border-dashed border-slate-300 bg-white rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer h-16">
                      {product.img_stock_scanner_base64 ? (
                        <img
                          src={product.img_stock_scanner_base64}
                          alt="preview"
                          className="h-full w-full object-cover rounded-md"
                        />
                      ) : (
                        <Camera size={14} className="text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleProductPhotoChange(
                            product.barcode,
                            "img_stock_scanner_base64",
                            e.target.files?.[0] || null,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section: บันทึกสต๊อกของแถมแคมเปญ (แสดงผลแบบ Dynamic เมื่อมีการเปิดใช้งานโปรโมชัน) */}
          {activePromotion && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-xs space-y-3 text-left">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                <Package size={14} /> บันทึกสต๊อกของแถมแคมเปญ
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
                  <p className="font-bold text-slate-700 text-[10px]">
                    กระเป๋าส้ม (แจกอัตโนมัติ)
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    ยกมา: {giftOrangeBefore} | แจกไป: {autoOrangeGiftGiven} |
                    คงเหลือ: {giftOrangeAfter}
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs">
                  <p className="font-bold text-slate-700 text-[10px]">
                    Nourish Premium (ระบุจำนวนแจก)
                  </p>
                  <input
                    type="number"
                    placeholder="จำนวนแจก..."
                    value={giftNourishGiven}
                    onChange={(e) => setGiftNourishGiven(e.target.value)}
                    className="w-full mt-1 bg-amber-50/50 border border-slate-300 rounded p-1 text-xs font-bold"
                  />
                  <p className="text-[9px] text-slate-500 font-medium mt-1">
                    คงเหลือ: {giftNourishAfter}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: ราคาคู่แข่ง และข้อมูลการตลาด */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 text-left">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Tag size={14} className="text-rose-600" /> 3.
              ราคาเปรียบเทียบแบรนด์คู่แข่ง
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  เซลล็อกซ์ ซาติน แพ็ค 4 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  คลีเน็กซ์ ซิลค์กี้สมูท แพ็ค 4 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  สก็อตต์เซฟซอฟท์บ๊อกซ์แพ็ค4 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  ซิลค์ คอตตอน ชำระแพ็ค 6 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  เซลล็อกซ์ 2 ชั้น ชำระแพ็ค 6 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  สก็อตต์ เอ็กซ์ตร้า ชำระแพ็ค 6 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  ซิลค์ คอตตอน ชำระแพ็ค 24 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  เซลล็อกซ์ 2 ชั้น ชำระแพ็ค 24 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  สก็อตต์ เอ็กซ์ตร้า ชำระแพ็ค 24 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  แม๊กโม่แบบแขวน 200 แผ่น (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  แม๊กซ์โม่อเนกประสงค์ แพ็ค 3 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  สก็อตต์ อเนกประสงค์ 3+1 (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  ซแม๊กโม่ อเนกประสงค์ 6+2 เขียว (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompCellox}
                  onChange={(e) => setPriceCompCellox(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  แม๊กซ์โม่ อเนกประสงค์ 6+2 แดง (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompKleenex}
                  onChange={(e) => setPriceCompKleenex(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                  สก็อตต์ อเนกประสงค์ 6+2 แดง (บ.)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={priceCompPaseo}
                  onChange={(e) => setPriceCompPaseo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold text-center outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  โปรโมชันคู่แข่งหน้าร้าน
                </label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดโปรโมชันคู่แข่ง..."
                  value={compPromo}
                  onChange={(e) => setCompPromo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  ข้อเสนอแนะ / ความคิดเห็นลูกค้า
                </label>
                <textarea
                  rows={2}
                  placeholder="คำติชม หรือข้อเสนอแนะจากลูกค้า..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: รูปภาพบรรยากาศและกิจกรรม 6 รูป */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 text-left">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Camera size={14} className="text-indigo-600" /> 4.
              รูปภาพการทำงานประจำวัน (รวม 6 รายการ)
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {activityPhotos.map((photo) => (
                <div
                  key={photo.type}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5"
                >
                  <p className="text-[10px] font-black text-slate-800 truncate">
                    {photo.label}
                  </p>
                  <p className="text-[8px] text-slate-500 font-medium truncate">
                    {photo.description}
                  </p>
                  <label className="border-2 border-dashed border-slate-300 bg-white rounded-lg p-2 text-center flex flex-col items-center justify-center cursor-pointer h-24 hover:bg-slate-100 transition relative overflow-hidden">
                    {photo.base64 ? (
                      <img
                        src={photo.base64}
                        alt={photo.label}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 gap-1">
                        <ImageIcon size={20} />
                        <span className="text-[9px] font-bold">แนบรูปถ่าย</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept={photo.accept}
                      className="hidden"
                      onChange={(e) =>
                        handleActivityPhotoChange(
                          photo.type,
                          e.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: หมายเหตุเพิ่มเติม */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2 text-left">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MessageSquare size={14} className="text-slate-600" /> 5.
              หมายเหตุเพิ่มเติม
            </h4>
            <textarea
              rows={2}
              placeholder="ข้อความหมายเหตุอื่นๆ..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-medium outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          {/* ปุ่มส่งรายงาน */}
          <button
            type="submit"
            className="w-full bg-blue-900 text-white font-black py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-800 transition shadow-lg cursor-pointer"
          >
            <Save size={16} /> บันทึกและนำส่งรายงานกิจกรรมประจำวัน
          </button>
        </form>
      </main>
    </div>
  );
}
