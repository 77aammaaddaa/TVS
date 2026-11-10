function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. قراءة إعدادات الكافيه ثنائية اللغة من تبويب settings
    const settingsSheet = ss.getSheetByName('settings');
    const settings = {};
    if (settingsSheet) {
      const sValues = settingsSheet.getDataRange().getValues();
      for (let i = 1; i < sValues.length; i++) {
        const k = String(sValues[i][0]).trim();
        const v = sValues[i][1];
        if (k) settings[k] = v;
      }
    }

    // 2. قراءة الأصناف الـ 82 من تبويب db
    const dbSheet = ss.getSheetByName('db') || ss.getSheets()[2] || ss.getSheets()[0];
    const values = dbSheet.getDataRange().getValues();
    if (!values || values.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Empty DB" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = values[0].map(h => String(h).trim());
    const rows = values.slice(1);
    const data = [];

    rows.forEach((row, idx) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });

      const id = String(obj['معرّف الصنف'] || obj['id'] || ('klv-' + (idx + 1))).trim();
      const nameEn = String(obj['Item Name (EN)'] || obj['name_en'] || obj['name'] || '').trim();
      const nameAr = String(obj['اسم الصنف (بالعربية)'] || obj['name_ar'] || '').trim();
      const categoryEn = String(obj['Category (EN)'] || obj['category'] || 'Menu').trim();
      const categoryAr = String(obj['التصنيف (بالعربية)'] || '').trim();
      const descEn = String(obj['Description & Ingredients (EN)'] || obj['description'] || '').trim();
      const descAr = String(obj['الوصف والمكونات (بالعربية)'] || '').trim();
      const price = Number(obj['السعر (ج.م)'] || obj['price'] || 0);
      
      const availEn = String(obj['Availability (EN)'] || obj['status'] || 'Available').trim().toLowerCase();
      const availAr = String(obj['حالة التوفر (بالعربية)'] || '').trim();
      const isAvail = availEn === 'available' || availAr === 'متوفر' || availEn === '';
      const status = isAvail ? 'Available' : 'Sold Out';

      const mood = String(obj['mood'] || 'chill').trim().toLowerCase();
      const badge = String(obj['badge'] || '').trim();
      const doodleKey = String(obj['doodle_key'] || 'cup').trim();
      const caffeine = String(obj['caffeine_level'] || 'None').trim();

      if (id && (nameEn || nameAr) && price > 0 && status !== 'Hidden') {
        data.push({
          id: id,
          category: categoryEn,
          category_ar: categoryAr,
          name_en: nameEn,
          name_ar: nameAr,
          description: descEn,
          description_ar: descAr,
          price: price,
          status: status,
          mood: mood,
          badge: badge,
          doodle_key: doodleKey,
          caffeine_level: caffeine
        });
      }
    });

    const payload = JSON.stringify({
      success: true,
      updated_at: new Date().toISOString(),
      count: data.length,
      settings: settings,
      data: data
    });

    return ContentService.createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}