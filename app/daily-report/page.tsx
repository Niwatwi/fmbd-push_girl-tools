/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import ThemeToggle from "../components/ThemeToggle";
import {
  ArrowLeft,
  ChevronDown,
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
  getPromotionGiftInventoryAction,
  receivePromotionGiftStockAction,
  uploadDailyReportPhotoAction,
} from "./actions";
import {
  getPromotionByStoreAction,
  type PromotionConfig,
} from "../admin/promotions/actions";

interface ProductFormState {
  barcode: string;
  sku_code: string;
  item_scope: "OUR" | "COMPETITOR";
  target_qty: number;
  credit_factor: number;
  descriptions: string;
  imageurl: string;
  segment: string;
  price_our: string;
  competitor_price: string;
  stock_before: string;
  sales_qty: string;
  img_product_base64: string;
  img_shelf_base64: string;
  img_stock_scanner_base64: string;
}

type ProductPhotoField =
  | "img_product_base64"
  | "img_shelf_base64"
  | "img_stock_scanner_base64";

interface ActivityPhotoState {
  type: string;
  label: string;
  description: string;
  base64: string;
  accept: string;
}

// 📦 รายการสินค้าคีย์ลัดหลักของแบรนด์ (Quick Products)
const QUICK_PRODUCTS = [
  {
    barcode: "8858678423339",
    label: "มายด์ลักซูรี่ สีเขียว 90",
    className:
      "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  {
    barcode: "8858678423681",
    label: "มายด์ลักซูรี่ สีฟ้า 90",
    className: "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    barcode: "8858678422875",
    label: "มายด์ลักซูรี่ สีส้ม 100",
    className:
      "bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    barcode: "8858678423407",
    label: "มายด์โดราเอมอน แพ็ค 5",
    className: "bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    barcode: "8858678423063",
    label: "เทนเดอร์ เช็ดหน้า 4+1",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
  {
    barcode: "8851020101213",
    label: "เทนเดอร์ ชำระ 6+2",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
  {
    barcode: "8851020101220",
    label: "เทนเดอร์ ชำระ 24+6",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
  {
    barcode: "8858678422769",
    label: "เทนเดอร์ อเนกประสงค์ 200",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
  {
    barcode: "8858678422752",
    label: "เทนเดอร์ อเนกประสงค์ 3+1",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
  {
    barcode: "8858678421304",
    label: "เทนเดอร์ อเนกประสงค์ 6+2",
    className: "bg-red-50 hover:bg-red-100 text-red-800 border-red-200",
  },
];

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
    staff_group?: string;
    store_company_tag?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [promotionData, setPromotionData] = useState<PromotionConfig | null>(
    null,
  );

  // สถานะโปรโมชัน
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
  const [giftInventory, setGiftInventory] = useState<
    Record<string, { received: number; given: number; remaining: number }>
  >({});
  const [giftReceiptDate, setGiftReceiptDate] = useState(() =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
      new Date(),
    ),
  );
  const [giftReceiptQuantities, setGiftReceiptQuantities] = useState<
    Record<string, string>
  >({});
  const [giftGivenQuantities, setGiftGivenQuantities] = useState<
    Record<string, string>
  >({});

  // 2. ฟอร์มราคาคู่แข่ง (Dynamic State)
  const [competitorPrices, setCompetitorPrices] = useState<
    Record<string, string>
  >({});
  const [competitorSales, setCompetitorSales] = useState<
    Record<string, string>
  >({});
  const [competitorPhotos, setCompetitorPhotos] = useState<
    Record<string, Partial<Record<ProductPhotoField, string>>>
  >({});

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
  const competitorPromotionItems = (activePromotion?.items || []).filter(
    (item) =>
      item.item_scope === "COMPETITOR" ||
      item.products?.company_type?.trim().toLowerCase() === "competitor",
  );

  // 🔍 โหลดข้อมูลสถานะการลงเวลา + ดึงยอดยกมาของของแถม
  useEffect(() => {
    const fetchAttendanceStatus = async () => {
      setLoading(true);

      const res = await getTodayActiveAttendance();
      if (!res.user) {
        router.push("/login");
        return;
      }

      setUser(res.user);
      const currentUserId = res.user.id;

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

  // ดึงข้อมูลโปรโมชันประจำสาขา
  useEffect(() => {
    const fetchPromotion = async () => {
      if (attendanceLog?.store_code) {
        const res = await getPromotionByStoreAction(
          storeCode,
          attendanceLog.store_company_tag,
          user?.id,
          true,
        );
        if (res.success && res.promotions?.length) {
          const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
          const activeCampaign = res.promotions.find(
            (campaign) =>
              (!campaign.start_date ||
                String(campaign.start_date).slice(0, 10) <= today) &&
              (!campaign.end_date ||
                String(campaign.end_date).slice(0, 10) >= today),
          );
          const nextCampaign = res.promotions
            .filter(
              (campaign) =>
                campaign.start_date &&
                String(campaign.start_date).slice(0, 10) > today,
            )
            .sort((left, right) => {
              const preferredId = String(res.promotion?.id || "");
              const leftPreferred = String(left.id) === preferredId;
              const rightPreferred = String(right.id) === preferredId;
              if (leftPreferred !== rightPreferred) {
                return leftPreferred ? -1 : 1;
              }
              return String(left.start_date).localeCompare(
                String(right.start_date),
              );
            })[0];
          const displayCampaign = activeCampaign || nextCampaign || null;
          setPromotionData(displayCampaign);
          setActivePromotion(displayCampaign);
        } else {
          setPromotionData(null);
          setActivePromotion(null);
        }
      }
    };

    fetchPromotion();
  }, [attendanceLog, storeCode]);

  useEffect(() => {
    const loadGiftInventory = async () => {
      if (!activePromotion?.track_gift_inventory || !storeCode || !user?.id) {
        setGiftInventory({});
        return;
      }
      try {
        const result = await getPromotionGiftInventoryAction(
          activePromotion.id,
          storeCode,
          user.id,
        );
        if (result.success) setGiftInventory(result.totals);
      } catch (error) {
        console.error("Unable to load promotion gift inventory:", error);
      }
    };
    loadGiftInventory();
  }, [activePromotion, storeCode, user?.id]);

  const handleReceiveGiftStock = async (giftKey: string) => {
    if (!activePromotion || !attendanceLog || !user?.id) return;
    const quantity = Number(giftReceiptQuantities[giftKey] || 0);
    const result = await receivePromotionGiftStockAction({
      promotionId: activePromotion.id,
      giftKey,
      storeCode: attendanceLog.store_code,
      receivedDate: giftReceiptDate,
      quantity,
      userId: user.id,
    });
    if (!result.success) {
      Swal.fire(
        "บันทึกรับของแถมไม่สำเร็จ",
        result.message || "กรุณาลองอีกครั้ง",
        "error",
      );
      return;
    }
    setGiftReceiptQuantities((current) => ({ ...current, [giftKey]: "" }));
    const inventory = await getPromotionGiftInventoryAction(
      activePromotion.id,
      attendanceLog.store_code,
      user.id,
    );
    if (inventory.success) setGiftInventory(inventory.totals);
  };

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

  const handleCompetitorPhotoChange = async (
    barcode: string,
    field: ProductPhotoField,
    file: File | null,
  ) => {
    if (!file) return;
    const base64 = await processFileToBase64(file);
    setCompetitorPhotos((current) => ({
      ...current,
      [barcode]: { ...current[barcode], [field]: base64 },
    }));
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
      const promotionItem = activePromotion?.items?.find(
        (item) =>
          String(item.barcode || item.products?.barcode || "").trim() ===
          res.product?.barcode,
      );
      if (activePromotion && !promotionItem) {
        Swal.fire(
          "สินค้าไม่อยู่ในรอบนี้",
          "ตรวจสอบรายการสินค้าที่ Admin กำหนดในแคมเปญก่อนเพิ่มรายการ",
          "warning",
        );
        return;
      }

      const addedProduct: ProductFormState = {
        barcode: res.product.barcode,
        sku_code: res.product.sku_code || "",
        item_scope:
          String(res.product.company_type || "")
            .trim()
            .toLowerCase() === "competitor"
            ? "COMPETITOR"
            : promotionItem?.item_scope || "OUR",
        target_qty: Number(promotionItem?.target_qty || 0),
        credit_factor: Number(promotionItem?.credit_factor ?? 1),
        descriptions: res.product.descriptions,
        imageurl: res.product.imageurl || res.product.img_front || "",
        segment: res.product.segment || "",
        price_our:
          promotionItem?.item_scope === "COMPETITOR"
            ? "0"
            : String(promotionItem?.price || "0"),
        competitor_price:
          promotionItem?.item_scope === "COMPETITOR"
            ? String(promotionItem?.price || "0")
            : "0",
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
    field: "price_our" | "competitor_price" | "stock_before" | "sales_qty",
    value: string,
  ) => {
    setProductsForm((prev) =>
      prev.map((item) =>
        item.barcode === barcode ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleCompetitorPriceChange = (key: string, value: string) => {
    setCompetitorPrices((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompetitorSalesChange = (key: string, value: string) => {
    setCompetitorSales((prev) => ({ ...prev, [key]: value }));
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
          const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date());
          const isPromotionActiveToday = Boolean(
            activePromotion &&
            (!activePromotion.start_date ||
              String(activePromotion.start_date).slice(0, 10) <= today) &&
            (!activePromotion.end_date ||
              String(activePromotion.end_date).slice(0, 10) >= today),
          );
          const nourishGreen = productsForm.find(
            (p) => p.barcode === "8858678423339",
          );
          const babyBlue = productsForm.find(
            (p) => p.barcode === "8858678423681",
          );
          const pureSoftOrange = productsForm.find(
            (p) => p.barcode === "8858678422875",
          );
          const reportProductsByBarcode = new Map(
            productsForm.map((product) => [
              product.barcode,
              {
                barcode: product.barcode,
                descriptions: product.descriptions,
                item_scope: product.item_scope,
                credit_factor: product.credit_factor,
                promotion_target_qty: product.target_qty,
                competitor_price: Number(product.competitor_price) || 0,
                price_our: Number(product.price_our) || 0,
                stock_before: Number(product.stock_before) || 0,
                sales_qty: Number(product.sales_qty) || 0,
                stock_after: Math.max(
                  0,
                  (Number(product.stock_before) || 0) -
                    (Number(product.sales_qty) || 0),
                ),
                img_product_base64: product.img_product_base64,
                img_shelf_base64: product.img_shelf_base64,
                img_stock_scanner_base64: product.img_stock_scanner_base64,
              },
            ]),
          );

          for (const item of competitorPromotionItems) {
            const barcode = String(
              item.products?.barcode || item.barcode || item.product_code,
            ).trim();
            if (!barcode) continue;

            const existing = reportProductsByBarcode.get(barcode);
            const enteredPrice = competitorPrices[barcode];
            const competitorPrice =
              enteredPrice !== undefined && enteredPrice !== ""
                ? Number(enteredPrice) || 0
                : Number(existing?.competitor_price || item.price || 0);
            const competitorSalesQty = Number(competitorSales[barcode] || 0);

            reportProductsByBarcode.set(barcode, {
              barcode,
              descriptions:
                item.products?.descriptions ||
                item.product_name ||
                item.label ||
                existing?.descriptions ||
                barcode,
              item_scope: "COMPETITOR",
              credit_factor: Number(item.credit_factor ?? 1),
              promotion_target_qty: Number(item.target_qty || 0),
              competitor_price: competitorPrice,
              price_our: 0,
              stock_before: 0,
              sales_qty: competitorSalesQty,
              stock_after: 0,
              img_product_base64:
                competitorPhotos[barcode]?.img_product_base64 ||
                existing?.img_product_base64 ||
                "",
              img_shelf_base64:
                competitorPhotos[barcode]?.img_shelf_base64 ||
                existing?.img_shelf_base64 ||
                "",
              img_stock_scanner_base64:
                competitorPhotos[barcode]?.img_stock_scanner_base64 ||
                existing?.img_stock_scanner_base64 ||
                "",
            });
          }

          const reportUserId = user?.id || 102;
          const uploadPhoto = async (base64: string, prefix: string) => {
            if (!base64.startsWith("data:image/")) return base64;
            const uploadResult = await uploadDailyReportPhotoAction({
              userId: reportUserId,
              base64,
              prefix,
            });
            if (!uploadResult.success || !uploadResult.url) {
              throw new Error(uploadResult.message || "อัปโหลดรูปภาพไม่สำเร็จ");
            }
            return uploadResult.url;
          };
          const uploadedActivityPhotos = await Promise.all(
            activityPhotos
              .filter((photo) => photo.base64)
              .map(async (photo) => ({
                ...photo,
                base64: await uploadPhoto(photo.base64, `act_${photo.type}`),
              })),
          );
          const uploadedProducts = await Promise.all(
            Array.from(reportProductsByBarcode.values()).map(
              async (product) => ({
                ...product,
                img_product_base64: await uploadPhoto(
                  product.img_product_base64,
                  `prod_${product.barcode}_item`,
                ),
                img_shelf_base64: await uploadPhoto(
                  product.img_shelf_base64,
                  `prod_${product.barcode}_shelf`,
                ),
                img_stock_scanner_base64: await uploadPhoto(
                  product.img_stock_scanner_base64,
                  `prod_${product.barcode}_scan`,
                ),
              }),
            ),
          );

          const res = await submitFullDailyActivityReportAction({
            attendanceLogId: attendanceLog.id,
            userId: reportUserId,
            storeCode: attendanceLog.store_code,
            promotionId: isPromotionActiveToday
              ? activePromotion?.id
              : undefined,
            promotionCommissionRules: isPromotionActiveToday
              ? activePromotion?.commission_rules || null
              : null,
            promotionGiftGiven:
              activePromotion?.gift_items?.length && isPromotionActiveToday
                ? Object.fromEntries(
                    (activePromotion.gift_items || []).map((gift) => [
                      gift.key,
                      Math.max(0, Number(giftGivenQuantities[gift.key] || 0)),
                    ]),
                  )
                : {},
            trafficCount: Number(traffic) || 0,
            approachCount: Number(approach) || 0,
            closedSalesCount: Number(closedSales) || 0,
            priceCompCellox:
              Number(competitorPrices["cellox_satin_4"] || 0) || 0,
            priceCompKleenex:
              Number(competitorPrices["kleenex_silky_4"] || 0) || 0,
            priceCompPaseo:
              Number(competitorPrices["scott_safesoft_4"] || 0) || 0,
            competitorPrices,
            feedbackStore: feedback,
            competitorPromotion: compPromo,
            remark: remark,
            activityPhotos: uploadedActivityPhotos,
            products: uploadedProducts,
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

            giftOrangeBefore:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? Number(giftOrangeBefore) || 0
                : 0,
            giftOrangeGiven:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? autoOrangeGiftGiven
                : 0,
            giftOrangeAfter:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? giftOrangeAfter
                : 0,
            giftNourishBefore:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? Number(giftNourishBefore) || 0
                : 0,
            giftNourishGiven:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? Number(giftNourishGiven) || 0
                : 0,
            giftNourishAfter:
              activePromotion?.track_gift_inventory && isPromotionActiveToday
                ? giftNourishAfter
                : 0,
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
    <div className="staff-theme min-h-screen bg-green-200 text-slate-950 font-sans antialiased pb-12 select-none">
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="p-1 hover:bg-blue-800 rounded-lg transition cursor-pointer"
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
          <ThemeToggle className="ml-auto bg-blue-800/40 text-blue-100 hover:bg-blue-700/60" />
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
              className="p-2 bg-slate-800 rounded-full text-slate-200 hover:text-white cursor-pointer"
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

        {/* 🏪 การ์ดแสดงเงื่อนไขโปรโมชันประจำสาขา */}
        {activePromotion && (
          <details
            className={`group p-4 rounded-xl border text-left text-xs ${
              activePromotion.target_type === "COMPANY_TAG"
                ? "bg-amber-50 border-amber-200"
                : "bg-orange-50 border-orange-200"
            }`}
          >
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-black text-slate-800 [&::-webkit-details-marker]:hidden">
              <Tag
                size={14}
                className={
                  activePromotion.target_type === "COMPANY_TAG"
                    ? "text-amber-600"
                    : "text-orange-600"
                }
              />
              <span className="min-w-0 flex-1 truncate">
                คู่มือโปรโมชันหน้าร้าน ({activePromotion.campaign_title})
              </span>
              <span className="shrink-0 text-[9px] font-bold text-slate-500">
                {activePromotion.items?.length || 0} รายการ
              </span>
              <ChevronDown
                size={14}
                className="shrink-0 text-slate-500 transition-transform group-open:rotate-180"
              />
            </summary>

            <div className="mt-3 border-t border-black/5 pt-3">
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
                      {item.products?.descriptions ||
                        item.product_name ||
                        item.label ||
                        "สินค้า"}
                      {item.item_scope === "COMPETITOR"
                        ? " · คู่แข่ง"
                        : " · สินค้าเรา"}
                      {item.price ? ` · ราคา ${item.price} บ.` : ""}
                      {item.condition ? ` · ${item.condition}` : ""}
                      {item.item_scope !== "COMPETITOR" && (
                        <span className="ml-1 text-cyan-800">
                          · Target{" "}
                          {Number(item.target_qty || 0).toLocaleString()}·
                          ตัวคูณ{" "}
                          {Number(item.credit_factor ?? 1).toLocaleString()}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              {activePromotion.special_tier_text && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-white/80 p-2">
                  <p className="mb-0.5 text-[10px] font-black text-rose-700">
                    🔥 รายการพิเศษขั้นบันได:
                  </p>
                  <p className="text-[10px] font-bold leading-normal text-slate-700">
                    {activePromotion.special_tier_text}
                  </p>
                </div>
              )}
            </div>
          </details>
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

            {/* คีย์ลัดผลิตภัณฑ์ RVI ครบถ้วน */}
            <div className="text-left pt-0.5">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                คีย์ลัดเลือกสินค้าเพิ่มรวดเร็ว :
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRODUCTS.map((prod) => (
                  <button
                    key={prod.barcode}
                    type="button"
                    onClick={() => handleSearchAndAddProduct(prod.barcode)}
                    className={`border rounded-full px-2.5 py-1 text-[9px] font-black flex items-center gap-1 transition active:scale-95 cursor-pointer ${prod.className}`}
                  >
                    <Plus size={8} /> {prod.label}
                  </button>
                ))}
              </div>
            </div>

            {/* รายการสินค้าที่ถูกเพิ่มเข้าฟอร์ม */}
            {productsForm.map((product) => (
              <div
                key={product.barcode}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
                      {product.imageurl ? (
                        <img
                          src={product.imageurl}
                          alt={product.descriptions}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Package size={16} className="text-slate-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 line-clamp-1">
                        {product.descriptions}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        SKU บริษัท: {product.sku_code || "-"}
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
                    className="text-red-500 p-1 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {product.item_scope === "COMPETITOR" ? (
                    <>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                          ราคาคู่แข่ง (บาท)
                        </label>
                        <input
                          type="number"
                          value={product.competitor_price}
                          onChange={(event) =>
                            handleProductFieldChange(
                              product.barcode,
                              "competitor_price",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2 self-end text-[9px] text-slate-500">
                        รายการนี้ใช้บันทึกราคาคู่แข่ง ไม่รวมยอดขาย/Target ของเรา
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                          ราคาขาย (บ.)
                        </label>
                        <input
                          type="number"
                          value={product.price_our}
                          onChange={(event) =>
                            handleProductFieldChange(
                              product.barcode,
                              "price_our",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                          สต๊อกยกมา
                        </label>
                        <input
                          type="number"
                          value={product.stock_before}
                          onChange={(event) =>
                            handleProductFieldChange(
                              product.barcode,
                              "stock_before",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                          จำนวนขาย (ชิ้น/แพ็ค)
                        </label>
                        <input
                          type="number"
                          value={product.sales_qty}
                          onChange={(event) =>
                            handleProductFieldChange(
                              product.barcode,
                              "sales_qty",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* ส่วนการอัปโหลดรูปภาพ 3 รูปของสินค้า */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      1. รูปสินค้า
                    </label>
                    <div className="border border-dashed border-slate-300 bg-white rounded-lg p-1.5 text-center flex flex-col items-center justify-center h-16">
                      {product.img_product_base64 ? (
                        <img
                          src={product.img_product_base64}
                          alt="preview"
                          className="h-7 w-full object-cover rounded-md"
                        />
                      ) : (
                        <ImageIcon size={14} className="text-slate-400" />
                      )}
                      <div className="mt-1 flex w-full items-center justify-center gap-2">
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <Camera size={11} /> กล้อง
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_product_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <ImageIcon size={11} /> แกลเลอรี
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_product_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      2. รูปเชลฟ์
                    </label>
                    <div className="border border-dashed border-slate-300 bg-white rounded-lg p-1.5 text-center flex flex-col items-center justify-center h-16">
                      {product.img_shelf_base64 ? (
                        <img
                          src={product.img_shelf_base64}
                          alt="preview"
                          className="h-7 w-full object-cover rounded-md"
                        />
                      ) : (
                        <ImageIcon size={14} className="text-slate-400" />
                      )}
                      <div className="mt-1 flex w-full items-center justify-center gap-2">
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <Camera size={11} /> กล้อง
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_shelf_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <ImageIcon size={11} /> แกลเลอรี
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_shelf_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-500 block mb-1 truncate">
                      3. สแกนสต๊อก
                    </label>
                    <div className="border border-dashed border-slate-300 bg-white rounded-lg p-1.5 text-center flex flex-col items-center justify-center h-16">
                      {product.img_stock_scanner_base64 ? (
                        <img
                          src={product.img_stock_scanner_base64}
                          alt="preview"
                          className="h-7 w-full object-cover rounded-md"
                        />
                      ) : (
                        <ImageIcon size={14} className="text-slate-400" />
                      )}
                      <div className="mt-1 flex w-full items-center justify-center gap-2">
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <Camera size={11} /> กล้อง
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_stock_scanner_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex cursor-pointer items-center gap-0.5 text-[8px] font-bold text-slate-600">
                          <ImageIcon size={11} /> แกลเลอรี
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              void handleProductPhotoChange(
                                product.barcode,
                                "img_stock_scanner_base64",
                                e.target.files?.[0] || null,
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section: บันทึกสต๊อกของแถมแคมเปญ */}
          {activePromotion?.track_gift_inventory && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-xs space-y-3 text-left">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                <Package size={14} /> บันทึกสต๊อกของแถมแคมเปญ
              </h4>
              {activePromotion.gift_items?.length ? (
                <>
                  <label className="block text-[10px] font-bold text-slate-600">
                    วันที่รับของแถม
                    <input
                      type="date"
                      value={giftReceiptDate}
                      onChange={(event) =>
                        setGiftReceiptDate(event.target.value)
                      }
                      className="mt-1 w-full rounded border border-amber-200 bg-white p-2 text-xs"
                    />
                  </label>
                  <div className="space-y-2">
                    {activePromotion.gift_items.map((gift) => {
                      const stock = giftInventory[gift.key] || {
                        received: 0,
                        given: 0,
                        remaining: 0,
                      };
                      const isLowStock = stock.remaining < 10;
                      return (
                        <div
                          key={gift.key}
                          className="space-y-2 rounded-lg border border-amber-200 bg-white p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="break-words text-[11px] font-black text-slate-800">
                                {gift.name}
                              </p>
                              <p className="mt-0.5 text-[9px] font-medium text-slate-500">
                                {gift.source_type === "STORE_PICKUP"
                                  ? "ของแถมหยิบหน้าร้าน"
                                  : "ของแถมส่งเข้าจากบริษัท"}
                              </p>
                            </div>
                            <p
                              className={`shrink-0 text-right text-[10px] font-bold ${isLowStock ? "animate-pulse text-red-600" : "text-slate-600"}`}
                            >
                              คงเหลือ {stock.remaining} ชิ้น
                              {isLowStock && (
                                <span className="block">สต๊อกใกล้หมด</span>
                              )}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-500">
                            <span>รับเข้ารวม {stock.received} ชิ้น</span>
                            <span>แจกสะสม {stock.given} ชิ้น</span>
                          </div>
                          <label className="block text-[10px] font-bold text-slate-600">
                            จำนวนที่แจกวันนี้
                            <input
                              type="number"
                              min="0"
                              value={giftGivenQuantities[gift.key] || ""}
                              onChange={(event) =>
                                setGiftGivenQuantities((current) => ({
                                  ...current,
                                  [gift.key]: event.target.value,
                                }))
                              }
                              className="mt-1 w-full rounded border border-slate-300 bg-amber-50/50 p-2 text-xs"
                              placeholder="0"
                            />
                          </label>
                          <div className="grid grid-cols-[1fr_auto] items-end gap-2 border-t border-amber-100 pt-2">
                            <label className="block text-[10px] font-bold text-slate-600">
                              จำนวนรับเข้าเพิ่ม
                              <input
                                type="number"
                                min="1"
                                value={giftReceiptQuantities[gift.key] || ""}
                                onChange={(event) =>
                                  setGiftReceiptQuantities((current) => ({
                                    ...current,
                                    [gift.key]: event.target.value,
                                  }))
                                }
                                className="mt-1 w-full rounded border border-slate-300 bg-white p-2 text-xs"
                                placeholder="จำนวนชิ้น"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleReceiveGiftStock(gift.key)}
                              className="rounded-md bg-amber-700 px-3 py-2 text-[10px] font-bold text-white"
                            >
                              บันทึกรับเข้า
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
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
              )}
            </div>
          )}

          {!activePromotion?.track_gift_inventory &&
          activePromotion?.gift_items?.length ? (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-xs space-y-3 text-left">
              <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5 border-b border-amber-200/60 pb-2">
                <Package size={14} /> บันทึกจำนวนของแถมที่แจก
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {activePromotion.gift_items.map((gift) => (
                  <label
                    key={gift.key}
                    className="block rounded-lg border border-amber-200 bg-white p-2.5 text-[10px] font-bold text-slate-700"
                  >
                    {gift.name}
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="จำนวนที่แจก"
                      value={giftGivenQuantities[gift.key] || ""}
                      onChange={(event) =>
                        setGiftGivenQuantities((current) => ({
                          ...current,
                          [gift.key]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 bg-amber-50/50 p-2 text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {/* Section 3: ราคาคู่แข่ง และข้อมูลการตลาด */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3 text-left">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Tag size={14} className="text-rose-600" /> 3.
              ราคาเปรียบเทียบแบรนด์คู่แข่ง ({competitorPromotionItems.length}{" "}
              รายการ)
            </h4>

            {competitorPromotionItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-[10px] font-medium text-slate-500">
                แคมเปญนี้ยังไม่มีสินค้าคู่แข่งที่ Admin กำหนด
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {competitorPromotionItems.map((item) => {
                  const barcode = String(
                    item.products?.barcode || item.barcode || item.product_code,
                  ).trim();
                  const productName =
                    item.products?.descriptions ||
                    item.product_name ||
                    item.label ||
                    barcode;
                  const productImage =
                    item.products?.imageurl ||
                    item.products?.img_front ||
                    item.products?.img_back ||
                    "";

                  return (
                    <div
                      key={barcode}
                      className="flex min-w-0 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white">
                        {productImage ? (
                          <img
                            src={productImage}
                            alt={productName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[9px] text-slate-400">
                            ไม่มีรูป
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="line-clamp-2 break-words text-[11px] font-black leading-tight text-slate-800"
                          title={productName}
                        >
                          {productName}
                        </p>
                        <p className="mb-1 truncate font-mono text-[8px] text-slate-500">
                          {barcode}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-[9px] font-bold text-slate-600">
                            ราคา (บาท)
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              placeholder="ราคา"
                              value={competitorPrices[barcode] || ""}
                              onChange={(event) =>
                                handleCompetitorPriceChange(
                                  barcode,
                                  event.target.value,
                                )
                              }
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-center text-xs font-bold outline-none focus:border-blue-500"
                            />
                          </label>
                          <label className="block text-[9px] font-bold text-slate-600">
                            ยอดขาย (ชิ้น)
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              placeholder="จำนวน"
                              value={competitorSales[barcode] || ""}
                              onChange={(event) =>
                                handleCompetitorSalesChange(
                                  barcode,
                                  event.target.value,
                                )
                              }
                              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-center text-xs font-bold outline-none focus:border-blue-500"
                            />
                          </label>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          {(
                            [
                              ["img_product_base64", "1. สินค้า"],
                              ["img_shelf_base64", "2. เชลฟ์"],
                              ["img_stock_scanner_base64", "3. สต๊อก"],
                            ] as [ProductPhotoField, string][]
                          ).map(([field, label]) => {
                            const photo = competitorPhotos[barcode]?.[field];
                            return (
                              <label
                                key={field}
                                className="flex h-14 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-white text-[8px] font-bold text-slate-500"
                                title={`${label}: ถ่ายรูปหรือเลือกไฟล์`}
                              >
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={label}
                                    className="h-8 w-full object-cover"
                                  />
                                ) : (
                                  <Camera
                                    size={14}
                                    className="mb-1 text-slate-400"
                                  />
                                )}
                                <span className="truncate px-1">{label}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="sr-only"
                                  onChange={(event) => {
                                    void handleCompetitorPhotoChange(
                                      barcode,
                                      field,
                                      event.target.files?.[0] || null,
                                    );
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
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
