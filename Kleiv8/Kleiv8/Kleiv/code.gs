/**
 * ============================================================================
 * KLEIV ∞ — UNIFIED GOOGLE SHEETS CMS, OFFLINE SYNC & SALES ENGINE (v5.0)
 * Spreadsheet: Kleiv8 db menu (1znajOKcCGYSoAJy8qFNFCEQpU7yKLvI0Sfsqei7xVYw)
 * ============================================================================
 * Pulls and normalizes all data across all spreadsheet tabs:
 *  1. settings         -> Operational config, open/close hours, crowd mood, vouchers
 *  2. categories       -> Master 12-category bilingual taxonomy & default moods/doodles
 *  3. الوصف والمكونات  -> Exact recipe gram/ml ingredients per item ID
 *  4. sales_log        -> Transaction log & live aggregated order counts per item
 *  5. db               -> All 82 menu items (Columns A–R including orders_count & allowed_addons)
 *  6. news_ticker      -> Live top promotional & coupon marquee announcements
 *  7. blog             -> Bilingual specialty coffee & Suez lifestyle articles
 *  8. 0                -> Brand summary & social media links fallback
 *
 * Also provides:
 *  - doPost(e)         -> Logs new orders directly into `sales_log` & updates `orders_count`
 *  - onEdit(e)         -> Automatically clears ScriptCache on any spreadsheet edit
 * ============================================================================
 */

const CACHE_KEY = 'kleiv_cms_payload_v5';
const CACHE_TTL_SECONDS = 900; // 15 minutes cache (auto-cleared on any sheet edit)
const ORDER_LOG_CACHE_TTL_SECONDS = 21600;

function readSettings_(ss) {
  const settings = {};
  const settingsSheet = ss.getSheetByName('settings');
  if (!settingsSheet) return settings;

  const values = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const key = String(values[i][0] || '').trim();
    const value = values[i][1];
    if (key) settings[key] = value !== undefined && value !== null ? String(value).trim() : '';
  }
  return settings;
}

function parseAllowedAddons_(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  const raw = String(value || '').trim();
  if (!raw || raw.toLowerCase() === 'none') return [];
  if (raw.charAt(0) === '[') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).map(item => item.trim()).filter(Boolean);
    } catch (err) {
      console.warn('Unable to parse allowed add-ons for an order.', err);
    }
  }
  return raw.split(/[,;|]/).map(item => item.trim()).filter(Boolean);
}

function roundMoney_(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isDisabled_(value) {
  return value === false || value === 0 ||
    ['false', '0', 'no', 'inactive'].indexOf(String(value == null ? '' : value).trim().toLowerCase()) !== -1;
}

function readOrderCatalog_(ss) {
  const sheet = ss.getSheetByName('db') || ss.getSheetByName('menu');
  if (!sheet) throw new Error('The menu data sheet was not found.');

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('The menu data sheet is empty.');
  const headers = values[0].map(header => String(header).trim());
  const products = {};
  const addons = {};

  values.slice(1).forEach(row => {
    const record = {};
    headers.forEach((header, index) => { record[header] = row[index]; });
    const id = String(record['معرّف الصنف'] || record['id'] || '').trim();
    const nameEn = String(record['Item Name (EN)'] || record['name_en'] || record['name'] || '').trim();
    const categoryEn = String(record['Category (EN)'] || record['category'] || '').trim();
    const price = Number(record['السعر (ج.م)'] || record['price'] || 0);
    const status = String(record['Availability (EN)'] || record['status'] || 'Available').trim().toLowerCase();
    const statusAr = String(record['حالة التوفر (بالعربية)'] || '').trim();
    const hidden = status === 'hidden' || status === 'inactive' || statusAr === 'مخفي';
    const available = !hidden && (
      status === '' ||
      status === 'available' ||
      status === 'true' ||
      status === '1' ||
      statusAr === 'متوفر'
    );
    if (!id || !Number.isFinite(price) || price <= 0 || hidden) return;

    const product = {
      id,
      name: nameEn || String(record['اسم الصنف (بالعربية)'] || '').trim() || id,
      category: categoryEn || 'Menu',
      price: roundMoney_(price),
      available,
      allowedAddons: parseAllowedAddons_(record['allowed_addons'] || record['allowed_addons_list'])
    };
    products[id] = product;
    if (categoryEn.toLowerCase() === 'extra' && available) addons[id] = product;
  });
  return { products, addons };
}

function parseConfiguredCoupons_(value) {
  if (typeof value === 'string' && value.trim()) {
    try {
      return parseConfiguredCoupons_(JSON.parse(value));
    } catch (err) {
      console.warn('Unable to parse configured coupons.', err);
      return [];
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.keys(value).map(code => {
      const details = value[code];
      return Object.assign(
        { code: code },
        details && typeof details === 'object' ? details : { discount_percent: details }
      );
    });
  }
  return [];
}

function calculateOrderDiscount_(code, subtotal, settings) {
  if (!code) return { ok: true, amount: 0 };
  const normalizedCode = String(code).trim().toUpperCase();
  const configuredCoupons = parseConfiguredCoupons_(settings.coupons || settings.vouchers || []);
  let coupon = configuredCoupons.find(item =>
    item && String(item.code || item.coupon_code || '').trim().toUpperCase() === normalizedCode
  );
  if (!coupon) {
    const activeCode = String(
      settings.active_voucher_code ||
      settings.active_coupon_code ||
      settings.coupon_code ||
      ''
    ).trim().toUpperCase();
    if (activeCode !== normalizedCode) return { ok: false, error: 'The coupon is not active.' };
    const fallbackPercent = { 'KLEIV-SCOOT15': 15, 'SUEZ10': 10 };
    coupon = {
      code: activeCode,
      active: settings.active_voucher_enabled,
      discount_percent: settings.active_voucher_discount_percent ||
        settings.voucher_discount_percent ||
        settings.active_voucher_percent ||
        settings.discount_percent ||
        fallbackPercent[activeCode] ||
        0,
      discount_amount: settings.active_voucher_discount_amount || settings.discount_amount || 0,
      minimum_order: settings.active_voucher_minimum_order || 0
    };
  }

  if (isDisabled_(coupon.active) || isDisabled_(coupon.enabled)) {
    return { ok: false, error: 'The coupon is not active.' };
  }
  const startsAt = Date.parse(coupon.starts_at || coupon.valid_from || '');
  const endsAt = Date.parse(coupon.ends_at || coupon.valid_until || '');
  const now = Date.now();
  if ((Number.isFinite(startsAt) && now < startsAt) || (Number.isFinite(endsAt) && now > endsAt)) {
    return { ok: false, error: 'The coupon has expired.' };
  }

  const minimumOrder = Math.max(0, Number(coupon.minimum_order || coupon.min_order || 0) || 0);
  if (subtotal < minimumOrder) return { ok: false, error: 'The minimum order was not met.' };
  const percent = Math.max(0, Math.min(100, Number(
    coupon.discount_percent ||
    coupon.voucher_discount_percent ||
    coupon.discountPercentage ||
    coupon.percent ||
    0
  ) || 0));
  const fixedAmount = Math.max(0, Number(coupon.discount_amount || coupon.amount || 0) || 0);
  if (!percent && !fixedAmount) return { ok: false, error: 'The coupon has no valid discount.' };
  return {
    ok: true,
    amount: Math.min(subtotal, roundMoney_(fixedAmount || subtotal * percent / 100))
  };
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const cache = CacheService.getScriptCache();
    const forceRefresh = e && e.parameter && (e.parameter.refresh === '1' || e.parameter.nocache === '1');

    if (!forceRefresh) {
      const cachedPayload = cache.get(CACHE_KEY);
      if (cachedPayload) {
        return ContentService.createTextOutput(cachedPayload)
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ------------------------------------------------------------------------
    // 1. قراءة تبويب الإعدادات العامة (settings) + حساب حالة الفتح والإغلاق بتوقيت مصر
    // ------------------------------------------------------------------------
    const settings = readSettings_(ss);

    // قراءة الروابط الاحتياطية من تبويب (0) إن وجدت
    const infoSheet = ss.getSheetByName('0');
    const brandInfo = {};
    if (infoSheet) {
      const infoValues = infoSheet.getDataRange().getValues();
      for (let i = 0; i < infoValues.length; i++) {
        const k = String(infoValues[i][0] || '').trim();
        const v = String(infoValues[i][1] || '').trim();
        if (k) brandInfo[k] = v;
      }
    }

    // حساب حالة الفتح/الإغلاق الحية ومؤشر الازدحام
    const cairoHour = Number(Utilities.formatDate(new Date(), 'Africa/Cairo', 'H'));
    const openHour = Number(settings.open_hour_24 || 8);   // 8:00 AM
    const closeHour = Number(settings.close_hour_24 || 1); // 1:00 AM (after midnight)
    const statusMode = String(settings.store_status_mode || 'AUTO').toUpperCase();

    let isOpenNow = true;
    if (statusMode === 'FORCE_OPEN' || statusMode === 'OPEN') {
      isOpenNow = true;
    } else if (statusMode === 'FORCE_CLOSED' || statusMode === 'CLOSED') {
      isOpenNow = false;
    } else {
      // يفتح من 8 صباحاً حتى 1 بعد منتصف الليل
      isOpenNow = closeHour < openHour
        ? (cairoHour >= openHour || cairoHour < closeHour)
        : (cairoHour >= openHour && cairoHour < closeHour);
    }

    settings.is_open_now = isOpenNow;
    settings.cairo_hour_24 = cairoHour;
    settings.crowd_status = settings.cafe_crowd_status || 'MODERATE';
    settings.occupancy_percent = Number(settings.cafe_occupancy_percent || 65);
    settings.mood_banner_ar = settings.cafe_mood_ar || 'أجواء رايقة ومثالية للقهوة والتركيز';
    settings.mood_banner_en = settings.cafe_mood_en || 'Cozy & Focused Vibe';

    // ------------------------------------------------------------------------
    // 2. قراءة تبويب التصنيفات المرجعية (categories)
    // ------------------------------------------------------------------------
    const categories = [];
    const categoryDefaultsMap = {};
    const catSheet = ss.getSheetByName('categories');
    if (catSheet) {
      const cValues = catSheet.getDataRange().getValues();
      for (let i = 1; i < cValues.length; i++) {
        const catEn = String(cValues[i][0] || '').trim();
        const catAr = String(cValues[i][1] || '').trim();
        const defMood = String(cValues[i][2] || 'chill').trim().toLowerCase();
        const defDoodle = String(cValues[i][3] || 'cup').trim();
        if (catEn) {
          const entry = {
            category_en: catEn,
            category_ar: catAr,
            default_mood: defMood,
            default_doodle_key: defDoodle
          };
          categories.push(entry);
          categoryDefaultsMap[catEn.toLowerCase()] = entry;
        }
      }
    }

    // ------------------------------------------------------------------------
    // 3. قراءة المقادير والمكونات الدقيقة من تبويب (الوصف والمكونات)
    // ------------------------------------------------------------------------
    const ingredientsMap = {};
    const ingSheet = ss.getSheetByName('الوصف والمكونات');
    if (ingSheet) {
      const ingValues = ingSheet.getDataRange().getValues();
      if (ingValues.length > 1) {
        const ingHeaders = ingValues[0].map(h => String(h).trim());
        for (let i = 1; i < ingValues.length; i++) {
          const rowObj = {};
          ingHeaders.forEach((h, idx) => { rowObj[h] = ingValues[i][idx]; });
          const itemId = String(rowObj['معرّف الصنف'] || rowObj['id'] || '').trim();
          if (itemId) {
            ingredientsMap[itemId] = {
              ingredients_ar: String(rowObj['الوصف والمكونات (بالعربية)'] || '').trim(),
              ingredients_en: String(rowObj['Description & Ingredients (EN)'] || '').trim(),
              serving_ar: String(rowObj['ملاحظات التقديم (بالعربية)'] || '').trim(),
              serving_en: String(rowObj['Serving Notes (EN)'] || '').trim()
            };
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 4. قراءة سجل المبيعات (sales_log) وتجميع الطلبات الإضافية لكل صنف
    // ------------------------------------------------------------------------
    const salesLog = [];
    const loggedSalesByItem = {};
    const salesSheet = ss.getSheetByName('sales_log');
    if (salesSheet) {
      const slValues = salesSheet.getDataRange().getValues();
      if (slValues.length > 1) {
        const slHeaders = slValues[0].map(h => String(h).trim());
        for (let i = 1; i < slValues.length; i++) {
          const sObj = {};
          slHeaders.forEach((h, idx) => { sObj[h] = slValues[i][idx]; });
          const orderId = String(sObj['order_id'] || '').trim();
          const itemId = String(sObj['item_id'] || '').trim();
          const qty = Number(sObj['quantity'] || 0);
          if (itemId && qty > 0) {
            loggedSalesByItem[itemId] = (loggedSalesByItem[itemId] || 0) + qty;
          }
          if (orderId) {
            salesLog.push({
              order_id: orderId,
              timestamp: String(sObj['timestamp'] || '').trim(),
              item_id: itemId,
              item_name: String(sObj['item_name'] || sObj['item_name_ar'] || '').trim(),
              category: String(sObj['category'] || '').trim(),
              quantity: qty,
              unit_price: Number(sObj['unit_price'] || 0),
              total_amount: Number(sObj['total_amount'] || sObj['line_total_egp'] || 0)
            });
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 5. قراءة الأصناف الـ 82 من تبويب قاعدة البيانات الأساسية (db)
    // ------------------------------------------------------------------------
    const dbSheet = ss.getSheetByName('db') || ss.getSheets()[2] || ss.getSheets()[0];
    const values = dbSheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Empty DB' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0].map(h => String(h).trim());
    const rows = values.slice(1);
    const data = [];
    const addonsItems = [];

    rows.forEach((row, idx) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });

      const id = String(obj['معرّف الصنف'] || obj['id'] || ('klv-' + (idx + 1))).trim();
      const nameEn = String(obj['Item Name (EN)'] || obj['name_en'] || obj['name'] || '').trim();
      const nameAr = String(obj['اسم الصنف (بالعربية)'] || obj['name_ar'] || '').trim();
      const categoryEn = String(obj['Category (EN)'] || obj['category'] || 'Menu').trim();
      const categoryAr = String(obj['التصنيف (بالعربية)'] || '').trim();

      // الوصف التسويقي القصصي في تبويب db
      const storyEn = String(obj['Description & Ingredients (EN)'] || obj['description'] || '').trim();
      const storyAr = String(obj['الوصف والمكونات (بالعربية)'] || obj['description_ar'] || '').trim();

      // المكونات الدقيقة بالجرام والمللي من تبويب (الوصف والمكونات)
      const recipeInfo = ingredientsMap[id] || {};
      const ingredientsEn = recipeInfo.ingredients_en || storyEn;
      const ingredientsAr = recipeInfo.ingredients_ar || storyAr;

      const servingEn = String(obj['Serving Notes (EN)'] || recipeInfo.serving_en || '').trim();
      const servingAr = String(obj['ملاحظات التقديم (بالعربية)'] || recipeInfo.serving_ar || '').trim();

      const price = Number(obj['السعر (ج.م)'] || obj['price'] || 0);

      const availEn = String(obj['Availability (EN)'] || obj['status'] || 'Available').trim();
      const availAr = String(obj['حالة التوفر (بالعربية)'] || 'متوفر').trim();
      const availLower = availEn.toLowerCase();

      if (availLower === 'hidden' || availAr === 'مخفي') {
        return; // تخطي الأصناف المخفية
      }

      const isAvail = ['available', 'true', '1', 'yes', ''].indexOf(availLower) !== -1 ||
        availAr === 'متوفر';
      const status = isAvail ? 'Available' : 'Sold Out';

      const catDefaults = categoryDefaultsMap[categoryEn.toLowerCase()] || {};
      const mood = String(obj['mood'] || catDefaults.default_mood || 'chill').trim().toLowerCase();
      const badge = String(obj['badge_en'] || obj['badge'] || '').trim();
      const isBestSeller = String(obj['is_best_seller'] || obj['best_seller'] || '').trim().toLowerCase() === 'true' ||
        badge.toLowerCase() === 'best seller' ||
        /\bbest seller\b/i.test(servingEn);
      const doodleKey = String(obj['doodle_key'] || catDefaults.default_doodle_key || 'cup').trim();
      const caffeine = String(obj['caffeine_level'] || 'None').trim();

      // عدد الطلبات = الرصيد الأساسي في عمود orders_count + ما سُجّل في sales_log
      const baseOrdersCount = Number(obj['orders_count'] || obj['عدد الطلبات'] || 0);
      const totalOrdersCount = baseOrdersCount + (loggedSalesByItem[id] || 0);

      // الإضافات المسموحة للمنتج (مثال: extra_shot,flavor_syrup,extra_sauce,soft_icecream)
      const allowedAddonsRaw = String(obj['allowed_addons'] || obj['allowed_addons_list'] || 'none').trim();
      const allowedAddonsList = parseAllowedAddons_(obj['allowed_addons'] || obj['allowed_addons_list']);

      // درجات المود الرقمية لتغذية سلايدر المزاج في الواجهة
      const moodScores = {
        chill: mood === 'chill' ? 90 : 40,
        focus: mood === 'focus' ? 92 : 35,
        refresh: mood === 'refresh' ? 95 : 30
      };

      const isHotCoffee = categoryEn.toLowerCase().indexOf('hot coffee') !== -1;

      if (id && (nameEn || nameAr) && price > 0) {
        const itemRecord = {
          id: id,
          category: categoryEn,
          category_en: categoryEn,
          category_ar: categoryAr,
          name_en: nameEn,
          name_ar: nameAr,
          description: storyEn,
          description_ar: storyAr,
          story_en: storyEn,
          story_ar: storyAr,
          ingredients_en: ingredientsEn,
          ingredients_ar: ingredientsAr,
          serving_notes_en: servingEn,
          serving_notes_ar: servingAr,
          price: price,
          status: status,
          status_ar: isAvail ? 'متوفر' : 'غير متوفر',
          mood: mood,
          mood_scores: moodScores,
          badge: badge || (isBestSeller ? 'BEST SELLER' : ''),
          badge_en: badge || (isBestSeller ? 'Best Seller' : ''),
          badge_ar: String(obj['badge_ar'] || (isBestSeller ? 'الأكثر طلباً' : '')).trim(),
          doodle_key: doodleKey,
          caffeine_level: caffeine,
          latte_art: isHotCoffee,
          orders_count: totalOrdersCount,
          is_best_seller: isBestSeller,
          allowed_addons: allowedAddonsRaw,
          allowed_addons_list: allowedAddonsList
        };

        data.push(itemRecord);

        if (categoryEn.toLowerCase() === 'extra') {
          addonsItems.push(itemRecord);
        }
      }
    });

    // ترتيب الأصناف تنازلياً حسب عدد الطلبات (الأكثر مبيعاً في الصدارة)
    data.sort((a, b) => b.orders_count - a.orders_count);

    // لا يُصنّف الصنف كالأكثر طلباً إلا بوجود طلبات مسجلة أو علامة صريحة في المصدر.
    let salesRank = 0;
    data.forEach(item => {
      if (item.orders_count > 0) {
        salesRank += 1;
        item.sales_rank = salesRank;
        item.is_best_seller = item.is_best_seller || salesRank <= 10;
      } else {
        item.sales_rank = 0;
      }
    });

    // ------------------------------------------------------------------------
    // 6. قراءة شريط الأخبار والعروض والكوبونات الحي (news_ticker)
    // ------------------------------------------------------------------------
    const newsTicker = [];
    const tickerSheet = ss.getSheetByName('news_ticker');
    if (tickerSheet) {
      const tValues = tickerSheet.getDataRange().getValues();
      if (tValues.length > 1) {
        const tHeaders = tValues[0].map(h => String(h).trim());
        for (let i = 1; i < tValues.length; i++) {
          const tObj = {};
          tHeaders.forEach((h, idx) => { tObj[h] = tValues[i][idx]; });

          const tId = String(tObj['ticker_id'] || tObj['id'] || '').trim();
          const tStatus = String(tObj['status'] || tObj['active'] || 'Active').trim().toLowerCase();
          if (tId && tStatus !== 'inactive' && tStatus !== 'false') {
            newsTicker.push({
              id: tId,
              headline_ar: String(tObj['headline_ar'] || tObj['text_ar'] || '').trim(),
              headline_en: String(tObj['headline_en'] || tObj['text_en'] || '').trim(),
              badge: String(tObj['badge'] || tObj['badge_en'] || 'OFFER').trim(),
              cta_text: String(tObj['cta_text'] || '').trim(),
              cta_link: String(tObj['cta_link'] || '').trim(),
              priority: Number(tObj['priority'] || i)
            });
          }
        }
        newsTicker.sort((a, b) => a.priority - b.priority);
      }
    }

    // ------------------------------------------------------------------------
    // 7. قراءة مقالات مدونة كليف ثنائية اللغة (blog)
    // ------------------------------------------------------------------------
    const blogPosts = [];
    const blogSheet = ss.getSheetByName('blog');
    if (blogSheet) {
      const bValues = blogSheet.getDataRange().getValues();
      if (bValues.length > 1) {
        const bHeaders = bValues[0].map(h => String(h).trim());
        for (let i = 1; i < bValues.length; i++) {
          const bObj = {};
          bHeaders.forEach((h, idx) => { bObj[h] = bValues[i][idx]; });

          const artId = String(bObj['article_id'] || bObj['id'] || '').trim();
          const bStatus = String(bObj['status'] || bObj['active'] || 'Published').trim().toLowerCase();
          if (artId && bStatus !== 'draft' && bStatus !== 'false') {
            blogPosts.push({
              id: artId,
              slug: String(bObj['slug'] || '').trim(),
              title_ar: String(bObj['title_ar'] || '').trim(),
              title_en: String(bObj['title_en'] || '').trim(),
              category: String(bObj['category'] || bObj['category_en'] || 'Coffee Culture').trim(),
              summary_ar: String(bObj['summary_ar'] || bObj['excerpt_ar'] || '').trim(),
              summary_en: String(bObj['summary_en'] || bObj['excerpt_en'] || '').trim(),
              content_ar: String(bObj['content_ar'] || '').trim(),
              content_en: String(bObj['content_en'] || '').trim(),
              author: String(bObj['author'] || 'KLEIV Team').trim(),
              published_date: String(bObj['published_date'] || '').trim(),
              read_time_mins: Number(bObj['read_time_mins'] || bObj['read_time_min'] || 4),
              tags: String(bObj['tags'] || '').split(',').map(t => t.trim()).filter(Boolean)
            });
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 8. تجميع وإرسال الحزمة الكاملة للواجهة (Offline-First Ready Payload)
    // ------------------------------------------------------------------------
    const payload = JSON.stringify({
      success: true,
      version: '5.0-CMS',
      updated_at: new Date().toISOString(),
      count: data.length,
      brand_info: brandInfo,
      settings: settings,
      categories: categories,
      news_ticker: newsTicker,
      blog: blogPosts,
      addons_catalog: addonsItems,
      sales_log_count: salesLog.length,
      data: data
    });

    cache.put(CACHE_KEY, payload, CACHE_TTL_SECONDS);

    return ContentService.createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * استقبال الطلبات الجديدة من الواجهة وتسجيلها في تبويب sales_log وتحديث عداد المبيعات
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try {
    const rawBody = e && e.postData && e.postData.contents;
    if (!rawBody || rawBody.length > 20000) throw new Error('The order payload is missing or too large.');
    const body = JSON.parse(rawBody);
    if (!body || body.action !== 'submit_order') throw new Error('Unsupported request.');

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = readSettings_(ss);
    if (['true', '1', 'yes'].indexOf(String(settings.order_logging_enabled || '').trim().toLowerCase()) === -1) {
      throw new Error('Order logging is disabled.');
    }
    if (String(body.currency || '').toUpperCase() !== 'EGP') throw new Error('Orders must use EGP.');

    const orderId = String(body.order_id || ('ORD-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8))).trim();
    if (!/^[A-Za-z0-9._:-]{8,100}$/.test(orderId)) throw new Error('The order ID is invalid.');
    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
      throw new Error('The order must contain between 1 and 30 items.');
    }

    lock.waitLock(10000);
    locked = true;
    const cache = CacheService.getScriptCache();
    const orderCacheKey = 'kleiv_order_' + orderId;
    if (cache.get(orderCacheKey)) {
      return jsonResponse_({ success: true, order_id: orderId, duplicate: true });
    }

    const catalog = readOrderCatalog_(ss);
    const timestamp = Utilities.formatDate(new Date(), 'Africa/Cairo', 'yyyy-MM-dd HH:mm:ss');
    const rows = [];
    let subtotal = 0;
    body.items.forEach(item => {
      if (!item || typeof item !== 'object') throw new Error('An order item is invalid.');
      const id = String(item.id || '').trim();
      const product = catalog.products[id];
      const quantity = Number(item.quantity);
      if (!product || !product.available) throw new Error('An order item is unavailable.');
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        throw new Error('An item quantity is invalid.');
      }

      const basePrice = roundMoney_(product.price);
      if (!Number.isFinite(Number(item.base_price)) || Math.abs(roundMoney_(item.base_price) - basePrice) > 0.01) {
        throw new Error('An item base price has changed.');
      }
      const selectedAddons = Array.isArray(item.add_ons) ? item.add_ons : [];
      if (selectedAddons.length > 12) throw new Error('An item has too many add-ons.');
      const allowedAddons = new Set(product.allowedAddons);
      const seenAddons = new Set();
      let addonTotal = 0;
      selectedAddons.forEach(selection => {
        const addonId = String(
          selection && typeof selection === 'object' ? selection.id || selection.addon_id || '' : selection || ''
        ).trim();
        const addon = catalog.addons[addonId];
        if (!addon || !allowedAddons.has(addonId) || seenAddons.has(addonId)) {
          throw new Error('An item contains an unavailable add-on.');
        }
        seenAddons.add(addonId);
        addonTotal += addon.price;
      });

      const unitPrice = roundMoney_(basePrice + addonTotal);
      const reportedUnitPrice = Number(item.unit_price);
      if (!Number.isFinite(reportedUnitPrice) || Math.abs(roundMoney_(reportedUnitPrice) - unitPrice) > 0.01) {
        throw new Error('An item total has changed.');
      }
      const itemNote = String(item.note || '');
      if (itemNote.length > 180) throw new Error('An item note is too long.');
      const lineTotal = roundMoney_(unitPrice * quantity);
      if (!Number.isSafeInteger(lineTotal * 100)) throw new Error('An item total is too large.');
      subtotal = roundMoney_(subtotal + lineTotal);
      if (!Number.isSafeInteger(subtotal * 100)) throw new Error('The order total is too large.');
      rows.push([
        orderId,
        timestamp,
        id,
        product.name,
        product.category,
        quantity,
        unitPrice,
        lineTotal
      ]);
    });

    const couponCode = String(body.coupon_code || '').trim().toUpperCase();
    const coupon = calculateOrderDiscount_(couponCode, subtotal, settings);
    if (!coupon.ok) throw new Error(coupon.error);
    const discount = roundMoney_(coupon.amount);
    const total = roundMoney_(Math.max(0, subtotal - discount));
    if (
      !Number.isFinite(Number(body.subtotal)) ||
      !Number.isFinite(Number(body.discount)) ||
      !Number.isFinite(Number(body.total)) ||
      Math.abs(roundMoney_(body.subtotal) - subtotal) > 0.01 ||
      Math.abs(roundMoney_(body.discount) - discount) > 0.01 ||
      Math.abs(roundMoney_(body.total) - total) > 0.01
    ) {
      throw new Error('The order totals could not be verified.');
    }

    let salesSheet = ss.getSheetByName('sales_log');
    if (!salesSheet) salesSheet = ss.insertSheet('sales_log');
    const headers = ['order_id', 'timestamp', 'item_id', 'item_name', 'category', 'quantity', 'unit_price', 'total_amount'];
    if (salesSheet.getLastRow() === 0) {
      salesSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      const currentHeaders = salesSheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0]
        .map(header => String(header).trim().toLowerCase());
      if (headers.some((header, index) => currentHeaders[index] !== header)) {
        throw new Error('The sales_log sheet has incompatible column headers.');
      }
    }

    const firstRow = salesSheet.getLastRow() + 1;
    salesSheet.getRange(firstRow, 1, rows.length, headers.length).setValues(rows);
    cache.put(orderCacheKey, '1', ORDER_LOG_CACHE_TTL_SECONDS);
    cache.remove(CACHE_KEY);

    return jsonResponse_({
      success: true,
      order_id: orderId,
      logged_items: rows.length,
      subtotal: subtotal,
      discount: discount,
      total: total,
      timestamp: timestamp
    });

  } catch (err) {
    console.error('Unable to record the cafe order.', err);
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : 'Unable to record the order.'
    });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/**
 * تفريغ الكاش تلقائياً عند أي تعديل يدوي في الشيت (سعر، حالة توفر، خبر، أو مقال)
 */
function onEdit(e) {
  CacheService.getScriptCache().remove(CACHE_KEY);
}