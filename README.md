# 🍊 Shopee Seller Education & Comms Internal Portal 2026

ระบบศูนย์กลางรวบรวมเครื่องมือ ลิงก์สำคัญ คู่มือการทำงาน (SOP) และคิวการสื่อสารทั้งหมดของทีม **Seller Education & Communications (BD Infrastructure)** เพื่อให้คนในทีมสามารถเข้าถึงฐานข้อมูลที่อัปเดตล่าสุดได้ทันทีภายในคลิกเดียว และสามารถตั้งค่าเป็นหน้าแรก (Homepage) บน Browser ได้

## 🚀 Key Features (ฟีเจอร์เด่น)
* **Real-time Synchronization:** ดึงข้อมูลโดยตรงจาก Google Sheet หลังบ้านผ่าน CSV Stream แอดมินแก้ไขชีตเสร็จ หน้าเว็บอัปเดตตามทันทีโดยไม่ต้องแก้โค้ด
* **Instant Live Search:** รองรับการพิมพ์ค้นหาแบบจับคำหลัก (Keywords Match) ทั้งภาษาไทยและภาษาอังกฤษ (TH/EN) ครอบคลุมทั้งชื่อลิงก์ หมวดหมู่ และวัตถุประสงค์
* **Responsive Grid UI:** ออกแบบหน้าตาด้วย Tailwind CSS สะอาด ทันสมัย และรองรับการใช้งานบนมือถือ (Mobile-Friendly) สำหรับทีมงานภายนอกออฟฟิศ
* **Urgent Alert Badge:** ระบบจะเปิดสัญลักษณ์กระพริบอัตโนมัติหากชื่อลิงก์ขึ้นต้นด้วยคำว่า `[Urgent comms]` เพื่อเน้นย้ำเคสเร่งด่วน (เช่น งาน Pharmacy หรือ ขนส่ง)

## 📁 Data Structure & Architecture
ระบบทำงานในรูปแบบ **Serverless & Zero-Cost Hosting** โดยแยกส่วนกันดังนี้:
1. **Database (Backend):** จัดการผ่าน Google Sheet ของทีม (เปิดสิทธิ์ Publish to Web เป็น CSV)
2. **Frontend Deployment:** แสดงผลแบบ Static Page ผ่าน **GitHub Pages** (ฟรี แข็งแกร่ง และโหลดเร็ว)

## ⚙️ How to Maintenance (วิธีอัปเดตลิงก์สำหรับทีม)
หากต้องการเพิ่ม ลบ หรือแก้ไขลิงก์ในระบบ สมาชิกในทีม **ไม่จำเป็นต้องแก้ไขโค้ด** เพียงแค่เข้าไปจัดการใน Google Sheet ที่ระบุไว้:
* เพิ่มแถวใหม่ใน Sheet ➔ ระบุหมวดหมู่ ➔ ใส่ชื่อลิงก์ ➔ ใส่ URL ➔ ใส่คำอธิบายสั้น และคีย์เวิร์ด
* รีเฟรชหน้าหน้าจอ Portal เพื่อดูความเปลี่ยนแปลง

---
Developed & Maintained by **Shopee BD Infrastructure Team 2026**
