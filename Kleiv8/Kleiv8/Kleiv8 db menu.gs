function doGet() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('kleiv_menu_v2');
  if (cached) {
    return ContentService.createTextOutput(cached)
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // قراءة تبويب قاعدة البيانات db أولاً، أو التراجع للتبويب الثاني
    const sheet = ss.getSheetByName('db') || ss.getSheetByName('menu') || ss.getSheets()[1] || ss.getSheets()[0];
    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      throw new Error('No data found in sheet');
    }

    const headers = values[0].map(h => String(h).trim());
    const rows = values.slice(1);
    const data = [];

    rows.forEach((row) => {
      const rowObj = {};
      headers.forEach((header, idx) => {
        rowObj[header] = row[idx];
      });

      // استخراج الحقول بغض النظر عن لغة العمود (عربي أو إنجليزي)
      const id = String(rowObj['معرّف الصنف'] || rowObj['id'] || rowObj['ID'] || '').trim();
      const nameEn = String(rowObj['Item Name (EN)'] || rowObj['name_en'] || rowObj['name'] || '').trim();
      const nameAr = String(rowObj['اسم الصنف (بالعربية)'] || rowObj['name_ar'] || '').trim();
      const categoryEn = String(rowObj['Category (EN)'] || rowObj['category'] || 'Menu').trim();
      const categoryAr = String(rowObj['التصنيف (بالعربية)'] || '').trim();
      const descEn = String(rowObj['Description & Ingredients (EN)'] || rowObj['description'] || '').trim();
      const descAr = String(rowObj['الوصف والمكونات (بالعربية)'] || '').trim();
      const rawPrice = rowObj['السعر (ج.م)'] || rowObj['price'] || 0;
      const price = Number(rawPrice);
      const availEn = String(rowObj['Availability (EN)'] || rowObj['status'] || '').trim().toLowerCase();
      const availAr = String(rowObj['حالة التوفر (بالعربية)'] || '').trim();
      
      const isAvailable = availEn === 'available' || availAr === 'متوفر' || availEn === '';
      const status = isAvailable ? 'Available' : 'Sold Out';

      // تحديد المود المناسب تلقائياً حسب التصنيف
      let mood = 'chill';
      const catLower = categoryEn.toLowerCase();
      if (catLower.includes('ice') || catLower.includes('cold') || catLower.includes('mojito')) {
        mood = 'refresh';
      } else if (catLower.includes('espresso') || catLower.includes('hot') || catLower.includes('coffee')) {
        mood = 'focus';
      }

      if (id && nameEn && price > 0) {
        data.push({
          id: id,
          name_en: nameEn,
          name_ar: nameAr,
          category: categoryEn,
          category_ar: categoryAr,
          description: descEn,
          description_ar: descAr,
          price: price,
          status: status,
          mood: mood,
          badge: isAvailable && (catLower.includes('ice') || price >= 140) ? 'POPULAR' : ''
        });
      }
    });

    const payload = JSON.stringify({
      success: true,
      updated_at: new Date().toISOString(),
      count: data.length,
      data: data
    });

    // كاش لمدة ساعة للسرعة الخارقة
    cache.put('kleiv_menu_v2', payload, 3600);
    return ContentService.createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function onEdit() {
  CacheService.getScriptCache().remove('kleiv_menu_v2');
}
